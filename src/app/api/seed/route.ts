export const dynamic = 'force-dynamic';
// ============================================================
// app/api/seed/route.ts — Database seed endpoint
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db, getAllActiveUsers, bulkUpsertShifts, upsertDutyAssignment } from '@/lib/db';
import type { ShiftEntry } from '@/types';

function datesInMonth(year: number, month: number): string[] {
  const dates: string[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dates.push(iso);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function getDayOfWeek(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00`).getDay();
}

// April 2026 Israeli holidays (approximate)
const APRIL_2026_HOLIDAYS = new Set([
  '2026-04-01', // Passover eve
  '2026-04-02', '2026-04-03', '2026-04-04', '2026-04-05',
  '2026-04-06', '2026-04-07', '2026-04-08', '2026-04-09',
]);

const SHIFT_TYPES: Array<'morning' | 'afternoon' | 'night'> = ['morning', 'afternoon', 'night'];

export async function GET() {
  const counts = {
    users: (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c,
    shifts: (db.prepare('SELECT COUNT(*) as c FROM shifts').get() as any).c,
    constraints: (db.prepare('SELECT COUNT(*) as c FROM constraints').get() as any).c,
    holidays: (db.prepare('SELECT COUNT(*) as c FROM holidays').get() as any).c,
    duty_assignments: (db.prepare('SELECT COUNT(*) as c FROM duty_assignments').get() as any).c,
  };

  return NextResponse.json({
    seeded: counts.users > 0,
    counts,
    demoUsers: [
      { username: 'admin', password: 'admin' },
      { username: 'yossi', password: 'employee1' },
      { username: 'michal', password: 'employee2' },
      { username: 'avi', password: 'manager1' },
      { username: 'dana', password: 'employee3' },
    ],
  });
}

export const POST = requireAuth(async (_req, { user }) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }

  const users = getAllActiveUsers();
  const nonAdmins = users.filter((u) => u.role !== 'admin');

  if (nonAdmins.length === 0) {
    return NextResponse.json({ error: 'אין עובדים לבצע seed' }, { status: 400 });
  }

  const year = 2026;
  const month = 4;
  const dates = datesInMonth(year, month);

  // Clear existing shifts + duties for this month
  db.prepare(`DELETE FROM shifts WHERE date LIKE '2026-04-%'`).run();
  db.prepare(`DELETE FROM duty_assignments WHERE date LIKE '2026-04-%'`).run();

  const entries: Array<Omit<ShiftEntry, 'id' | 'created_at'>> = [];

  for (let uIdx = 0; uIdx < nonAdmins.length; uIdx++) {
    const u = nonAdmins[uIdx];
    let workdayIdx = 0;

    for (const date of dates) {
      const dow = getDayOfWeek(date);
      const isWeekend = dow === 5 || dow === 6;
      const isHoliday = APRIL_2026_HOLIDAYS.has(date);

      let shiftType: ShiftEntry['shift_type'];

      if (isHoliday) {
        shiftType = 'holiday';
      } else if (isWeekend) {
        // Saturday — some get weekend_duty
        if (dow === 6 && uIdx % nonAdmins.length === (workdayIdx % nonAdmins.length)) {
          shiftType = 'weekend_duty';
        } else {
          shiftType = 'day_off';
        }
      } else {
        // Workday: rotate morning/afternoon/night across employees + days
        const rotIdx = (uIdx + workdayIdx) % SHIFT_TYPES.length;
        shiftType = SHIFT_TYPES[rotIdx];
        workdayIdx++;
      }

      entries.push({
        user_id: u.id,
        date,
        shift_type: shiftType,
        notes: undefined,
        approved_by: undefined,
      });
    }
  }

  bulkUpsertShifts(entries);

  const dutyDates = dates.filter((date) => {
    const dow = getDayOfWeek(date);
    return dow === 6 || APRIL_2026_HOLIDAYS.has(date);
  });

  const dutyAssignments = dutyDates.map((date, idx) => {
    const assignedUser = nonAdmins[idx % nonAdmins.length];
    const isHoliday = APRIL_2026_HOLIDAYS.has(date);
    const dutyType = isHoliday ? 'holiday' : 'weekend';
    return upsertDutyAssignment({
      date,
      employee_id: assignedUser.id,
      duty_type: dutyType,
      notes: isHoliday ? 'תורנות חג' : 'תורנות סוף שבוע',
    });
  });

  return NextResponse.json({
    success: true,
    message: `נוצרו ${entries.length} רשומות משמרת ו-${dutyAssignments.length} תורנויות לאפריל 2026`,
    usersCount: nonAdmins.length,
    shiftsCount: entries.length,
    dutyAssignmentsCount: dutyAssignments.length,
  });
}, ['admin']);
