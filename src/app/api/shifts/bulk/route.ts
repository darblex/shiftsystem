export const dynamic = 'force-dynamic';
// ============================================================
// app/api/shifts/bulk/route.ts — Bulk upsert shifts
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db, bulkUpsertShifts } from '@/lib/db';
import type { ShiftType } from '@/types';

const VALID_SHIFT_TYPES: ShiftType[] = [
  'morning', 'afternoon', 'night', 'day_off', 'holiday',
  'duty', 'weekend_duty', 'sick', 'vacation',
];

// POST /api/shifts/bulk — bulk upsert [{userId, date, shiftType, notes?}...]
export const POST = requireAuth(
  async (req, { user }) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }

    const entries = Array.isArray(body) ? body : body?.entries;
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'נא לשלוח מערך של רשומות' }, { status: 400 });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const prepared: Array<{ user_id: number; date: string; shift_type: ShiftType; notes?: string; approved_by?: number }> = [];

    for (const entry of entries) {
      const { userId, date, shiftType, notes } = entry;
      if (!userId || !date || !shiftType) {
        return NextResponse.json({ error: 'כל רשומה חייבת לכלול userId, date ו-shiftType' }, { status: 400 });
      }
      if (!dateRegex.test(String(date))) {
        return NextResponse.json({ error: `תאריך לא תקין: ${date}` }, { status: 400 });
      }
      if (!VALID_SHIFT_TYPES.includes(shiftType)) {
        return NextResponse.json({ error: `סוג משמרת לא תקין: ${shiftType}` }, { status: 400 });
      }

      const targetUser = db.prepare('SELECT id FROM users WHERE id = ? AND active = 1').get(Number(userId));
      if (!targetUser) {
        return NextResponse.json({ error: `עובד לא נמצא: ${userId}` }, { status: 404 });
      }

      prepared.push({
        user_id: Number(userId),
        date: String(date),
        shift_type: shiftType,
        notes: notes ?? null,
        approved_by: user.id,
      });
    }

    bulkUpsertShifts(prepared);
    return NextResponse.json({ success: true, count: prepared.length });
  },
  ['admin', 'manager']
);
