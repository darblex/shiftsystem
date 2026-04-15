export const dynamic = 'force-dynamic';
// ============================================================
// app/api/employees/route.ts — User/employee CRUD
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db, createUser, updateUser, getAllActiveUsers, getUserById } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { normalizeText, parseJsonObject, parsePositiveInt, toBoolean } from '@/lib/validation';
import type { User } from '@/types';

// GET /api/employees — list users or get one
export const GET = requireAuth(async (req, { user }) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const activeOnly = searchParams.get('active') !== 'false';

  if (id) {
    const targetUser = getUserById(Number(id));
    if (!targetUser) {
      return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 });
    }
    // Non-admin can only see their own profile
    if (user.role !== 'admin' && user.id !== targetUser.id) {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }
    return NextResponse.json({ employee: targetUser });
  }

  if (user.role !== 'admin') {
    return NextResponse.json({ employees: [user] });
  }

  const employees = activeOnly
    ? getAllActiveUsers()
    : (db
        .prepare(
          'SELECT id, username, email, full_name, role, department, phone, active, created_at, updated_at FROM users ORDER BY full_name'
        )
        .all() as User[]);

  return NextResponse.json({ employees });
});

// POST /api/employees — create user (admin only)
export const POST = requireAuth(
  async (req, { user: _admin }) => {
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

    const username = normalizeText(payload.username, 80);
    const email = normalizeText(payload.email, 120)?.toLowerCase();
    const password = normalizeText(payload.password, 200);
    const full_name = normalizeText(payload.full_name, 120);
    const role = normalizeText(payload.role, 20);
    const department = normalizeText(payload.department, 120);
    const phone = normalizeText(payload.phone, 40);

    if (!username || !email || !password || !full_name) {
      return NextResponse.json(
        { error: 'נא למלא שם משתמש, אימייל, סיסמה ושם מלא' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'כתובת אימייל לא תקינה' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'הסיסמה חייבת להכיל לפחות 6 תווים' },
        { status: 400 }
      );
    }

    const validRoles = ['admin', 'manager', 'employee'] as const;
    const employeeRole: User['role'] = validRoles.includes(role as User['role']) ? (role as User['role']) : 'employee';

    // Check for duplicates
    const existingUsername = db
      .prepare('SELECT id FROM users WHERE username = ?')
      .get(username);
    if (existingUsername) {
      return NextResponse.json({ error: 'שם משתמש כבר קיים' }, { status: 409 });
    }

    const existingEmail = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email);
    if (existingEmail) {
      return NextResponse.json({ error: 'אימייל כבר קיים במערכת' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const newUser = createUser({
      username,
      email,
      full_name,
      role: employeeRole,
      department: department ?? undefined,
      phone: phone ?? undefined,
      password_hash: passwordHash,
    });

    return NextResponse.json({ employee: newUser }, { status: 201 });
  },
  ['admin']
);

// PATCH /api/employees — update user
export const PATCH = requireAuth(async (req, { user }) => {
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

  const id = parsePositiveInt(payload.id);
  const full_name = normalizeText(payload.full_name, 120);
  const email = normalizeText(payload.email, 120)?.toLowerCase();
  const role = normalizeText(payload.role, 20);
  const department = normalizeText(payload.department, 120);
  const phone = normalizeText(payload.phone, 40);
  const active = payload.active;
  const password = normalizeText(payload.password, 200);

  if (!id) return NextResponse.json({ error: 'נא לציין מזהה עובד' }, { status: 400 });

  const isAdmin = user.role === 'admin';
  const isSelf = user.id === id;

  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: 'אין הרשאה לעדכן עובד זה' }, { status: 403 });
  }

  const target = getUserById(Number(id));
  if (!target) return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 });

  const updates: Partial<Pick<User, 'email' | 'full_name' | 'role' | 'department' | 'phone' | 'active'>> = {};

  if (full_name != null) updates.full_name = String(full_name).trim();
  if (phone != null) updates.phone = phone;

  if (isAdmin) {
    if (email != null) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'כתובת אימייל לא תקינה' }, { status: 400 });
      }
      const dup = db
        .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
        .get(email, id);
      if (dup) return NextResponse.json({ error: 'אימייל כבר קיים' }, { status: 409 });
      updates.email = email;
    }
    if (department != null) updates.department = department;
    if (active !== undefined) updates.active = toBoolean(active) ? 1 : 0;
  }

  if (isAdmin) {
    if (role != null) {
      const validRoles = ['admin', 'manager', 'employee'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'תפקיד לא תקין' }, { status: 400 });
      }
      updates.role = role as User['role'];
    }
  }

  // Handle password separately
  if (password !== null) {
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'עדכון סיסמה עצמית מתבצע דרך /api/auth עם אימות סיסמה נוכחית' },
        { status: 403 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'הסיסמה חייבת להכיל לפחות 6 תווים' },
        { status: 400 }
      );
    }
    const newHash = await hashPassword(password);
    db.prepare(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(newHash, id);
  }

  if (Object.keys(updates).length === 0 && password === null) {
    return NextResponse.json({ error: 'לא צוינו שדות לעדכון' }, { status: 400 });
  }

  const updated = Object.keys(updates).length > 0 ? updateUser(id, updates) : getUserById(id);
  return NextResponse.json({ employee: updated });
});

// DELETE /api/employees — deactivate user (admin only)
export const DELETE = requireAuth(
  async (req, { user: admin }) => {
    const { searchParams } = new URL(req.url);
    const id = parsePositiveInt(searchParams.get('id'));

    if (!id) return NextResponse.json({ error: 'נא לציין מזהה עובד' }, { status: 400 });

    if (admin.id === id) {
      return NextResponse.json({ error: 'לא ניתן למחוק את החשבון שלך' }, { status: 400 });
    }

    const target = getUserById(id);
    if (!target) return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 });

    // Soft delete via updateUser
    updateUser(id, { active: 0 });
    return NextResponse.json({ success: true, message: 'עובד הוסר מהמערכת' });
  },
  ['admin']
);
