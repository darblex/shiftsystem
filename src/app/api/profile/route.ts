import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db, getUserById } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';

export const GET = requireAuth(async (_req: NextRequest, { user }) => {
  const profile = getUserById(user.id);
  if (!profile) {
    return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 });
  }
  return NextResponse.json({ user: profile });
});

export const PATCH = requireAuth(async (req: NextRequest, { user }) => {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 });
  }

  const allowed = ['full_name', 'email', 'phone', 'department'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body && typeof body[key] === 'string') {
      updates[key] = (body[key] as string).trim();
    }
  }

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
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 });
  }

  if (body.action !== 'change_password') {
    return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 });
  }

  const { old_password, new_password } = body as { old_password?: string; new_password?: string };
  if (!old_password || !new_password) {
    return NextResponse.json({ error: 'יש לספק סיסמה נוכחית וסיסמה חדשה' }, { status: 400 });
  }

  if (new_password.length < 8) {
    return NextResponse.json({ error: 'הסיסמה החדשה חייבת להכיל לפחות 8 תווים' }, { status: 400 });
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
  db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(newHash, user.id);

  return NextResponse.json({ ok: true });
});
