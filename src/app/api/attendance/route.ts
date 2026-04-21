export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getAttendanceForUser,
  getAllAttendanceForMonth,
  getTodayAttendance,
  clockIn,
  clockOut,
} from '@/lib/db';
import { parseYear, parseMonth, parsePositiveInt, normalizeText, parseJsonObject } from '@/lib/validation';

// GET /api/attendance?year=&month=[&userId=]
export const GET = requireAuth(async (req, { user }) => {
  const { searchParams } = new URL(req.url);
  const year = parseYear(searchParams.get('year'));
  const month = parseMonth(searchParams.get('month'));

  if (!year || !month) {
    return NextResponse.json({ error: 'נא לציין שנה וחודש תקינים' }, { status: 400 });
  }

  if (user.role === 'employee') {
    const records = getAttendanceForUser(user.id, year, month);
    return NextResponse.json({ records });
  }

  const userIdParam = searchParams.get('userId');
  if (userIdParam) {
    const targetId = parsePositiveInt(userIdParam);
    if (!targetId) return NextResponse.json({ error: 'userId לא תקין' }, { status: 400 });
    const records = getAttendanceForUser(targetId, year, month);
    return NextResponse.json({ records });
  }

  const records = getAllAttendanceForMonth(year, month);
  return NextResponse.json({ records });
});

// POST /api/attendance — clock in or out
// body: { action: 'clock_in' | 'clock_out', notes?: string }
export const POST = requireAuth(async (req, { user }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const payload = parseJsonObject(body);
  if (!payload) return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });

  const action = normalizeText(payload.action, 20);
  if (action !== 'clock_in' && action !== 'clock_out') {
    return NextResponse.json({ error: 'action חייב להיות clock_in או clock_out' }, { status: 400 });
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isoNow = now.toISOString();

  const existing = getTodayAttendance(user.id, today);

  if (action === 'clock_in') {
    if (existing) {
      return NextResponse.json({ error: 'כבר נרשמה כניסה להיום' }, { status: 409 });
    }
    const notes = normalizeText(payload.notes, 300);
    const record = clockIn(user.id, today, isoNow, notes);
    return NextResponse.json({ record }, { status: 201 });
  }

  // clock_out
  if (!existing) {
    return NextResponse.json({ error: 'לא נמצאה כניסה להיום' }, { status: 404 });
  }
  if (existing.clock_out) {
    return NextResponse.json({ error: 'כבר נרשמה יציאה להיום' }, { status: 409 });
  }

  const record = clockOut(user.id, today, isoNow);
  return NextResponse.json({ record });
});
