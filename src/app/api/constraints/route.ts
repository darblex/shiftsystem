export const dynamic = 'force-dynamic';
// ============================================================
// app/api/constraints/route.ts — Monthly scheduling constraints
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db, getConstraints, upsertConstraints, getUserById } from '@/lib/db';
import type { ConstraintPreference } from '@/types';

const VALID_PREFERENCES: ConstraintPreference[] = [
  'prefer_home',
  'prefer_office',
  'no_preference',
  'fixed_home',
  'fixed_office',
];

// GET /api/constraints — get constraints for a user/month
export const GET = requireAuth(async (req, { user }) => {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get('userId');
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : null;
  const month = searchParams.get('month') ? Number(searchParams.get('month')) : null;

  let targetUserId: number;
  if (userIdParam) {
    targetUserId = Number(userIdParam);
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

  // Return all constraints for the user
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
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const {
    userId: userIdParam,
    year,
    month,
    preference,
    maxOfficeDays,
    maxHomeDays,
    unavailableDates,
    notes,
  } = body ?? {};

  const targetUserId = userIdParam ? Number(userIdParam) : user.id;

  if (user.role === 'employee' && user.id !== targetUserId) {
    return NextResponse.json({ error: 'אין הרשאה להגדיר מגבלות לעובד אחר' }, { status: 403 });
  }

  if (!year || !month) {
    return NextResponse.json({ error: 'נא לציין שנה וחודש' }, { status: 400 });
  }

  if (month < 1 || month > 12) {
    return NextResponse.json({ error: 'חודש לא תקין' }, { status: 400 });
  }

  if (preference && !VALID_PREFERENCES.includes(preference)) {
    return NextResponse.json(
      { error: `העדפה לא תקינה. אפשרויות: ${VALID_PREFERENCES.join(', ')}` },
      { status: 400 }
    );
  }

  // Validate unavailable dates if provided
  let unavailableDatesJson = '[]';
  if (unavailableDates !== undefined) {
    if (!Array.isArray(unavailableDates)) {
      return NextResponse.json({ error: 'unavailableDates חייב להיות מערך של תאריכים' }, { status: 400 });
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const d of unavailableDates) {
      if (!dateRegex.test(d)) {
        return NextResponse.json(
          { error: `תאריך לא תקין: ${d}. פורמט נדרש: YYYY-MM-DD` },
          { status: 400 }
        );
      }
    }
    unavailableDatesJson = JSON.stringify(unavailableDates);
  }

  const userCheck = getUserById(targetUserId);
  if (!userCheck) return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 });

  const constraint = upsertConstraints({
    user_id: targetUserId,
    year,
    month,
    preference: preference ?? 'no_preference',
    max_office_days: maxOfficeDays ?? null,
    max_home_days: maxHomeDays ?? null,
    unavailable_dates: unavailableDatesJson,
    notes: notes ?? null,
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
    const existing = db.prepare('SELECT * FROM constraints WHERE id = ?').get(Number(id)) as any;
    if (!existing) return NextResponse.json({ error: 'מגבלה לא נמצאה' }, { status: 404 });

    if (user.role === 'employee' && user.id !== existing.user_id) {
      return NextResponse.json({ error: 'אין הרשאה למחוק מגבלה זו' }, { status: 403 });
    }

    db.prepare('DELETE FROM constraints WHERE id = ?').run(Number(id));
    return NextResponse.json({ success: true, message: 'המגבלה נמחקה' });
  }

  if (userId && year && month) {
    const targetId = Number(userId);
    if (user.role === 'employee' && user.id !== targetId) {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }
    db.prepare('DELETE FROM constraints WHERE user_id = ? AND year = ? AND month = ?').run(
      targetId,
      Number(year),
      Number(month)
    );
    return NextResponse.json({ success: true, message: 'המגבלות נמחקו' });
  }

  return NextResponse.json({ error: 'נא לציין מזהה מגבלה או userId+year+month' }, { status: 400 });
});
