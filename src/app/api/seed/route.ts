export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db, getAllActiveUsers } from '@/lib/db';

export async function GET() {
  const counts = {
    users: (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c,
    schedule_entries: (db.prepare('SELECT COUNT(*) as c FROM schedule_entries').get() as any).c,
    constraints: (db.prepare('SELECT COUNT(*) as c FROM constraints').get() as any).c,
    holidays: (db.prepare('SELECT COUNT(*) as c FROM holidays').get() as any).c,
    duty_assignments: (db.prepare('SELECT COUNT(*) as c FROM duty_assignments').get() as any).c,
    attendance: (db.prepare('SELECT COUNT(*) as c FROM attendance').get() as any).c,
  };

  return NextResponse.json({
    seeded: counts.users > 0,
    counts,
    demoUsers: [
      { username: 'admin', password: 'admin' },
      { username: 'yossi', password: 'employee1' },
      { username: 'michal', password: 'employee2' },
      { username: 'avi', password: 'manager1' },
    ],
  });
}

export const POST = requireAuth(async (_req, { user }) => {
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }

  const users = getAllActiveUsers();
  return NextResponse.json({
    success: true,
    message: 'המערכת כבר מאותחלת אוטומטית בעת עלייה',
    usersCount: users.length,
  });
});
