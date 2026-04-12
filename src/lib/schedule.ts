// ============================================================
// lib/schedule.ts — Monthly schedule generation logic (shifts)
// ============================================================

import {
  db,
  getAllActiveUsers,
  getConstraints,
  bulkUpsertShifts,
  getDutyAssignmentsForMonth,
  getAllShiftsForMonth,
  getHolidaysFromDB,
} from './db';
import { isHoliday, getHolidaysForMonth } from './holidays';
import type {
  ShiftEntry,
  GenerateMonthOptions,
  MonthSchedule,
  ConstraintPreference,
} from '@/types';

// ── Date utilities ────────────────────────────────────────────────────────────

function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function isWeekend(date: Date): boolean {
  return date.getDay() === 5 || date.getDay() === 6; // Fri or Sat
}

function datesInMonth(year: number, month: number): Date[] {
  const dates: Date[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

// ── Main generation function ──────────────────────────────────────────────────

const SHIFT_ROTATION: Array<'morning' | 'afternoon' | 'night'> = ['morning', 'afternoon', 'night'];

/**
 * Generates a full month schedule for all active employees.
 *
 * Rules:
 * - Work week is Sun–Thu (Fri/Sat = weekend → day_off or weekend_duty).
 * - Work days: rotating morning/afternoon/night across employees.
 * - Holidays → shift_type = 'holiday'.
 * - Employees with 'fixed_morning' / 'fixed_afternoon' get consistent shifts.
 * - Weekend duty rotates once per month per employee.
 */
export async function generateMonthSchedule(
  options: GenerateMonthOptions
): Promise<MonthSchedule[]> {
  const { year, month, overwrite = false } = options;

  const allUsers = getAllActiveUsers();
  const targetUsers = allUsers.filter((u) => u.role !== 'admin');

  if (targetUsers.length === 0) return [];

  const prefix = `${year}-${String(month).padStart(2, '0')}`;

  if (overwrite) {
    db.prepare(`DELETE FROM shifts WHERE date LIKE ?`).run(`${prefix}%`);
    db.prepare(`DELETE FROM duty_assignments WHERE date LIKE ?`).run(`${prefix}%`);
  }

  const allDates = datesInMonth(year, month);
  const workdays = allDates.filter((d) => !isWeekend(d) && !isHoliday(d));
  const weekendDates = allDates.filter((d) => d.getDay() === 6); // Saturdays

  // Load constraints
  const constraintMap = new Map<number, ConstraintPreference>();
  for (const user of targetUsers) {
    const c = getConstraints(user.id, year, month);
    if (c) constraintMap.set(user.id, c.preference);
  }

  // Assign weekend duty (one Saturday per user, rotating)
  const dutyAssignments: { userId: number; date: string }[] = [];
  if (weekendDates.length > 0 && targetUsers.length > 0) {
    const lastDuties = db.prepare(`
      SELECT employee_id, MAX(date) as last_date
      FROM duty_assignments
      WHERE duty_type = 'weekend' AND date < ?
      GROUP BY employee_id
      ORDER BY last_date ASC
    `).all(`${prefix}-01`) as Array<{ employee_id: number; last_date: string }>;

    const lastDutyByUser = new Map(lastDuties.map((r) => [r.employee_id, r.last_date]));
    const orderedUsers = [...targetUsers].sort((a, b) => {
      const aLast = lastDutyByUser.get(a.id) ?? '1970-01-01';
      const bLast = lastDutyByUser.get(b.id) ?? '1970-01-01';
      return aLast < bLast ? -1 : aLast > bLast ? 1 : 0;
    });

    for (let i = 0; i < Math.min(weekendDates.length, orderedUsers.length); i++) {
      const user = orderedUsers[i];
      const sat = weekendDates[i];
      const dateStr = toIso(sat);
      dutyAssignments.push({ userId: user.id, date: dateStr });
      db.prepare(
        `INSERT INTO duty_assignments (date, employee_id, duty_type, notes)
         VALUES (?, ?, 'weekend', 'תורנות סופ"ש - נוצר אוטומטית')
         ON CONFLICT(employee_id, date) DO UPDATE SET duty_type = 'weekend'`
      ).run(dateStr, user.id);
    }
  }

  const allEntries: Array<Omit<ShiftEntry, 'id' | 'created_at'>> = [];
  const monthSchedules: MonthSchedule[] = [];

  for (let uIdx = 0; uIdx < targetUsers.length; uIdx++) {
    const user = targetUsers[uIdx];
    const preference = constraintMap.get(user.id) ?? 'no_preference';
    const dutySet = new Set(dutyAssignments.filter((d) => d.userId === user.id).map((d) => d.date));

    const userSchedule: MonthSchedule[string] = {};

    // Assign shifts for work days
    for (let dIdx = 0; dIdx < workdays.length; dIdx++) {
      const date = workdays[dIdx];
      const iso = toIso(date);
      let shiftType: ShiftEntry['shift_type'];

      if (preference === 'fixed_morning') {
        shiftType = 'morning';
      } else if (preference === 'fixed_afternoon') {
        shiftType = 'afternoon';
      } else {
        // Rotate: employee index + day index combined for fair distribution
        const rotIdx = (uIdx + dIdx) % SHIFT_ROTATION.length;
        shiftType = SHIFT_ROTATION[rotIdx];
      }

      const entry: Omit<ShiftEntry, 'id' | 'created_at'> = {
        user_id: user.id,
        date: iso,
        shift_type: shiftType,
        notes: undefined,
        approved_by: undefined,
      };
      allEntries.push(entry);
      userSchedule[iso] = { ...entry, id: 0, created_at: '' };
    }

    // Assign holidays
    for (const date of allDates) {
      if (isHoliday(date)) {
        const iso = toIso(date);
        const entry: Omit<ShiftEntry, 'id' | 'created_at'> = {
          user_id: user.id,
          date: iso,
          shift_type: 'holiday',
          notes: undefined,
          approved_by: undefined,
        };
        allEntries.push(entry);
        userSchedule[iso] = { ...entry, id: 0, created_at: '' };
      }
    }

    // Assign weekends: day_off or weekend_duty
    for (const date of allDates) {
      if (isWeekend(date)) {
        const iso = toIso(date);
        const shiftType: ShiftEntry['shift_type'] = dutySet.has(iso) ? 'weekend_duty' : 'day_off';
        const entry: Omit<ShiftEntry, 'id' | 'created_at'> = {
          user_id: user.id,
          date: iso,
          shift_type: shiftType,
          notes: shiftType === 'weekend_duty' ? 'תורנות סופ"ש' : undefined,
          approved_by: undefined,
        };
        allEntries.push(entry);
        userSchedule[iso] = { ...entry, id: 0, created_at: '' };
      }
    }

    monthSchedules.push({ [String(user.id)]: userSchedule });
  }

  if (allEntries.length > 0) {
    bulkUpsertShifts(allEntries);
  }

  return monthSchedules;
}

// ── Summary helpers ───────────────────────────────────────────────────────────

export interface ShiftSummary {
  userId: number;
  fullName?: string;
  year: number;
  month: number;
  morningDays: number;
  afternoonDays: number;
  nightDays: number;
  dayOffDays: number;
  holidayDays: number;
  dutyDays: number;
  sickDays: number;
  vacationDays: number;
  totalWorkdays: number;
}

export function getMonthSummary(year: number, month: number): ShiftSummary[] {
  const entries = getAllShiftsForMonth(year, month);
  const byUser = new Map<number, ShiftSummary & { fullName?: string }>();

  for (const entry of entries) {
    if (!byUser.has(entry.user_id)) {
      byUser.set(entry.user_id, {
        userId: entry.user_id,
        fullName: (entry as ShiftEntry & { full_name?: string }).full_name,
        year,
        month,
        morningDays: 0,
        afternoonDays: 0,
        nightDays: 0,
        dayOffDays: 0,
        holidayDays: 0,
        dutyDays: 0,
        sickDays: 0,
        vacationDays: 0,
        totalWorkdays: 0,
      });
    }

    const s = byUser.get(entry.user_id)!;
    switch (entry.shift_type) {
      case 'morning':    s.morningDays++;    s.totalWorkdays++; break;
      case 'afternoon':  s.afternoonDays++;  s.totalWorkdays++; break;
      case 'night':      s.nightDays++;      s.totalWorkdays++; break;
      case 'day_off':    s.dayOffDays++;     break;
      case 'holiday':    s.holidayDays++;    break;
      case 'duty':
      case 'weekend_duty': s.dutyDays++;     break;
      case 'sick':       s.sickDays++;       break;
      case 'vacation':   s.vacationDays++;   break;
    }
  }

  return Array.from(byUser.values());
}

export interface ShiftDayStat {
  date: string;
  morningCount: number;
  afternoonCount: number;
  nightCount: number;
  totalEmployees: number;
}

export function getShiftDayStats(year: number, month: number): ShiftDayStat[] {
  return db
    .prepare(
      `SELECT
         date,
         SUM(CASE WHEN shift_type = 'morning'   THEN 1 ELSE 0 END) AS morningCount,
         SUM(CASE WHEN shift_type = 'afternoon' THEN 1 ELSE 0 END) AS afternoonCount,
         SUM(CASE WHEN shift_type = 'night'     THEN 1 ELSE 0 END) AS nightCount,
         COUNT(DISTINCT user_id) AS totalEmployees
       FROM shifts
       WHERE date LIKE ?
       GROUP BY date
       ORDER BY date`
    )
    .all(`${year}-${String(month).padStart(2, '0')}%`) as ShiftDayStat[];
}

export function getUpcomingDuty(fromDate?: string): Array<{ date: string; employee_name: string; duty_type: string }> {
  const from = fromDate ?? toIso(new Date());
  return db
    .prepare(
      `SELECT d.date, u.full_name AS employee_name, d.duty_type
       FROM duty_assignments d
       JOIN users u ON u.id = d.employee_id
       WHERE d.date >= ?
       ORDER BY d.date
       LIMIT 10`
    )
    .all(from) as Array<{ date: string; employee_name: string; duty_type: string }>;
}

// re-export for convenience
export { getDutyAssignmentsForMonth, getHolidaysForMonth, getHolidaysFromDB };
