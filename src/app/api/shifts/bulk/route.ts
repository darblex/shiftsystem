export const dynamic = 'force-dynamic';
// ============================================================
// app/api/shifts/bulk/route.ts — Bulk upsert shifts
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db, bulkUpsertShifts } from '@/lib/db';
import { normalizeText, parseIsoDate, parseJsonObject, parsePositiveInt } from '@/lib/validation';
import type { ShiftType } from '@/types';

const VALID_SHIFT_TYPES: ShiftType[] = [
  'morning', 'afternoon', 'night', 'day_off', 'holiday',
  'duty', 'weekend_duty', 'sick', 'vacation',
];

// POST /api/shifts/bulk — bulk upsert [{userId, date, shiftType, notes?}...]
export const POST = requireAuth(
  async (req, { user }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }

    const envelope = parseJsonObject(body);
    const entries = Array.isArray(body) ? body : envelope?.entries;
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'נא לשלוח מערך של רשומות' }, { status: 400 });
    }
    if (entries.length > 500) {
      return NextResponse.json({ error: 'ניתן לעדכן עד 500 רשומות בבקשה' }, { status: 413 });
    }

    const prepared: Array<{ user_id: number; date: string; shift_type: ShiftType; notes?: string; approved_by?: number }> = [];
    const targetUserIds = new Set<number>();

    for (const rawEntry of entries) {
      const entry = parseJsonObject(rawEntry);
      if (!entry) return NextResponse.json({ error: 'רשומת משמרת לא תקינה' }, { status: 400 });
      const userId = parsePositiveInt(entry.userId);
      const date = parseIsoDate(entry.date);
      const shiftType = normalizeText(entry.shiftType, 20) as ShiftType | null;
      const notes = normalizeText(entry.notes, 500);
      if (!userId || !date || !shiftType) {
        return NextResponse.json({ error: 'כל רשומה חייבת לכלול userId, date ו-shiftType' }, { status: 400 });
      }
      if (!VALID_SHIFT_TYPES.includes(shiftType)) {
        return NextResponse.json({ error: `סוג משמרת לא תקין: ${shiftType}` }, { status: 400 });
      }

      targetUserIds.add(userId);
      prepared.push({
        user_id: userId,
        date,
        shift_type: shiftType,
        notes: notes ?? undefined,
        approved_by: user.id,
      });
    }

    const ids = [...targetUserIds];
    const activeRows = db
      .prepare(`SELECT id FROM users WHERE active = 1 AND id IN (${ids.map(() => '?').join(',')})`)
      .all(...ids) as Array<{ id: number }>;
    const activeIds = new Set(activeRows.map((row) => row.id));
    const missingUserId = ids.find((id) => !activeIds.has(id));
    if (missingUserId !== undefined) {
      return NextResponse.json({ error: `עובד לא נמצא: ${missingUserId}` }, { status: 404 });
    }

    bulkUpsertShifts(prepared);
    return NextResponse.json({ success: true, count: prepared.length });
  },
  ['admin', 'manager']
);
