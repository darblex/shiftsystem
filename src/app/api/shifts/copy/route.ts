export const dynamic = 'force-dynamic';
// ============================================================
// app/api/shifts/copy/route.ts — Copy shifts from one month to another
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db, copyShiftsToMonth } from '@/lib/db';

// POST /api/shifts/copy — body: {userId, fromYear, fromMonth, toYear, toMonth}
export const POST = requireAuth(
  async (req) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }

    const { userId, fromYear, fromMonth, toYear, toMonth } = body ?? {};

    if (!userId || !fromYear || !fromMonth || !toYear || !toMonth) {
      return NextResponse.json(
        { error: 'נא לציין userId, fromYear, fromMonth, toYear, toMonth' },
        { status: 400 }
      );
    }

    const targetUserId = Number(userId);
    const fromYearNum = Number(fromYear);
    const fromMonthNum = Number(fromMonth);
    const toYearNum = Number(toYear);
    const toMonthNum = Number(toMonth);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return NextResponse.json({ error: 'userId לא תקין' }, { status: 400 });
    }
    if (
      !Number.isInteger(fromYearNum) ||
      !Number.isInteger(toYearNum) ||
      !Number.isInteger(fromMonthNum) ||
      !Number.isInteger(toMonthNum) ||
      fromMonthNum < 1 ||
      fromMonthNum > 12 ||
      toMonthNum < 1 ||
      toMonthNum > 12
    ) {
      return NextResponse.json({ error: 'שנה או חודש לא תקינים' }, { status: 400 });
    }

    const targetUser = db.prepare('SELECT id FROM users WHERE id = ? AND active = 1').get(targetUserId);
    if (!targetUser) return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 });

    const count = copyShiftsToMonth(
      targetUserId,
      fromYearNum,
      fromMonthNum,
      toYearNum,
      toMonthNum
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
