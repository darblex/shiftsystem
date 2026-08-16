import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

export const GET = requireAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()), 10);
  const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1), 10);
  const prefix = `${year}-${String(month).padStart(2, '0')}`;

  // shifts per employee
  const shiftsPerEmployee = db.prepare(`
    SELECT
      u.id AS user_id,
      u.full_name,
      COUNT(*) AS total,
      SUM(CASE WHEN s.shift_type = 'morning' THEN 1 ELSE 0 END) AS morning,
      SUM(CASE WHEN s.shift_type = 'afternoon' THEN 1 ELSE 0 END) AS afternoon,
      SUM(CASE WHEN s.shift_type = 'night' THEN 1 ELSE 0 END) AS night,
      SUM(CASE WHEN s.shift_type = 'day_off' THEN 1 ELSE 0 END) AS day_off,
      SUM(CASE WHEN s.shift_type = 'sick' THEN 1 ELSE 0 END) AS sick,
      SUM(CASE WHEN s.shift_type = 'vacation' THEN 1 ELSE 0 END) AS vacation,
      SUM(CASE WHEN s.shift_type = 'holiday' THEN 1 ELSE 0 END) AS holiday
    FROM shifts s
    JOIN users u ON u.id = s.user_id
    WHERE s.date LIKE ? AND u.active = 1
    GROUP BY u.id, u.full_name
    ORDER BY total DESC
  `).all(`${prefix}%`) as Array<{
    user_id: number; full_name: string; total: number;
    morning: number; afternoon: number; night: number;
    day_off: number; sick: number; vacation: number; holiday: number;
  }>;

  // shift type distribution
  const distRows = db.prepare(`
    SELECT shift_type, COUNT(*) AS cnt
    FROM shifts
    WHERE date LIKE ?
    GROUP BY shift_type
  `).all(`${prefix}%`) as Array<{ shift_type: string; cnt: number }>;

  const shiftTypeDistribution: Record<string, number> = {};
  for (const row of distRows) {
    shiftTypeDistribution[row.shift_type] = row.cnt;
  }

  // attendance summary
  const attendanceSummary = db.prepare(`
    SELECT
      u.id AS user_id,
      u.full_name,
      COUNT(*) AS totalClockIns,
      ROUND(AVG(CASE WHEN a.duration_minutes IS NOT NULL THEN a.duration_minutes ELSE NULL END)) AS avgDurationMinutes
    FROM attendance_records a
    JOIN users u ON u.id = a.user_id
    WHERE a.date LIKE ? AND u.active = 1
    GROUP BY u.id, u.full_name
    ORDER BY totalClockIns DESC
  `).all(`${prefix}%`) as Array<{
    user_id: number; full_name: string; totalClockIns: number; avgDurationMinutes: number | null;
  }>;

  // top 5 workers
  const topWorkers = shiftsPerEmployee.slice(0, 5);

  return NextResponse.json({
    year,
    month,
    shiftsPerEmployee,
    shiftTypeDistribution,
    attendanceSummary,
    topWorkers,
  });
}, ['admin', 'manager']);
