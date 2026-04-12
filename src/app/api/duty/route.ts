export const dynamic = 'force-dynamic';
// ============================================================
// app/api/duty/route.ts — Weekend/on-call duty assignments
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db, upsertDutyAssignment } from '@/lib/db';
import type { DutyAssignment } from '@/types';

// GET /api/duty — get duty assignments
export const GET = requireAuth(async (req, { user }) => {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : null;
  const month = searchParams.get('month') ? Number(searchParams.get('month')) : null;
  const userIdParam = searchParams.get('userId');

  let targetUserId: number | null = null;
  if (userIdParam) {
    targetUserId = Number(userIdParam);
    if (user.role === 'employee' && user.id !== targetUserId) {
      return NextResponse.json({ error: 'אין הרשאה לצפות בתורנויות של עובד אחר' }, { status: 403 });
    }
  } else if (user.role === 'employee') {
    targetUserId = user.id;
  }

  let assignments: any[];
  if (year && month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    assignments = db
      .prepare(
        `SELECT d.*, u.full_name, u.department
         FROM duty_assignments d
         JOIN users u ON u.id = d.user_id
         WHERE d.date LIKE ? ${targetUserId ? 'AND d.user_id = ?' : ''}
         ORDER BY d.date, u.full_name`
      )
      .all(`${prefix}%`, ...(targetUserId ? [targetUserId] : [])) as any[];
  } else {
    assignments = db
      .prepare(
        `SELECT d.*, u.full_name, u.department
         FROM duty_assignments d
         JOIN users u ON u.id = d.user_id
         ${targetUserId ? 'WHERE d.user_id = ?' : ''}
         ORDER BY d.date, u.full_name`
      )
      .all(...(targetUserId ? [targetUserId] : [])) as any[];
  }

  return NextResponse.json({ assignments });
});

// POST /api/duty — assign/override duty (admin only)
export const POST = requireAuth(async (req, { user }) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'נדרשות הרשאות מנהל' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const { userId, date, dutyType, duty_type, notes, replaceExisting } = body ?? {};
  const finalType = dutyType ?? duty_type ?? 'weekend';

  if (!userId || !date) {
    return NextResponse.json({ error: 'נא לציין עובד ותאריך' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return NextResponse.json({ error: 'פורמט תאריך לא תקין' }, { status: 400 });
  }

  const validTypes: DutyAssignment['duty_type'][] = ['weekend', 'oncall'];
  if (!validTypes.includes(finalType)) {
    return NextResponse.json({ error: 'סוג תורנות לא תקין' }, { status: 400 });
  }

  const targetUser = db.prepare('SELECT id FROM users WHERE id = ? AND active = 1').get(Number(userId));
  if (!targetUser) return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 });

  if (replaceExisting) {
    db.prepare('DELETE FROM duty_assignments WHERE date = ? AND duty_type = ?').run(String(date), finalType);
  }

  const assignment = upsertDutyAssignment({
    user_id: Number(userId),
    date: String(date),
    duty_type: finalType,
    notes: notes ?? null,
  });

  const fullAssignment = db
    .prepare(
      `SELECT d.*, u.full_name, u.department
       FROM duty_assignments d
       JOIN users u ON u.id = d.user_id
       WHERE d.id = ?`
    )
    .get((assignment as any).id);

  return NextResponse.json({ assignment: fullAssignment }, { status: 201 });
});

// PATCH /api/duty — update existing assignment (admin only)
export const PATCH = requireAuth(async (req, { user }) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'נדרשות הרשאות מנהל' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const { id, userId, date, dutyType, duty_type, notes } = body ?? {};
  if (!id) return NextResponse.json({ error: 'נא לציין מזהה תורנות' }, { status: 400 });

  const existing = db.prepare('SELECT * FROM duty_assignments WHERE id = ?').get(Number(id)) as any;
  if (!existing) return NextResponse.json({ error: 'תורנות לא נמצאה' }, { status: 404 });

  const nextType = dutyType ?? duty_type ?? existing.duty_type;
  const validTypes: DutyAssignment['duty_type'][] = ['weekend', 'oncall'];
  if (!validTypes.includes(nextType)) {
    return NextResponse.json({ error: 'סוג תורנות לא תקין' }, { status: 400 });
  }

  const nextUserId = userId !== undefined ? Number(userId) : existing.user_id;
  if (userId !== undefined) {
    const targetUser = db.prepare('SELECT id FROM users WHERE id = ? AND active = 1').get(nextUserId);
    if (!targetUser) return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 });
  }

  const nextDate = date ?? existing.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(nextDate))) {
    return NextResponse.json({ error: 'פורמט תאריך לא תקין' }, { status: 400 });
  }

  const updated = db
    .prepare(
      `UPDATE duty_assignments
       SET user_id = ?, date = ?, duty_type = ?, notes = ?
       WHERE id = ?
       RETURNING *`
    )
    .get(nextUserId, String(nextDate), nextType, notes ?? existing.notes ?? null, Number(id)) as any;

  const fullAssignment = db
    .prepare(
      `SELECT d.*, u.full_name, u.department
       FROM duty_assignments d
       JOIN users u ON u.id = d.user_id
       WHERE d.id = ?`
    )
    .get(updated.id);

  return NextResponse.json({ assignment: fullAssignment });
});

// DELETE /api/duty — remove assignment (admin only)
export const DELETE = requireAuth(async (req, { user }) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'נדרשות הרשאות מנהל' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'נא לציין מזהה תורנות' }, { status: 400 });

  const existing = db.prepare('SELECT id FROM duty_assignments WHERE id = ?').get(Number(id));
  if (!existing) return NextResponse.json({ error: 'תורנות לא נמצאה' }, { status: 404 });

  db.prepare('DELETE FROM duty_assignments WHERE id = ?').run(Number(id));
  return NextResponse.json({ success: true, message: 'התורנות נמחקה' });
});
