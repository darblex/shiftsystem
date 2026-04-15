export const dynamic = 'force-dynamic';
// ============================================================
// app/api/constraints/route.ts — Monthly scheduling constraints
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db, getConstraints, upsertConstraints, getUserById } from '@/lib/db';
import { normalizeText, parseJsonObject, parseMonth, parsePositiveInt, parseYear } from '@/lib/validation';
import type { ConstraintPreference } from '@/types';

const VALID_PREFERENCES: ConstraintPreference[] = [
  'prefer_morning',
  'prefer_afternoon',
  'prefer_night',
  'no_preference',
  'fixed_morning',
  'fixed_afternoon',
];

// GET /api/constraints — get constraints for a user/month
export const GET = requireAuth(async (req, { user }) => {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get('userId');
  const year = parseYear(searchParams.get('year'));
  const month = parseMonth(searchParams.get('month'));

  let targetUserId: number;
  if (userIdParam) {
    targetUserId = parsePositiveInt(userIdParam) ?? 0;
    if (!targetUserId) {
      return NextResponse.json({ error: 'userId לא תקין' }, { status: 400 });
    }
    if (user.role === 'employee' && user.id !== targetUserId) {
      return NextResponse.json({ error: 'אין הרשאה לצפות במגבלות של עובד אחר' }, { status: 403 });
    }
  } else {
    targetUserId = user.id;
  }

  if (year && month) {
    const constraint = getConstraints(targetUserId, year, month);
    return NextResponse.json({ userId: targetUserId, year, month, constraint: constraint ?? null });
  }

  let query = 'SELECT * FROM constraints WHERE user_id = ?';
  const params: any[] = [targetUserId];
  if (year) { query += ' AND year = ?'; params.push(year); }
  if (month) { query += ' AND month = ?'; params.push(month); }
  query += ' ORDER BY year DESC, month DESC';

  const constraints = db.prepare(query).all(...params);
  return NextResponse.json({ userId: targetUserId, constraints });
});

// POST /api/constraints — create or update constraint for a user/month
export const POST = requireAuth(async (req, { user }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const payload = parseJsonObject(body);
  if (!payload) {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const targetUserId = payload.userId ? parsePositiveInt(payload.userId) ?? 0 : user.id;
  if (!targetUserId) {
    return NextResponse.json({ error: 'userId לא תקין' }, { status: 400 });
  }
  const year = parseYear(payload.year);
  const month = parseMonth(payload.month);
  const preferenceRaw = normalizeText(payload.preference, 40);
  const preference: ConstraintPreference | null = preferenceRaw && VALID_PREFERENCES.includes(preferenceRaw as ConstraintPreference)
    ? (preferenceRaw as ConstraintPreference)
    : null;
  const notes = normalizeText(payload.notes, 500);

  if (user.role === 'employee' && user.id !== targetUserId) {
    return NextResponse.json({ error: 'אין הרשאה להגדיר מגבלות לעובד אחר' }, { status: 403 });
  }

  if (!year || !month) {
    return NextResponse.json({ error: 'נא לציין שנה וחודש' }, { status: 400 });
  }
  if (preferenceRaw && !preference) {
    return NextResponse.json(
      { error: `העדפה לא תקינה. אפשרויות: ${VALID_PREFERENCES.join(', ')}` },
      { status: 400 }
    );
  }

  const userCheck = getUserById(targetUserId);
  if (!userCheck) return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 });

  const constraint = upsertConstraints({
    user_id: targetUserId,
    year,
    month,
    preference: preference ?? 'no_preference',
    notes: notes ?? undefined,
  });

  return NextResponse.json({ constraint }, { status: 201 });
});

// DELETE /api/constraints — remove a constraint
export const DELETE = requireAuth(async (req, { user }) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const userId = searchParams.get('userId');
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  if (id) {
    const targetConstraintId = parsePositiveInt(id);
    if (!targetConstraintId) return NextResponse.json({ error: 'מזהה מגבלה לא תקין' }, { status: 400 });
    const existing = db.prepare('SELECT * FROM constraints WHERE id = ?').get(targetConstraintId) as any;
    if (!existing) return NextResponse.json({ error: 'מגבלה לא נמצאה' }, { status: 404 });

    if (user.role === 'employee' && user.id !== existing.user_id) {
      return NextResponse.json({ error: 'אין הרשאה למחוק מגבלה זו' }, { status: 403 });
    }

    db.prepare('DELETE FROM constraints WHERE id = ?').run(targetConstraintId);
    return NextResponse.json({ success: true, message: 'המגבלה נמחקה' });
  }

  if (userId && year && month) {
    const targetId = parsePositiveInt(userId);
    if (!targetId) return NextResponse.json({ error: 'userId לא תקין' }, { status: 400 });
    if (user.role === 'employee' && user.id !== targetId) {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }
    db.prepare('DELETE FROM constraints WHERE user_id = ? AND year = ? AND month = ?').run(
      targetId, parsePositiveInt(year) ?? Number(year), parsePositiveInt(month) ?? Number(month)
    );
    return NextResponse.json({ success: true, message: 'המגבלות נמחקו' });
  }

  return NextResponse.json({ error: 'נא לציין מזהה מגבלה או userId+year+month' }, { status: 400 });
});
