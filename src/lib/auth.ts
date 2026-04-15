// ============================================================
// lib/auth.ts — JWT + bcrypt auth helpers
// ============================================================

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getUserById, getUserByUsername } from './db';
import type { User } from '@/types';

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_JWT_SECRET = 'shiftsystem-dev-secret-change-in-production';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const COOKIE_NAME = 'ss_token';

export function isJwtSecretConfigured(): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  return Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET !== DEFAULT_JWT_SECRET);
}

export function getAuthConfigurationErrorResponse(): NextResponse | null {
  if (isJwtSecretConfigured()) {
    return null;
  }

  return NextResponse.json(
    { error: 'השרת אינו מוגדר כראוי לאימות' },
    { status: 500 }
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: number;        // user id
  username: string;
  role: User['role'];
  iat?: number;
  exp?: number;
}

// ── Password helpers ─────────────────────────────────────────────────────────

/**
 * Hashes a plain-text password with bcrypt (cost 12).
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Synchronous hash — use only during server-side seed or CLI operations.
 */
export function hashPasswordSync(password: string): string {
  return bcrypt.hashSync(password, 12);
}

/**
 * Verifies a plain-text password against a stored bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── JWT helpers ──────────────────────────────────────────────────────────────

/**
 * Signs a JWT token for the given user.
 */
export function signToken(user: Pick<User, 'id' | 'username' | 'role'>): string {
  const payload: JwtPayload = {
    sub: user.id,
    username: user.username,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

/**
 * Verifies a JWT string and returns the decoded payload, or null if invalid.
 */
export function verifyToken(token: string): JwtPayload | null {
  if (!isJwtSecretConfigured()) {
    return null;
  }

  try {
    return jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Decodes a JWT without verifying the signature (for reading claims only).
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as unknown as JwtPayload;
  } catch {
    return null;
  }
}

// ── Cookie helpers ───────────────────────────────────────────────────────────

/**
 * Parses the auth token from a NextRequest's cookies or Authorization header.
 * Returns the raw token string or null.
 */
export function extractTokenFromRequest(req: NextRequest): string | null {
  // 1. Cookie
  const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  // 2. Authorization: Bearer <token>
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return null;
}

/**
 * Reads the auth token from the Next.js `cookies()` store (Server Components).
 * Returns the raw token string or null.
 */
export function getTokenFromCookies(): string | null {
  try {
    return cookies().get(COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Creates a Set-Cookie header value for the auth token.
 */
export function buildAuthCookieValue(token: string, maxAgeSeconds = 7 * 24 * 60 * 60): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSeconds}${
    process.env.NODE_ENV === 'production' ? '; Secure' : ''
  }`;
}

/**
 * Creates a Set-Cookie header that clears the auth token.
 */
export function buildClearCookieValue(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${
    process.env.NODE_ENV === 'production' ? '; Secure' : ''
  }`;
}

// ── Current-user lookup ───────────────────────────────────────────────────────

/**
 * Resolves the current authenticated user from a NextRequest.
 * Returns the full User object or null if unauthenticated / invalid token.
 */
export async function getCurrentUserFromRequest(req: NextRequest): Promise<User | null> {
  const token = extractTokenFromRequest(req);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = getUserById(payload.sub);
  if (!user || !user.active) return null;

  return user;
}

/**
 * Resolves the current user from Server Component cookies().
 * Returns User or null.
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = getTokenFromCookies();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = getUserById(payload.sub);
  if (!user || !user.active) return null;

  return user;
}

// ── Route-handler guard ───────────────────────────────────────────────────────

type RouteHandler = (
  req: NextRequest,
  context: { user: User; payload: JwtPayload },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...rest: any[]
) => Promise<NextResponse> | NextResponse;

/**
 * Wraps a Next.js App Router route handler, ensuring the user is authenticated.
 * Optionally restrict to specific roles.
 *
 * @example
 * export const GET = requireAuth(async (req, { user }) => {
 *   return NextResponse.json({ user });
 * });
 *
 * @example
 * export const POST = requireAuth(async (req, { user }) => {
 *   // ...
 * }, ['admin', 'manager']);
 */
export function requireAuth(
  handler: RouteHandler,
  allowedRoles?: Array<User['role']>
): (req: NextRequest, ...rest: unknown[]) => Promise<NextResponse> {
  return async (req: NextRequest, ...rest: unknown[]) => {
    const configError = getAuthConfigurationErrorResponse();
    if (configError) {
      return configError;
    }

    const token = extractTokenFromRequest(req);

    if (!token) {
      return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'טוקן לא תקין' }, { status: 401 });
    }

    const user = getUserById(payload.sub);
    if (!user || !user.active) {
      return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 401 });
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }

    return handler(req, { user, payload }, ...rest);
  };
}

// ── Login helper ─────────────────────────────────────────────────────────────

/**
 * Attempts to log in with the provided credentials.
 * Returns { user, token } on success, or null on failure.
 */
export async function loginWithCredentials(
  username: string,
  password: string
): Promise<{ user: User; token: string } | null> {
  const userWithHash = getUserByUsername(username);
  if (!userWithHash) return null;

  const valid = await verifyPassword(password, userWithHash.password_hash);
  if (!valid) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...user } = userWithHash;
  const token = signToken(user);

  return { user, token };
}
