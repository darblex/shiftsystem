export const dynamic = 'force-dynamic';
// ============================================================
// app/api/shifts/copy/route.ts — Copy shifts from one month to another
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db, copyShiftsToMonth } from '@/lib/db';
import { parseJsonObject, parseMonth, parsePositiveInt, parseYear } from '@/lib/validation';

// POST /api/shifts/copy — body: {userId, fromYear, fromMonth, toYear, toMonth}
export const POST = requireAuth(
  async (req) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }

    const payload = parseJsonObject(body);
    if (!payload) return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    const targetUserId = parsePositiveInt(payload.userId);
    const fromYear = parseYear(payload.fromYear);
    const fromMonth = parseMonth(payload.fromMonth);
    const toYear = parseYear(payload.toYear);
    const toMonth = parseMonth(payload.toMonth);

    if (!targetUserId || !fromYear || !fromMonth || !toYear || !toMonth) {
      return NextResponse.json(
        { error: 'נא לציין userId, fromYear, fromMonth, toYear, toMonth' },
        { status: 400 }
      );
    }

    if (fromYear === toYear && fromMonth === toMonth) {
      return NextResponse.json({ error: 'חודש המקור והיעד חייבים להיות שונים' }, { status: 400 });
    }

    const targetUser = db.prepare('SELECT id FROM users WHERE id = ? AND active = 1').get(targetUserId);
    if (!targetUser) return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 });

    const count = copyShiftsToMonth(
      targetUserId,
      fromYear,
      fromMonth,
      toYear,
      toMonth
    );

    return NextResponse.json({
      success: true,
      copiedCount: count,
      from: `${fromYear}-${String(fromMonth).padStart(2, '0')}`,
      to: `${toYear}-${String(toMonth).padStart(2, '0')}`,
    });
  },
  ['admin', 'manager']
);
