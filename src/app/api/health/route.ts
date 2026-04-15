export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isJwtSecretConfigured } from '@/lib/auth';

export async function GET() {
  const checks = {
    database: false,
    auth: isJwtSecretConfigured(),
  };

  try {
    const row = db.prepare('SELECT 1 as ok').get() as { ok?: number } | undefined;
    checks.database = row?.ok === 1;
  } catch {
    checks.database = false;
  }

  const ok = checks.database && checks.auth;

  return NextResponse.json(
    {
      status: ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: ok ? 200 : 503 }
  );
}
