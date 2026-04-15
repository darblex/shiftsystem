export const dynamic = 'force-dynamic';
// ============================================================
// app/api/auth/route.ts — Login / logout / me / change-password
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyToken,
  signToken,
  hashPassword,
  verifyPassword,
  extractTokenFromRequest,
  buildAuthCookieValue,
  buildClearCookieValue,
  getAuthConfigurationErrorResponse,
} from '@/lib/auth';
import { getUserById, getUserByUsername } from '@/lib/db';
import { normalizeText, parseJsonObject } from '@/lib/validation';

// GET /api/auth — return current session user
export async function GET(req: NextRequest) {
  const configError = getAuthConfigurationErrorResponse();
  if (configError) return configError;

  const token = extractTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'פג תוקף ההתחברות' }, { status: 401 });
  }

  const user = getUserById(payload.sub);
  if (!user || !user.active) {
    return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 401 });
  }

  return NextResponse.json({ user, role: user.role, authenticated: true });
}

// POST /api/auth — login with username + password
export async function POST(req: NextRequest) {
  const configError = getAuthConfigurationErrorResponse();
  if (configError) return configError;

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

  const username = normalizeText(payload.username, 100);
  const password = normalizeText(payload.password, 200);

  if (!username || !password) {
    return NextResponse.json({ error: 'נא למלא שם משתמש וסיסמה' }, { status: 400 });
  }

  const userWithHash = getUserByUsername(username);
  if (!userWithHash) {
    return NextResponse.json({ error: 'שם משתמש או סיסמה שגויים' }, { status: 401 });
  }

  if (!userWithHash.active) {
    return NextResponse.json({ error: 'חשבון זה אינו פעיל' }, { status: 403 });
  }

  const valid = await verifyPassword(String(password), userWithHash.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'שם משתמש או סיסמה שגויים' }, { status: 401 });
  }

  const { password_hash, ...user } = userWithHash;
  const token = signToken(user);

  const res = NextResponse.json({ user, role: user.role, authenticated: true });
  res.headers.set('Set-Cookie', buildAuthCookieValue(token));
  return res;
}

// DELETE /api/auth — logout
export async function DELETE(_req: NextRequest) {
  const res = NextResponse.json({ success: true, message: 'התנתקת בהצלחה' });
  res.headers.set('Set-Cookie', buildClearCookieValue());
  return res;
}

// PATCH /api/auth — change own password
export async function PATCH(req: NextRequest) {
  const configError = getAuthConfigurationErrorResponse();
  if (configError) return configError;

  const token = extractTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });

  const tokenPayload = verifyToken(token);
  if (!tokenPayload) return NextResponse.json({ error: 'פג תוקף ההתחברות' }, { status: 401 });

  const user = getUserById(tokenPayload.sub);
  if (!user || !user.active) return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const bodyPayload = parseJsonObject(body);
  if (!bodyPayload) {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const currentPassword = normalizeText(bodyPayload.currentPassword, 200);
  const newPassword = normalizeText(bodyPayload.newPassword, 200);
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'נא למלא סיסמה נוכחית וסיסמה חדשה' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'הסיסמה החדשה חייבת להכיל לפחות 6 תווים' }, { status: 400 });
  }

  const userWithHash = getUserByUsername(user.username);
  if (!userWithHash) return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 });

  const valid = await verifyPassword(String(currentPassword), userWithHash.password_hash);
  if (!valid) return NextResponse.json({ error: 'הסיסמה הנוכחית שגויה' }, { status: 401 });

  const newHash = await hashPassword(String(newPassword));

  const { db } = await import('@/lib/db');
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
    newHash,
    user.id
  );

  return NextResponse.json({ success: true, message: 'הסיסמה עודכנה בהצלחה' });
}
