'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Home, LogOut, Shield, TimerReset, Building2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import StatsCards from '@/components/StatsCards';
import ScheduleCalendar from '@/components/ScheduleCalendar';
import AttendancePanel from '@/components/AttendancePanel';
import ConstraintForm from '@/components/ConstraintForm';
import DutyCalendar from '@/components/DutyCalendar';

type User = {
  id: number;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  department?: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduleEntries, setScheduleEntries] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any>({ records: [], currentStatus: 'absent', todayRecord: null });
  const [dutyAssignments, setDutyAssignments] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [constraintRecord, setConstraintRecord] = useState<any>(null);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const authRes = await fetch('/api/auth', { credentials: 'include' });
      if (!authRes.ok) {
        router.push('/login');
        return;
      }
      const authJson = await authRes.json();
      const currentUser = authJson.user as User;
      setUser(currentUser);

      const [scheduleRes, attendanceRes, dutyRes, holidayRes, constraintsRes] = await Promise.all([
        fetch(`/api/schedule?year=${year}&month=${month}`, { credentials: 'include' }),
        fetch(`/api/attendance?year=${year}&month=${month}`, { credentials: 'include' }),
        fetch(`/api/duty?year=${year}&month=${month}`, { credentials: 'include' }),
        fetch(`/api/holidays?year=${year}&month=${month}`, { credentials: 'include' }),
        fetch(`/api/constraints?year=${year}&month=${month}`, { credentials: 'include' }),
      ]);

      const scheduleJson = await scheduleRes.json().catch(() => ({ entries: [] }));
      const attendanceJson = await attendanceRes.json().catch(() => ({ records: [], currentStatus: 'absent' }));
      const dutyJson = await dutyRes.json().catch(() => ({ assignments: [] }));
      const holidayJson = await holidayRes.json().catch(() => ({ holidays: [] }));
      const constraintsJson = await constraintsRes.json().catch(() => ({ constraint: null }));

      setScheduleEntries(scheduleJson.entries ?? []);
      setAttendanceData(attendanceJson);
      setDutyAssignments(dutyJson.assignments ?? []);
      setHolidays(holidayJson.holidays ?? []);
      setConstraintRecord(constraintsJson.constraint ?? null);
    } catch {
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, [month, router, year]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const scheduleDays = useMemo(() => {
    const holidayMap = new Map((holidays ?? []).map((h: any) => [h.date, h.name_he]));
    const base = (scheduleEntries ?? []).map((entry: any) => ({
      date: new Date(entry.date),
      status: entry.schedule_type === 'weekend_duty' ? 'weekend_duty' : entry.schedule_type,
      label: entry.schedule_type === 'holiday' ? holidayMap.get(entry.date) ?? 'חג' : undefined,
    }));
    return base;
  }, [holidays, scheduleEntries]);

  const dutyDays = useMemo(
    () =>
      (dutyAssignments ?? []).map((item: any) => ({
        date: new Date(item.date),
        employeeName: item.full_name,
        note: item.notes,
      })),
    [dutyAssignments]
  );

  const existingConstraints = useMemo(() => {
    const unavailable = constraintRecord?.unavailable_dates ? JSON.parse(constraintRecord.unavailable_dates) : [];
    return (unavailable as string[]).map((date) => ({
      date,
      preference: 'day_off' as const,
      reason: constraintRecord?.notes ?? '',
    }));
  }, [constraintRecord]);

  const stats = useMemo(() => {
    const officeDays = scheduleEntries.filter((e: any) => e.schedule_type === 'office').length;
    const homeDays = scheduleEntries.filter((e: any) => e.schedule_type === 'home').length;
    const dutyCount = dutyAssignments.length;
    const hours = Number(attendanceData?.summary?.totalHours ?? attendanceData?.records?.reduce?.((sum: number, r: any) => sum + Number(r.hours_worked ?? 0), 0) ?? 0);

    return [
      { id: 'office', title: 'ימי משרד החודש', value: officeDays, icon: Building2, gradient: 'from-blue-500 to-indigo-600' },
      { id: 'home', title: 'ימי בית החודש', value: homeDays, icon: Home, gradient: 'from-emerald-500 to-teal-600' },
      { id: 'duty', title: 'תורנויות', value: dutyCount, icon: Shield, gradient: 'from-rose-500 to-pink-600' },
      { id: 'hours', title: 'שעות נוכחות', value: hours.toFixed(1), icon: TimerReset, gradient: 'from-amber-500 to-orange-600' },
    ];
  }, [attendanceData, dutyAssignments.length, scheduleEntries]);

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE', credentials: 'include' });
    router.push('/login');
  }

  async function handleAttendanceAction() {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.ok) await loadData();
  }

  async function handleConstraintSubmit(entry: { date: string; preference: 'office' | 'home' | 'day_off' | 'no_preference'; reason?: string }) {
    const unavailable = new Set<string>(constraintRecord?.unavailable_dates ? JSON.parse(constraintRecord.unavailable_dates) : []);
    if (entry.preference === 'day_off') unavailable.add(entry.date);

    const prefMap: Record<string, string> = {
      home: 'prefer_home',
      office: 'prefer_office',
      day_off: constraintRecord?.preference ?? 'no_preference',
      no_preference: 'no_preference',
    };

    const res = await fetch('/api/constraints', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year,
        month,
        preference: prefMap[entry.preference],
        unavailableDates: Array.from(unavailable),
        notes: entry.reason ?? constraintRecord?.notes ?? null,
      }),
    });
    if (!res.ok) throw new Error('failed');
    await loadData();
  }

  async function handleConstraintDelete(date: string) {
    const unavailable = new Set<string>(constraintRecord?.unavailable_dates ? JSON.parse(constraintRecord.unavailable_dates) : []);
    unavailable.delete(date);
    await fetch('/api/constraints', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year,
        month,
        preference: constraintRecord?.preference ?? 'no_preference',
        unavailableDates: Array.from(unavailable),
        notes: constraintRecord?.notes ?? null,
      }),
    });
    await loadData();
  }

  if (loading) {
    return <div className="app-shell flex items-center justify-center text-slate-300">טוען דשבורד...</div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen md:flex bg-transparent">
      <Sidebar
        user={{ name: user.full_name, email: user.email, role: user.role }}
        isAdmin={user.role !== 'employee'}
        items={[
          { href: '/dashboard', label: 'דשבורד', icon: CalendarDays },
          ...(user.role !== 'employee' ? [{ href: '/admin', label: 'ניהול', icon: Shield }] : []),
        ]}
        onLogout={handleLogout}
      />

      <main className="app-shell flex-1 mobile-safe-bottom">
        <div className="page-grid">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="section-title">שלום {user.full_name.split(' ')[0]}</h1>
              <p className="section-subtitle">לוח עבודה אישי, נוכחות, אילוצים ותורנויות</p>
            </div>
            <button onClick={handleLogout} className="btn-secondary hidden sm:inline-flex">
              <LogOut className="h-4 w-4" /> התנתקות
            </button>
          </div>

          {error && <div className="data-card p-4 text-rose-300">{error}</div>}

          <StatsCards stats={stats} cols={4} />

          <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="data-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">לוח החודש</h2>
                  <p className="text-sm text-slate-400">2 ימים מהבית, 3 מהמשרד — עם חגים ותורנויות</p>
                </div>
              </div>
              <ScheduleCalendar schedule={scheduleDays as any} />
            </div>

            <div className="grid gap-4">
              <AttendancePanel
                status={attendanceData?.currentStatus ?? 'absent'}
                lastCheckIn={attendanceData?.todayRecord?.check_in}
                lastCheckOut={attendanceData?.todayRecord?.check_out}
                history={(attendanceData?.records ?? []).slice(0, 8).map((r: any) => ({
                  id: String(r.id),
                  date: r.date,
                  checkIn: r.check_in,
                  checkOut: r.check_out,
                  durationMinutes: Math.round(Number(r.hours_worked ?? 0) * 60),
                }))}
                onCheckIn={handleAttendanceAction}
                onCheckOut={handleAttendanceAction}
              />

              <div className="data-card p-4">
                <div className="mb-3">
                  <h2 className="text-lg font-semibold text-white">תורנויות</h2>
                  <p className="text-sm text-slate-400">תורנות חודשית לסופ"ש מלא</p>
                </div>
                <DutyCalendar dutyDays={dutyDays} currentUserName={user.full_name} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <ConstraintForm
              existingConstraints={existingConstraints}
              onSubmit={handleConstraintSubmit}
              onDelete={handleConstraintDelete}
            />

            <div className="data-card p-4">
              <div className="mb-3">
                <h2 className="text-lg font-semibold text-white">חגים החודש</h2>
                <p className="text-sm text-slate-400">ימים שמסומנים אוטומטית בלוח</p>
              </div>
              <div className="grid gap-2">
                {holidays.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">אין חגים בחודש הזה.</div>
                ) : (
                  holidays.map((holiday: any) => (
                    <div key={`${holiday.date}-${holiday.name_en}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium text-white">{holiday.name_he}</div>
                          <div className="text-sm text-slate-400">{holiday.name_en}</div>
                        </div>
                        <span className="badge-soft">{holiday.date}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="md:hidden">
        <MobileNav isAdmin={user.role !== 'employee'} items={[
          { href: '/dashboard', label: 'בית', icon: CalendarDays },
          ...(user.role !== 'employee' ? [{ href: '/admin', label: 'ניהול', icon: Shield }] : []),
        ]} />
      </div>
    </div>
  );
}
