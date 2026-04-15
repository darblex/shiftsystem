export const dynamic = 'force-dynamic';
// ============================================================
// app/api/requests/[id]/route.ts — Approve/reject/cancel shift requests
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getShiftRequestById, resolveShiftRequest } from '@/lib/db';
import type { ShiftRequest } from '@/types';

const MUTABLE_STATUSES: Array<Extract<ShiftRequest['status'], 'approved' | 'rejected' | 'cancelled'>> = [
  'approved',
  'rejected',
  'cancelled',
];

export const PUT = requireAuth(async (req, { user }, context: { params: { id: string } }) => {
  const requestId = Number(context.params.id);
  if (!Number.isInteger(requestId) || requestId < 1) {
    return NextResponse.json({ error: 'מזהה בקשה לא תקין' }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }

  const { status, adminNote } = body ?? {};
  if (!MUTABLE_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'סטטוס יעד לא תקין' }, { status: 400 });
  }

  const existing = getShiftRequestById(requestId);
  if (!existing) {
    return NextResponse.json({ error: 'הבקשה לא נמצאה' }, { status: 404 });
  }

  const isManager = user.role === 'admin' || user.role === 'manager';
  const isOwner = existing.requester_id === user.id;

  if (!isManager) {
    if (!isOwner) {
      return NextResponse.json({ error: 'אין הרשאה לעדכן בקשה זו' }, { status: 403 });
    }
    if (status !== 'cancelled') {
      return NextResponse.json({ error: 'עובד יכול רק לבטל את הבקשה שלו' }, { status: 403 });
    }
  }

  const result = resolveShiftRequest(
    requestId,
    status,
    isManager ? user.id : undefined,
    adminNote ? String(adminNote).trim() : null,
  );

  if (!result.ok) {
    switch (result.code) {
      case 'not_found':
        return NextResponse.json({ error: 'הבקשה לא נמצאה' }, { status: 404 });
      case 'not_pending':
        return NextResponse.json({ error: 'רק בקשה ממתינה ניתנת לעדכון' }, { status: 409 });
      case 'missing_shift':
        return NextResponse.json({ error: 'לא נמצאה משמרת לעדכון עבור הבקשה' }, { status: 409 });
      case 'shift_changed':
        return NextResponse.json(
          {
            error: 'המשמרת המקורית השתנתה מאז יצירת הבקשה',
            currentShift: result.currentShift ?? null,
          },
          { status: 409 },
        );
    }
  }

  return NextResponse.json({ request: result.request });
});

export const PATCH = PUT;
