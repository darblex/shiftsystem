export const dynamic = 'force-dynamic';
// ============================================================
// app/api/summary/route.ts — Monthly schedule summary
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAllActiveUsers, getAllShiftsForMonth } from '@/lib/db';
import type { ShiftType } from '@/types';

const SHIFT_LABEL: Record<ShiftType, string> = {
  morning: 'בוקר',
  afternoon: 'אחה"צ',
  night: 'לילה',
  duty: 'תורנות',
  weekend_duty: 'תורנות סופ"ש',
  day_off: 'חופש',
  sick: 'מחלה',
  vacation: 'חופשה',
  holiday: 'חג',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export const GET = requireAuth(async (req, { user }) => {
  if (user.role !== 'admin' && user.role !== 'manager') {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1));

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'פרמטרים לא תקינים' }, { status: 400 });
  }

  const users = getAllActiveUsers();
  const shifts = getAllShiftsForMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);

  // Per-employee summary
  const employeeSummaries = users.map(u => {
    const myShifts = shifts.filter(s => s.user_id === u.id);
    const counts: Partial<Record<ShiftType, number>> = {};
    for (const s of myShifts) {
      counts[s.shift_type] = (counts[s.shift_type] ?? 0) + 1;
    }
    const workingDays = myShifts.filter(s =>
      s.shift_type !== 'day_off' && s.shift_type !== 'vacation' && s.shift_type !== 'sick' && s.shift_type !== 'holiday'
    ).length;
    const offDays = daysInMonth - workingDays;

    return {
      id: u.id,
      full_name: u.full_name,
      department: u.department ?? null,
      counts,
      working_days: workingDays,
      off_days: offDays,
      total_shifts: myShifts.length,
    };
  });

  // Dept totals
  const deptMap: Record<string, { working: number; off: number; employees: number }> = {};
  for (const e of employeeSummaries) {
    const dept = e.department ?? 'ללא מחלקה';
    if (!deptMap[dept]) deptMap[dept] = { working: 0, off: 0, employees: 0 };
    deptMap[dept].working += e.working_days;
    deptMap[dept].off += e.off_days;
    deptMap[dept].employees += 1;
  }

  // Global shift type totals
  const globalCounts: Partial<Record<ShiftType, number>> = {};
  for (const s of shifts) {
    globalCounts[s.shift_type] = (globalCounts[s.shift_type] ?? 0) + 1;
  }

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

  return NextResponse.json({
    year,
    month,
    monthLabel,
    daysInMonth,
    totalEmployees: users.length,
    totalShiftEntries: shifts.length,
    globalCounts,
    shiftLabel: SHIFT_LABEL,
    employees: employeeSummaries,
    departments: deptMap,
  });
});
