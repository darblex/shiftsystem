export const dynamic = 'force-dynamic';
// ============================================================
// app/api/schedule/route.ts — Monthly schedule CRUD (redirects to shifts)
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  db,
  getShiftsForMonth,
  getAllShiftsForMonth,
  upsertShift,
  deleteShift,
} from '@/lib/db';
import { generateMonthSchedule } from '@/lib/schedule';
import { parseIsoDate, parseJsonObject, parseMonth, parsePositiveInt, parseYear, toBoolean } from '@/lib/validation';
import type { ShiftType } from '@/types';

const VALID_SHIFT_TYPES: ShiftType[] = [
  'morning', 'afternoon', 'night', 'day_off', 'holiday',
  'duty', 'weekend_duty', 'sick', 'vacation',
];

// GET /api/schedule — fetch shifts
export const GET = requireAuth(async (req, { user }) => {
  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = parseYear(searchParams.get('year') ?? now.getFullYear());
  const month = parseMonth(searchParams.get('month') ?? now.getMonth() + 1);
  const userIdParam = searchParams.get('userId');

  if (!year || !month) {
    return NextResponse.json({ error: 'שנה או חודש לא תקינים' }, { status: 400 });
  }

  let targetUserId: number | null = null;
  if (userIdParam) {
    targetUserId = parsePositiveInt(userIdParam);
    if (!targetUserId) {
      return NextResponse.json({ error: 'מזהה עובד לא תקין' }, { status: 400 });
    }
    if (user.role === 'employee' && user.id !== targetUserId) {
      return NextResponse.json({ error: 'אין הרשאה לצפות במשמרות של עובד אחר' }, { status: 403 });
    }
  }

  if (targetUserId) {
    const entries = getShiftsForMonth(year, month, targetUserId);
    return NextResponse.json({ year, month, userId: targetUserId, entries });
  }

  if (user.role === 'employee') {
    const entries = getShiftsForMonth(year, month, user.id);
    return NextResponse.json({ year, month, userId: user.id, entries });
  }

  const allEntries = getAllShiftsForMonth(year, month);
  const byUser: Record<number, any> = {};
  for (const entry of allEntries as any[]) {
    const uid = entry.user_id;
    if (!byUser[uid]) {
      byUser[uid] = {
        userId: uid,
        fullName: (entry as any).full_name,
        department: (entry as any).department,
        entries: [],
      };
    }
    byUser[uid].entries.push(entry);
  }

  return NextResponse.json({ year, month, schedule: Object.values(byUser) });
});

// POST /api/schedule — auto-generate schedule
export const POST = requireAuth(
  async (req) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }

    const payload = parseJsonObject(body);
    if (!payload) return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    const year = parseYear(payload.year);
    const month = parseMonth(payload.month);
    const overwrite = toBoolean(payload.overwrite);

    if (!year || !month) {
      return NextResponse.json({ error: 'שנה או חודש לא תקינים' }, { status: 400 });
    }

    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
    const existing = db
      .prepare('SELECT COUNT(*) as cnt FROM shifts WHERE date >= ? AND date < ?')
      .get(start, end) as { cnt: number };

    if (existing?.cnt > 0 && !overwrite) {
      return NextResponse.json(
        {
          error: 'לוח זמנים כבר קיים לחודש זה',
          hint: 'העבר overwrite: true כדי להחליף',
          existingCount: existing.cnt,
        },
        { status: 409 }
      );
    }

    try {
      const result = await generateMonthSchedule({ year, month, overwrite });
      return NextResponse.json({
        success: true,
        message: `לוח זמנים נוצר בהצלחה לחודש ${month}/${year}`,
        usersScheduled: result.length,
      });
    } catch (err: any) {
      return NextResponse.json(
        { error: 'שגיאה ביצירת לוח הזמנים', details: err?.message },
        { status: 500 }
      );
    }
  },
  ['admin']
);

// PATCH /api/schedule — manual override for a single shift
export const PATCH = requireAuth(
  async (req, { user: admin }) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }

    const { userId, date, shiftType, scheduleType, notes } = body ?? {};
    const finalShiftType = shiftType ?? scheduleType;

    if (!userId || !date || !finalShiftType) {
      return NextResponse.json({ error: 'נא לציין מזהה עובד, תאריך וסוג משמרת' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'פורמט תאריך לא תקין, נדרש: YYYY-MM-DD' }, { status: 400 });
    }
    if (!VALID_SHIFT_TYPES.includes(finalShiftType)) {
      return NextResponse.json(
        { error: `סוג משמרת לא תקין. אפשרויות: ${VALID_SHIFT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const userCheck = db.prepare('SELECT id FROM users WHERE id = ? AND active = 1').get(Number(userId));
    if (!userCheck) return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 });

    const entry = upsertShift({
      user_id: Number(userId),
      date,
      shift_type: finalShiftType,
      notes: notes ?? null,
      approved_by: admin.id,
    });

    return NextResponse.json({ success: true, entry });
  },
  ['admin']
);

// DELETE /api/schedule — remove shifts for a month/user
export const DELETE = requireAuth(
  async (req) => {
    const { searchParams } = new URL(req.url);
    const year = parseYear(searchParams.get('year'));
    const month = parseMonth(searchParams.get('month'));
    const userIdParam = searchParams.get('userId');
    const userId = userIdParam ? parsePositiveInt(userIdParam) : null;
    const dateParam = searchParams.get('date');
    const date = dateParam ? parseIsoDate(dateParam) : null;

    if (dateParam) {
      if (!date) return NextResponse.json({ error: 'תאריך לא תקין' }, { status: 400 });
      if (!userId) return NextResponse.json({ error: 'נא לציין מזהה עובד' }, { status: 400 });
      deleteShift(userId, date);
      return NextResponse.json({ success: true, message: 'הרשומה נמחקה' });
    }

    if (userIdParam && !userId) {
      return NextResponse.json({ error: 'מזהה עובד לא תקין' }, { status: 400 });
    }
    if (!year || !month) {
      return NextResponse.json({ error: 'נא לציין שנה וחודש' }, { status: 400 });
    }

    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
    if (userId) {
      db.prepare('DELETE FROM shifts WHERE user_id = ? AND date >= ? AND date < ?').run(userId, start, end);
    } else {
      db.prepare('DELETE FROM shifts WHERE date >= ? AND date < ?').run(start, end);
    }

    return NextResponse.json({ success: true, message: 'לוח הזמנים נמחק' });
  },
  ['admin']
);
