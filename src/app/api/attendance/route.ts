// ============================================================
// app/api/attendance/route.ts — Attendance tracking
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db, getAttendanceForMonth, upsertAttendance } from '@/lib/db';
import type { AttendanceRecord } from '@/types';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function currentTimeHm() {
  return new Date().toTimeString().slice(0, 5);
}

function calcHours(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return null;
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  const start = inH * 60 + inM;
  const end = outH * 60 + outM;
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round(((end - start) / 60) * 100) / 100;
}

// GET /api/attendance — records, summaries, live status
export const GET = requireAuth(async (req, { user }) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : null;
  const month = searchParams.get('month') ? Number(searchParams.get('month')) : null;
  const userIdParam = searchParams.get('userId');
  const date = searchParams.get('date');

  let targetUserId: number | null = null;
  if (userIdParam) {
    targetUserId = Number(userIdParam);
    if (user.role === 'employee' && user.id !== targetUserId) {
      return NextResponse.json({ error: 'אין הרשאה לצפות בנוכחות של עובד אחר' }, { status: 403 });
    }
  } else if (user.role === 'employee') {
    targetUserId = user.id;
  }

  if (status === 'live') {
    const liveDate = date || todayIso();
    const live = db
      .prepare(
        `SELECT a.*, u.full_name, u.department
         FROM attendance a
         JOIN users u ON u.id = a.user_id
         WHERE a.date = ? AND a.check_in IS NOT NULL AND a.check_out IS NULL
         ORDER BY a.check_in`
      )
      .all(liveDate);
    return NextResponse.json({ date: liveDate, live, count: (live as any[]).length });
  }

  let records: any[] = [];

  if (targetUserId && year && month) {
    records = getAttendanceForMonth(targetUserId, year, month) as any[];
  } else {
    let query = `
      SELECT a.*, u.full_name, u.department
      FROM attendance a
      JOIN users u ON u.id = a.user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (targetUserId) {
      query += ' AND a.user_id = ?';
      params.push(targetUserId);
    }
    if (year && month) {
      query += ' AND a.date LIKE ?';
      params.push(`${year}-${String(month).padStart(2, '0')}%`);
    } else if (year) {
      query += ' AND a.date LIKE ?';
      params.push(`${year}-%`);
    }
    if (date) {
      query += ' AND a.date = ?';
      params.push(date);
    }

    query += ' ORDER BY a.date DESC, u.full_name';
    records = db.prepare(query).all(...params) as any[];
  }

  const summaryMap = new Map<number, any>();
  for (const row of records) {
    const existing = summaryMap.get(row.user_id) ?? {
      userId: row.user_id,
      fullName: row.full_name,
      department: row.department,
      totalDays: 0,
      totalHours: 0,
      openDays: 0,
    };

    existing.totalDays += 1;
    existing.totalHours += Number(row.hours_worked ?? calcHours(row.check_in, row.check_out) ?? 0);
    if (row.check_in && !row.check_out) existing.openDays += 1;

    summaryMap.set(row.user_id, existing);
  }

  return NextResponse.json({
    records,
    summary: Array.from(summaryMap.values()),
    totalRecords: records.length,
  });
});

// POST /api/attendance — toggle check-in/check-out
export const POST = requireAuth(async (req, { user }) => {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // optional body
  }

  const targetUserId = body?.userId ? Number(body.userId) : user.id;
  if (user.role === 'employee' && user.id !== targetUserId) {
    return NextResponse.json({ error: 'אין הרשאה לרשום נוכחות לעובד אחר' }, { status: 403 });
  }

  const date = body?.date ?? todayIso();
  const time = body?.time ?? currentTimeHm();
  const location: AttendanceRecord['location'] = body?.location ?? 'unknown';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return NextResponse.json({ error: 'פורמט תאריך לא תקין. נדרש YYYY-MM-DD' }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(String(time))) {
    return NextResponse.json({ error: 'פורמט שעה לא תקין. נדרש HH:mm' }, { status: 400 });
  }

  const validLocations: AttendanceRecord['location'][] = ['home', 'office', 'unknown'];
  if (!validLocations.includes(location)) {
    return NextResponse.json({ error: 'מיקום לא תקין' }, { status: 400 });
  }

  const targetUser = db.prepare('SELECT id FROM users WHERE id = ? AND active = 1').get(targetUserId);
  if (!targetUser) return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 });

  const existing = db
    .prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?')
    .get(targetUserId, String(date)) as AttendanceRecord | undefined;

  if (!existing) {
    const record = upsertAttendance({
      user_id: targetUserId,
      date: String(date),
      check_in: String(time),
      check_out: null as any,
      location,
      hours_worked: null as any,
      notes: body?.notes ?? null,
    });

    return NextResponse.json(
      { action: 'check_in', message: 'כניסה נרשמה בהצלחה', record },
      { status: 201 }
    );
  }

  if (existing.check_in && !existing.check_out) {
    const hours = calcHours(existing.check_in, String(time));
    if (hours === null) {
      return NextResponse.json(
        { error: 'שעת היציאה חייבת להיות אחרי שעת הכניסה' },
        { status: 400 }
      );
    }

    const record = upsertAttendance({
      user_id: targetUserId,
      date: String(date),
      check_in: existing.check_in,
      check_out: String(time),
      location: existing.location,
      hours_worked: hours,
      notes: body?.notes ?? existing.notes ?? null,
    });

    return NextResponse.json({ action: 'check_out', message: 'יציאה נרשמה בהצלחה', record });
  }

  return NextResponse.json(
    {
      error: 'כבר קיימת רשומת נוכחות מלאה ליום זה',
      hint: 'השתמש ב-PATCH כדי לעדכן ידנית',
      record: existing,
    },
    { status: 409 }
  );
});

// PATCH /api/attendance — admin/manual update
export const PATCH = requireAuth(
  async (req) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }

    const { id, userId, date, checkIn, checkOut, location, notes } = body ?? {};
    if (!id) {
      return NextResponse.json({ error: 'נא לציין מזהה רשומת נוכחות' }, { status: 400 });
    }

    const existing = db.prepare('SELECT * FROM attendance WHERE id = ?').get(Number(id)) as AttendanceRecord | undefined;
    if (!existing) return NextResponse.json({ error: 'רשומת נוכחות לא נמצאה' }, { status: 404 });

    const nextUserId = userId !== undefined ? Number(userId) : existing.user_id;
    const nextDate = date !== undefined ? String(date) : existing.date;
    const nextCheckIn = checkIn !== undefined ? checkIn : existing.check_in;
    const nextCheckOut = checkOut !== undefined ? checkOut : existing.check_out;
    const nextLocation = location !== undefined ? location : existing.location;
    const nextNotes = notes !== undefined ? notes : existing.notes;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(nextDate))) {
      return NextResponse.json({ error: 'פורמט תאריך לא תקין. נדרש YYYY-MM-DD' }, { status: 400 });
    }
    if (nextCheckIn !== null && nextCheckIn !== undefined && !/^\d{2}:\d{2}$/.test(String(nextCheckIn))) {
      return NextResponse.json({ error: 'שעת כניסה לא תקינה. נדרש HH:mm' }, { status: 400 });
    }
    if (nextCheckOut !== null && nextCheckOut !== undefined && !/^\d{2}:\d{2}$/.test(String(nextCheckOut))) {
      return NextResponse.json({ error: 'שעת יציאה לא תקינה. נדרש HH:mm' }, { status: 400 });
    }

    const validLocations: AttendanceRecord['location'][] = ['home', 'office', 'unknown'];
    if (!validLocations.includes(nextLocation)) {
      return NextResponse.json({ error: 'מיקום לא תקין' }, { status: 400 });
    }

    const targetUser = db.prepare('SELECT id FROM users WHERE id = ? AND active = 1').get(nextUserId);
    if (!targetUser) return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 });

    const hours = calcHours(nextCheckIn, nextCheckOut);
    if (nextCheckIn && nextCheckOut && hours === null) {
      return NextResponse.json({ error: 'שעת היציאה חייבת להיות אחרי שעת הכניסה' }, { status: 400 });
    }

    const duplicate = db
      .prepare('SELECT id FROM attendance WHERE user_id = ? AND date = ? AND id != ?')
      .get(nextUserId, nextDate, Number(id));
    if (duplicate) {
      return NextResponse.json({ error: 'כבר קיימת רשומת נוכחות לעובד זה בתאריך זה' }, { status: 409 });
    }

    const updated = db
      .prepare(
        `UPDATE attendance
         SET user_id = ?, date = ?, check_in = ?, check_out = ?, location = ?, hours_worked = ?, notes = ?
         WHERE id = ?
         RETURNING *`
      )
      .get(nextUserId, nextDate, nextCheckIn ?? null, nextCheckOut ?? null, nextLocation, hours, nextNotes ?? null, Number(id));

    return NextResponse.json({ record: updated });
  },
  ['admin', 'manager']
);

// DELETE /api/attendance — remove record
export const DELETE = requireAuth(
  async (req) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'נא לציין מזהה רשומה' }, { status: 400 });

    const existing = db.prepare('SELECT id FROM attendance WHERE id = ?').get(Number(id));
    if (!existing) return NextResponse.json({ error: 'רשומה לא נמצאה' }, { status: 404 });

    db.prepare('DELETE FROM attendance WHERE id = ?').run(Number(id));
    return NextResponse.json({ success: true, message: 'הרשומה נמחקה' });
  },
  ['admin', 'manager']
);
