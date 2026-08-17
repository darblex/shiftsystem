import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db, getUserById } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { normalizeText, parseJsonObject } from '@/lib/validation';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GET = requireAuth(async (_req: NextRequest, { user }) => {
  const profile = getUserById(user.id);
  if (!profile) {
    return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 });
  }
  return NextResponse.json({ user: profile });
});

export const PATCH = requireAuth(async (req: NextRequest, { user }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 });
  }

  const payload = parseJsonObject(body);
  if (!payload) return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 });
  const updates: Record<string, string | null> = {};
  if (payload.full_name !== undefined) {
    const fullName = normalizeText(payload.full_name, 100);
    if (!fullName) return NextResponse.json({ error: 'שם מלא לא תקין' }, { status: 400 });
    updates.full_name = fullName;
  }
  if (payload.email !== undefined) {
    const email = normalizeText(payload.email, 254)?.toLowerCase();
    if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: 'כתובת אימייל לא תקינה' }, { status: 400 });
    const duplicate = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, user.id);
    if (duplicate) return NextResponse.json({ error: 'כתובת האימייל כבר בשימוש' }, { status: 409 });
    updates.email = email;
  }
  if (payload.phone !== undefined) updates.phone = normalizeText(payload.phone, 30);
  if (payload.department !== undefined) updates.department = normalizeText(payload.department, 100);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'אין שדות לעדכון' }, { status: 400 });
  }

  const fields = Object.keys(updates).map((k) => `${k} = @${k}`).join(', ');
  const updated = db
    .prepare(
      `UPDATE users SET ${fields}, updated_at = datetime('now')
       WHERE id = @id
       RETURNING id, username, email, full_name, role, department, phone, active, created_at, updated_at`
    )
    .get({ ...updates, id: user.id });

  return NextResponse.json({ user: updated });
});

export const POST = requireAuth(async (req: NextRequest, { user }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 });
  }

  const payload = parseJsonObject(body);
  if (!payload || payload.action !== 'change_password') {
    return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 });
  }

  const old_password = typeof payload.old_password === 'string' ? payload.old_password : '';
  const new_password = typeof payload.new_password === 'string' ? payload.new_password : '';
  if (!old_password || !new_password) {
    return NextResponse.json({ error: 'יש לספק סיסמה נוכחית וסיסמה חדשה' }, { status: 400 });
  }

  if (new_password.length < 8) {
    return NextResponse.json({ error: 'הסיסמה החדשה חייבת להכיל לפחות 8 תווים' }, { status: 400 });
  }
  if (old_password.length > 128 || new_password.length > 128) {
    return NextResponse.json({ error: 'אורך הסיסמה אינו תקין' }, { status: 400 });
  }

  const row = db
    .prepare('SELECT password_hash FROM users WHERE id = ?')
    .get(user.id) as { password_hash: string } | undefined;

  if (!row) {
    return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 });
  }

  const valid = await verifyPassword(old_password, row.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'הסיסמה הנוכחית שגויה' }, { status: 400 });
  }

  const newHash = await hashPassword(new_password);
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime(\'now\') WHERE id = ?')
    .run(newHash, user.id);

  return NextResponse.json({ ok: true });
});
