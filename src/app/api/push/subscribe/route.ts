export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { savePushSubscription, removePushSubscription } from '@/lib/db';
import { parseJsonObject } from '@/lib/validation';

// POST /api/push/subscribe — save a push subscription for the current user
export const POST = requireAuth(async (req, { user }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const payload = parseJsonObject(body);
  if (!payload) return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });

  const endpoint = typeof payload.endpoint === 'string' ? payload.endpoint.trim() : null;
  const keys = parseJsonObject(payload.keys);
  const p256dh = typeof keys?.p256dh === 'string' ? keys.p256dh.trim() : null;
  const auth = typeof keys?.auth === 'string' ? keys.auth.trim() : null;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'נתוני מנוי חסרים' }, { status: 400 });
  }

  savePushSubscription(user.id, endpoint, p256dh, auth);
  return NextResponse.json({ success: true });
});

// DELETE /api/push/subscribe?endpoint=... — remove a subscription
export const DELETE = requireAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get('endpoint');
  if (!endpoint) return NextResponse.json({ error: 'חסר endpoint' }, { status: 400 });

  removePushSubscription(decodeURIComponent(endpoint));
  return NextResponse.json({ success: true });
});
