export const dynamic = 'force-dynamic';
// ============================================================
// app/api/requests/route.ts — Shift request list/create
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  createShiftRequest,
  findPendingShiftRequest,
  getShiftForUserOnDate,
  getUserById,
  listShiftRequests,
} from '@/lib/db';
import { normalizeText, parseJsonObject, parsePositiveInt, parseIsoDate } from '@/lib/validation';
import type { ShiftRequest, ShiftType } from '@/types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_SHIFT_TYPES: ShiftType[] = [
  'morning',
  'afternoon',
  'night',
  'day_off',
  'holiday',
  'duty',
  'weekend_duty',
  'sick',
  'vacation',
];
const VALID_STATUSES: ShiftRequest['status'][] = ['pending', 'approved', 'rejected', 'cancelled'];

// GET /api/requests[?userId=X&status=pending&fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&limit=100]
export const GET = requireAuth(async (req, { user }) => {
  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get('userId');
  const statusParam = searchParams.get('status');
  const fromDate = searchParams.get('fromDate') ?? undefined;
  const toDate = searchParams.get('toDate') ?? undefined;
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 100;

  if (!Number.isFinite(limit) || limit < 1) {
    return NextResponse.json({ error: 'limit לא תקין' }, { status: 400 });
  }
  if (statusParam && !VALID_STATUSES.includes(statusParam as ShiftRequest['status'])) {
    return NextResponse.json({ error: 'סטטוס לא תקין' }, { status: 400 });
  }
  if (fromDate && !DATE_RE.test(fromDate)) {
    return NextResponse.json({ error: 'fromDate לא תקין. נדרש YYYY-MM-DD' }, { status: 400 });
  }
  if (toDate && !DATE_RE.test(toDate)) {
    return NextResponse.json({ error: 'toDate לא תקין. נדרש YYYY-MM-DD' }, { status: 400 });
  }

  let requesterId: number | undefined;
  if (userIdParam) {
    requesterId = Number(userIdParam);
    if (!Number.isInteger(requesterId) || requesterId < 1) {
      return NextResponse.json({ error: 'userId לא תקין' }, { status: 400 });
    }
  }

  if (user.role === 'employee') {
    if (requesterId !== undefined && requesterId !== user.id) {
      return NextResponse.json({ error: 'אין הרשאה לצפות בבקשות של עובד אחר' }, { status: 403 });
    }
    requesterId = user.id;
  }

  const requests = listShiftRequests({
    requesterId,
    status: statusParam as ShiftRequest['status'] | undefined,
    fromDate,
    toDate,
    limit,
  });

  return NextResponse.json({
    requests,
    filters: {
      requesterId: requesterId ?? null,
      status: statusParam ?? null,
      fromDate: fromDate ?? null,
      toDate: toDate ?? null,
      limit: Math.min(Math.max(limit, 1), 500),
    },
  });
});

// POST /api/requests — create a new shift change request
export const POST = requireAuth(async (req, { user }) => {
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

  const requesterId = payload.userId ? parsePositiveInt(payload.userId) : user.id;
  const targetDate = parseIsoDate(payload.targetDate);
  const currentShift = normalizeText(payload.currentShift, 20) as ShiftType | null;
  const requestedShift = normalizeText(payload.requestedShift, 20) as ShiftType | null;
  const reason = normalizeText(payload.reason, 500);

  if (!requesterId) {
    return NextResponse.json({ error: 'userId לא תקין' }, { status: 400 });
  }

  if (user.role === 'employee' && requesterId !== user.id) {
    return NextResponse.json({ error: 'אין הרשאה ליצור בקשה עבור עובד אחר' }, { status: 403 });
  }

  if (!targetDate || !currentShift || !requestedShift) {
    return NextResponse.json(
      { error: 'נא לציין תאריך, משמרת נוכחית ומשמרת מבוקשת' },
      { status: 400 },
    );
  }

  if (!VALID_SHIFT_TYPES.includes(currentShift as ShiftType)) {
    return NextResponse.json({ error: 'המשמרת הנוכחית לא תקינה' }, { status: 400 });
  }
  if (!VALID_SHIFT_TYPES.includes(requestedShift as ShiftType)) {
    return NextResponse.json({ error: 'המשמרת המבוקשת לא תקינה' }, { status: 400 });
  }
  if (currentShift === requestedShift) {
    return NextResponse.json({ error: 'המשמרת המבוקשת חייבת להיות שונה מהמשמרת הנוכחית' }, { status: 400 });
  }

  const requester = getUserById(requesterId);
  if (!requester || !requester.active) {
    return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 });
  }

  const existingShift = getShiftForUserOnDate(requesterId, targetDate);
  if (!existingShift) {
    return NextResponse.json({ error: 'לא נמצאה משמרת בתאריך המבוקש' }, { status: 404 });
  }
  if (existingShift.shift_type !== currentShift) {
    return NextResponse.json(
      {
        error: 'המשמרת בפועל שונה מהמשמרת שנשלחה בבקשה',
        currentShift: existingShift.shift_type,
      },
      { status: 409 },
    );
  }

  const pendingRequest = findPendingShiftRequest(requesterId, targetDate);
  if (pendingRequest) {
    return NextResponse.json(
      { error: 'כבר קיימת בקשה פתוחה לתאריך זה', request: pendingRequest },
      { status: 409 },
    );
  }

  const requestRecord = createShiftRequest({
    requester_id: requesterId,
    target_date: targetDate,
    current_shift: currentShift,
    requested_shift: requestedShift,
    reason,
  });

  return NextResponse.json({ request: requestRecord }, { status: 201 });
});
