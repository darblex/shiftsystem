export const dynamic = 'force-dynamic';
// ============================================================
// app/api/shifts/route.ts — Shift management
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db, getShiftsForMonth, getAllShiftsForMonth, upsertShift, deleteShift } from '@/lib/db';
import type { ShiftType } from '@/types';

const VALID_SHIFT_TYPES: ShiftType[] = [
  'morning', 'afternoon', 'night', 'day_off', 'holiday',
  'duty', 'weekend_duty', 'sick', 'vacation',
];

// GET /api/shifts?year=2026&month=4[&userId=X]
export const GET = requireAuth(async (req, { user }) => {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : null;
  const month = searchParams.get('month') ? Number(searchParams.get('month')) : null;
  const userIdParam = searchParams.get('userId');

  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: 'נא לציין שנה וחודש תקינים' }, { status: 400 });
  }

  let targetUserId: number | undefined;
  if (userIdParam) {
    targetUserId = Number(userIdParam);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return NextResponse.json({ error: 'userId לא תקין' }, { status: 400 });
    }
    if (user.role === 'employee' && user.id !== targetUserId) {
      return NextResponse.json({ error: 'אין הרשאה לצפות בשיבוצים של עובד אחר' }, { status: 403 });
    }
  } else if (user.role === 'employee') {
    targetUserId = user.id;
  }

  const shifts = targetUserId !== undefined
    ? getShiftsForMonth(year, month, targetUserId)
    : getAllShiftsForMonth(year, month);

  return NextResponse.json({ shifts, year, month });
});

// POST /api/shifts — upsert single shift
export const POST = requireAuth(async (req, { user }) => {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const { userId, date, shiftType, notes } = body ?? {};
  const targetUserId = userId ? Number(userId) : user.id;

  if (user.role === 'employee' && user.id !== targetUserId) {
    return NextResponse.json({ error: 'אין הרשאה לשבץ משמרת לעובד אחר' }, { status: 403 });
  }

  if (!date || !shiftType) {
    return NextResponse.json({ error: 'נא לציין תאריך וסוג משמרת' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return NextResponse.json({ error: 'פורמט תאריך לא תקין. נדרש YYYY-MM-DD' }, { status: 400 });
  }
  if (!VALID_SHIFT_TYPES.includes(shiftType)) {
    return NextResponse.json(
      { error: `סוג משמרת לא תקין. אפשרויות: ${VALID_SHIFT_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  const targetUser = db.prepare('SELECT id FROM users WHERE id = ? AND active = 1').get(targetUserId);
  if (!targetUser) return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 });

  const shift = upsertShift({
    user_id: targetUserId,
    date: String(date),
    shift_type: shiftType,
    notes: notes ?? null,
    approved_by: (user.role === 'admin' || user.role === 'manager') ? user.id : undefined,
  });

  return NextResponse.json({ shift }, { status: 201 });
}, ['admin', 'manager']);

// DELETE /api/shifts?userId=X&date=YYYY-MM-DD
export const DELETE = requireAuth(async (req, { user }) => {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get('userId');
  const date = searchParams.get('date');

  if (!userIdParam || !date) {
    return NextResponse.json({ error: 'נא לציין userId ותאריך' }, { status: 400 });
  }

  const targetUserId = Number(userIdParam);
  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return NextResponse.json({ error: 'userId לא תקין' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return NextResponse.json({ error: 'פורמט תאריך לא תקין. נדרש YYYY-MM-DD' }, { status: 400 });
  }

  deleteShift(targetUserId, date);
  return NextResponse.json({ success: true });
}, ['admin', 'manager']);
