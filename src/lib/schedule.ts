// ============================================================
// lib/schedule.ts — Monthly schedule generation logic
// ============================================================

import {
  db,
  getAllActiveUsers,
  getConstraints,
  bulkInsertSchedule,
  upsertDutyAssignment,
  getDutyAssignmentsForMonth,
  getAllScheduleForMonth,
} from './db';
import { isHoliday, getHolidaysForMonth } from './holidays';
import type {
  ScheduleEntry,
  GenerateMonthOptions,
  MonthSchedule,
  ScheduleType,
  ConstraintPreference,
} from '@/types';

// ── Date utilities ────────────────────────────────────────────────────────────

/** Returns ISO date string yyyy-MM-dd */
function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

/** Returns true if date is Saturday (6) in Israel's Sun-Fri work week */
function isSaturday(date: Date): boolean {
  return date.getDay() === 6;
}

/** Returns true if date is Friday (5) */
function isFriday(date: Date): boolean {
  return date.getDay() === 5;
}

/** Returns true if date is Saturday or Friday (weekend in Israel) */
function isWeekend(date: Date): boolean {
  return date.getDay() === 5 || date.getDay() === 6;
}

/** Returns true if date is a work day (Sunday–Thursday, not a holiday) */
function isWorkday(date: Date): boolean {
  const day = date.getDay();
  // Sunday = 0, Thursday = 4
  return day >= 0 && day <= 4 && !isHoliday(date);
}

/** Returns all dates in a given month */
function datesInMonth(year: number, month: number): Date[] {
  const dates: Date[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/** Returns ISO week number (Monday-anchored, but adapted for IL Sun-start) */
function getWeekKey(date: Date): string {
  // Group by Sun-Sat blocks
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Find the previous Sunday
  const day = d.getDay(); // 0 = Sun
  d.setDate(d.getDate() - day);
  return toIso(d);
}

/** Returns Saturdays in a given month */
function saturdaysInMonth(year: number, month: number): Date[] {
  return datesInMonth(year, month).filter((d) => isSaturday(d));
}

// ── Main generation function ──────────────────────────────────────────────────

/**
 * Generates a full month schedule for all (or specified) active employees.
 *
 * Rules:
 * - Work week is Sun–Thu (Fri/Sat = weekend).
 * - Each work week: 2 home days + 3 office days (adjusted for holidays / constraints).
 * - Holiday or memorial day → type = 'holiday'.
 * - Employees with 'fixed_home' preference get all days as home.
 * - Employees with 'fixed_office' preference get all days as office.
 * - Employees with 'prefer_home' get extra home allocation.
 * - Weekend duty (Saturday) rotates once per month per employee.
 * - Employees in `unavailable_dates` constraints get a `vacation` or no entry.
 */
export async function generateMonthSchedule(options: GenerateMonthOptions): Promise<MonthSchedule[]> {
  const { year, month, overwrite = false } = options;

  const allUsers = getAllActiveUsers();
  const targetUsers = options.userIds
    ? allUsers.filter((u) => options.userIds!.includes(u.id))
    : allUsers.filter((u) => u.role !== 'admin');

  if (targetUsers.length === 0) return [];

  // Clear existing entries if overwrite requested
  if (overwrite) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    db.prepare(`DELETE FROM schedule_entries WHERE date LIKE ?`).run(`${prefix}%`);
    db.prepare(`DELETE FROM duty_assignments WHERE date LIKE ?`).run(`${prefix}%`);
  }

  const allDates = datesInMonth(year, month);
  const workdays = allDates.filter(isWorkday);
  const saturdays = saturdaysInMonth(year, month);

  // Load constraints for all users
  const constraintMap: Map<number, ConstraintPreference> = new Map();
  const unavailableMap: Map<number, Set<string>> = new Map();
  const maxOfficeDaysMap: Map<number, number> = new Map();

  for (const user of targetUsers) {
    const c = getConstraints(user.id, year, month);
    if (c) {
      constraintMap.set(user.id, c.preference as ConstraintPreference);
      if (c.unavailable_dates) {
        try {
          const dates: string[] = JSON.parse(c.unavailable_dates);
          unavailableMap.set(user.id, new Set(dates));
        } catch {
          unavailableMap.set(user.id, new Set());
        }
      }
      if (c.max_office_days != null) {
        maxOfficeDaysMap.set(user.id, c.max_office_days);
      }
    }
  }

  // Assign weekend duty — rotate users across available Saturdays
  // Each user gets at most one Saturday per month
  const dutyAssignments: { userId: number; date: string }[] = [];

  if (saturdays.length > 0 && targetUsers.length > 0) {
    // Find last duty month to know who was last assigned
    const lastDutyQuery = db.prepare(`
      SELECT user_id, MAX(date) as last_date
      FROM duty_assignments
      WHERE duty_type = 'weekend' AND date < ?
      GROUP BY user_id
      ORDER BY last_date ASC
    `);
    const lastDuties = lastDutyQuery.all(
      `${year}-${String(month).padStart(2, '0')}-01`
    ) as Array<{ user_id: number; last_date: string }>;

    // Order users by who had duty least recently
    const lastDutyByUser = new Map(lastDuties.map((r) => [r.user_id, r.last_date]));
    const orderedUsers = [...targetUsers].sort((a, b) => {
      const aLast = lastDutyByUser.get(a.id) ?? '1970-01-01';
      const bLast = lastDutyByUser.get(b.id) ?? '1970-01-01';
      return aLast < bLast ? -1 : aLast > bLast ? 1 : 0;
    });

    // Assign one Saturday per user (round-robin until we run out of Saturdays)
    for (let i = 0; i < Math.min(saturdays.length, orderedUsers.length); i++) {
      const user = orderedUsers[i];
      const sat = saturdays[i];
      const dateStr = toIso(sat);
      dutyAssignments.push({ userId: user.id, date: dateStr });
      upsertDutyAssignment({
        user_id: user.id,
        date: dateStr,
        duty_type: 'weekend',
        notes: 'תורנות סופ"ש - נוצר אוטומטית',
      });
    }
  }

  // Generate schedule entries for each user
  const allEntries: Array<Omit<ScheduleEntry, 'id' | 'created_at'>> = [];
  const monthSchedules: MonthSchedule[] = [];

  for (const user of targetUsers) {
    const preference = constraintMap.get(user.id) ?? 'no_preference';
    const unavailable = unavailableMap.get(user.id) ?? new Set<string>();
    const maxOffice = maxOfficeDaysMap.get(user.id);
    const dutyDates = new Set(
      dutyAssignments.filter((d) => d.userId === user.id).map((d) => d.date)
    );

    const entries: Array<Omit<ScheduleEntry, 'id' | 'created_at'>> = [];

    // Group workdays by week
    const weeklyWorkdays: Map<string, Date[]> = new Map();
    for (const d of workdays) {
      const weekKey = getWeekKey(d);
      if (!weeklyWorkdays.has(weekKey)) weeklyWorkdays.set(weekKey, []);
      weeklyWorkdays.get(weekKey)!.push(d);
    }

    let totalOfficeDays = 0;
    let totalHomeDays = 0;

    // For each work week, assign 3 office + 2 home
    for (const [, weekDays] of weeklyWorkdays) {
      // Holidays within this week
      const regularDays = weekDays.filter((d) => {
        const iso = toIso(d);
        return !unavailable.has(iso);
      });
      const holidayDays = weekDays.filter((d) => isHoliday(d));

      // Emit holiday entries
      for (const hd of holidayDays) {
        entries.push({
          user_id: user.id,
          date: toIso(hd),
          schedule_type: 'holiday',
          notes: undefined,
          approved_by: undefined,
        });
      }

      // Emit unavailable (vacation placeholder)
      for (const d of weekDays) {
        const iso = toIso(d);
        if (unavailable.has(iso) && !isHoliday(d)) {
          entries.push({
            user_id: user.id,
            date: iso,
            schedule_type: 'vacation',
            notes: 'יום לא זמין - הוזן ידנית',
            approved_by: undefined,
          });
        }
      }

      // Regular work days (not holiday, not unavailable)
      const workingDays = regularDays.filter((d) => !isHoliday(d));
      if (workingDays.length === 0) continue;

      let officeDaysThisWeek: number;
      let homeDaysThisWeek: number;

      if (preference === 'fixed_home') {
        officeDaysThisWeek = 0;
        homeDaysThisWeek = workingDays.length;
      } else if (preference === 'fixed_office') {
        officeDaysThisWeek = workingDays.length;
        homeDaysThisWeek = 0;
      } else if (preference === 'prefer_home') {
        // 1 office + rest home (minimum 1 office per week)
        officeDaysThisWeek = Math.min(1, workingDays.length);
        homeDaysThisWeek = workingDays.length - officeDaysThisWeek;
      } else if (preference === 'prefer_office') {
        // All office
        officeDaysThisWeek = workingDays.length;
        homeDaysThisWeek = 0;
      } else {
        // no_preference: 3 office + 2 home (scale proportionally if < 5 days)
        const ratio = workingDays.length / 5;
        officeDaysThisWeek = Math.min(Math.round(3 * ratio), workingDays.length);
        homeDaysThisWeek = workingDays.length - officeDaysThisWeek;
      }

      // Apply global max_office_days cap
      if (maxOffice != null) {
        const remaining = maxOffice - totalOfficeDays;
        if (officeDaysThisWeek > remaining) {
          homeDaysThisWeek += officeDaysThisWeek - remaining;
          officeDaysThisWeek = Math.max(0, remaining);
        }
      }

      // Assign office days first (prefer start of week — Sun, Mon)
      for (let i = 0; i < workingDays.length; i++) {
        const d = workingDays[i];
        const iso = toIso(d);
        const schedType: ScheduleType = i < officeDaysThisWeek ? 'office' : 'home';
        entries.push({
          user_id: user.id,
          date: iso,
          schedule_type: schedType,
          notes: undefined,
          approved_by: undefined,
        });
        if (schedType === 'office') totalOfficeDays++;
        else totalHomeDays++;
      }

      // Avoid double-counting (holidayDays / unavailable already pushed above)
    }

    // Weekend duty entries
    for (const iso of dutyDates) {
      entries.push({
        user_id: user.id,
        date: iso,
        schedule_type: 'weekend_duty',
        notes: 'תורנות סופ"ש',
        approved_by: undefined,
      });
    }

    allEntries.push(...entries);

    monthSchedules.push({
      userId: user.id,
      year,
      month,
      entries: entries as ScheduleEntry[],
      officeDays: totalOfficeDays,
      homeDays: totalHomeDays,
      dutyWeekend: dutyAssignments.find((d) => d.userId === user.id)?.date,
    });
  }

  // Bulk insert all entries
  if (allEntries.length > 0) {
    bulkInsertSchedule(allEntries);
  }

  return monthSchedules;
}

// ── Summary helpers ───────────────────────────────────────────────────────────

export interface ScheduleSummary {
  userId: number;
  fullName?: string;
  year: number;
  month: number;
  officeDays: number;
  homeDays: number;
  holidayDays: number;
  vacationDays: number;
  sickDays: number;
  dutyDays: number;
  totalWorkdays: number;
}

/**
 * Returns a per-user summary for a given month.
 */
export function getMonthSummary(year: number, month: number): ScheduleSummary[] {
  const entries = getAllScheduleForMonth(year, month);

  const byUser: Map<number, ScheduleSummary & { fullName?: string }> = new Map();

  for (const entry of entries) {
    if (!byUser.has(entry.user_id)) {
      byUser.set(entry.user_id, {
        userId: entry.user_id,
        fullName: (entry as ScheduleEntry & { full_name?: string }).full_name,
        year,
        month,
        officeDays: 0,
        homeDays: 0,
        holidayDays: 0,
        vacationDays: 0,
        sickDays: 0,
        dutyDays: 0,
        totalWorkdays: 0,
      });
    }

    const s = byUser.get(entry.user_id)!;
    switch (entry.schedule_type) {
      case 'office':
        s.officeDays++;
        s.totalWorkdays++;
        break;
      case 'home':
        s.homeDays++;
        s.totalWorkdays++;
        break;
      case 'holiday':
        s.holidayDays++;
        break;
      case 'vacation':
        s.vacationDays++;
        break;
      case 'sick':
        s.sickDays++;
        break;
      case 'weekend_duty':
        s.dutyDays++;
        break;
    }
  }

  return Array.from(byUser.values());
}

/**
 * Returns statistics about office utilisation for a given month.
 */
export interface OfficeStat {
  date: string;
  officeCount: number;
  homeCount: number;
  totalEmployees: number;
}

export function getOfficeDayStats(year: number, month: number): OfficeStat[] {
  const rows = db
    .prepare(
      `SELECT
         date,
         SUM(CASE WHEN schedule_type = 'office' THEN 1 ELSE 0 END) AS officeCount,
         SUM(CASE WHEN schedule_type = 'home'   THEN 1 ELSE 0 END) AS homeCount,
         COUNT(DISTINCT user_id)                                    AS totalEmployees
       FROM schedule_entries
       WHERE date LIKE ?
       GROUP BY date
       ORDER BY date`
    )
    .all(`${year}-${String(month).padStart(2, '0')}%`) as OfficeStat[];
  return rows;
}

/**
 * Returns the upcoming weekend duty assignments.
 */
export function getUpcomingDuty(fromDate?: string): Array<DutyAssignment & { full_name: string }> {
  const from = fromDate ?? toIso(new Date());
  return db
    .prepare(
      `SELECT da.*, u.full_name
       FROM duty_assignments da
       JOIN users u ON u.id = da.user_id
       WHERE da.date >= ?
       ORDER BY da.date
       LIMIT 10`
    )
    .all(from) as Array<DutyAssignment & { full_name: string }>;
}

// re-export for convenience
export { getDutyAssignmentsForMonth, getHolidaysForMonth };
type DutyAssignment = import('@/types').DutyAssignment;
