export const dynamic = 'force-dynamic';
// ============================================================
// app/api/duty/route.ts — Duty assignment management
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db, upsertDutyAssignment, getDutyAssignmentsForMonth } from '@/lib/db';
import type { DutyAssignment } from '@/types';

const VALID_DUTY_TYPES: DutyAssignment['duty_type'][] = ['regular', 'weekend', 'holiday'];

// GET /api/duty — get duty assignments
export const GET = requireAuth(async (req, { user }) => {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : null;
  const month = searchParams.get('month') ? Number(searchParams.get('month')) : null;
  const userIdParam = searchParams.get('userId');

  let targetEmployeeId: number | null = null;
  if (userIdParam) {
    targetEmployeeId = Number(userIdParam);
    if (user.role === 'employee' && user.id !== targetEmployeeId) {
      return NextResponse.json({ error: 'אין הרשאה לצפות בתורנויות של עובד אחר' }, { status: 403 });
    }
  } else if (user.role === 'employee') {
    targetEmployeeId = user.id;
  }

  let assignments: any[];
  if (year && month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    assignments = db
      .prepare(
        `SELECT d.id, d.date, d.employee_id, u.full_name AS employee_name, d.duty_type, d.notes
         FROM duty_assignments d
         JOIN users u ON u.id = d.employee_id
         WHERE d.date LIKE ? ${targetEmployeeId ? 'AND d.employee_id = ?' : ''}
         ORDER BY d.date, u.full_name`
      )
      .all(`${prefix}%`, ...(targetEmployeeId ? [targetEmployeeId] : [])) as any[];
  } else {
    assignments = db
      .prepare(
        `SELECT d.id, d.date, d.employee_id, u.full_name AS employee_name, d.duty_type, d.notes
         FROM duty_assignments d
         JOIN users u ON u.id = d.employee_id
         ${targetEmployeeId ? 'WHERE d.employee_id = ?' : ''}
         ORDER BY d.date, u.full_name`
      )
      .all(...(targetEmployeeId ? [targetEmployeeId] : [])) as any[];
  }

  return NextResponse.json({ assignments });
});

// POST /api/duty — assign duty (admin only)
export const POST = requireAuth(async (req, { user: _user }) => {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const { userId, date, dutyType, notes, replaceExisting } = body ?? {};
  const finalType: DutyAssignment['duty_type'] = dutyType ?? 'regular';

  if (!userId || !date) {
    return NextResponse.json({ error: 'נא לציין עובד ותאריך' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return NextResponse.json({ error: 'פורמט תאריך לא תקין' }, { status: 400 });
  }
  if (!VALID_DUTY_TYPES.includes(finalType)) {
    return NextResponse.json({ error: 'סוג תורנות לא תקין' }, { status: 400 });
  }

  const targetUser = db.prepare('SELECT id FROM users WHERE id = ? AND active = 1').get(Number(userId));
  if (!targetUser) return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 });

  if (replaceExisting) {
    db.prepare('DELETE FROM duty_assignments WHERE date = ? AND duty_type = ?').run(String(date), finalType);
  }

  const assignment = upsertDutyAssignment({
    date: String(date),
    employee_id: Number(userId),
    duty_type: finalType,
    notes: notes ?? null,
  });

  const fullAssignment = db
    .prepare(
      `SELECT d.id, d.date, d.employee_id, u.full_name AS employee_name, d.duty_type, d.notes
       FROM duty_assignments d
       JOIN users u ON u.id = d.employee_id
       WHERE d.id = ?`
    )
    .get((assignment as any).id);

  return NextResponse.json({ assignment: fullAssignment }, { status: 201 });
}, ['admin', 'manager']);

// PATCH /api/duty — update existing assignment
export const PATCH = requireAuth(async (req, { user: _user }) => {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const { id, userId, date, dutyType, notes } = body ?? {};
  if (!id) return NextResponse.json({ error: 'נא לציין מזהה תורנות' }, { status: 400 });

  const existing = db.prepare('SELECT * FROM duty_assignments WHERE id = ?').get(Number(id)) as any;
  if (!existing) return NextResponse.json({ error: 'תורנות לא נמצאה' }, { status: 404 });

  const nextType: DutyAssignment['duty_type'] = dutyType ?? existing.duty_type;
  if (!VALID_DUTY_TYPES.includes(nextType)) {
    return NextResponse.json({ error: 'סוג תורנות לא תקין' }, { status: 400 });
  }

  const nextEmployeeId = userId !== undefined ? Number(userId) : existing.employee_id;
  if (userId !== undefined) {
    const targetUser = db.prepare('SELECT id FROM users WHERE id = ? AND active = 1').get(nextEmployeeId);
    if (!targetUser) return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 });
  }

  const nextDate = date ?? existing.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(nextDate))) {
    return NextResponse.json({ error: 'פורמט תאריך לא תקין' }, { status: 400 });
  }

  const updated = db
    .prepare(
      `UPDATE duty_assignments
       SET employee_id = ?, date = ?, duty_type = ?, notes = ?
       WHERE id = ?
       RETURNING *`
    )
    .get(nextEmployeeId, String(nextDate), nextType, notes ?? existing.notes ?? null, Number(id)) as any;

  const fullAssignment = db
    .prepare(
      `SELECT d.id, d.date, d.employee_id, u.full_name AS employee_name, d.duty_type, d.notes
       FROM duty_assignments d
       JOIN users u ON u.id = d.employee_id
       WHERE d.id = ?`
    )
    .get(updated.id);

  return NextResponse.json({ assignment: fullAssignment });
}, ['admin', 'manager']);

// DELETE /api/duty — remove assignment
export const DELETE = requireAuth(async (req, { user: _user }) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'נא לציין מזהה תורנות' }, { status: 400 });

  const existing = db.prepare('SELECT id FROM duty_assignments WHERE id = ?').get(Number(id));
  if (!existing) return NextResponse.json({ error: 'תורנות לא נמצאה' }, { status: 404 });

  db.prepare('DELETE FROM duty_assignments WHERE id = ?').run(Number(id));
  return NextResponse.json({ success: true, message: 'התורנות נמחקה' });
}, ['admin', 'manager']);
