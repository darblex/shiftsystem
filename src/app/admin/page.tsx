'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, LogOut, RefreshCcw, Shield, Users, UserPlus } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import StatsCards from '@/components/StatsCards';
import EmployeeList from '@/components/EmployeeList';
import ScheduleCalendar from '@/components/ScheduleCalendar';

type User = {
  id: number;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
};

export default function AdminPage() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [user, setUser] = useState<User | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [constraints, setConstraints] = useState<any[]>([]);
  const [form, setForm] = useState({ username: '', email: '', full_name: '', password: '', role: 'employee' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      if (authJson.user.role === 'employee') {
        router.push('/dashboard');
        return;
      }
      setUser(authJson.user);

      const [employeesRes, scheduleRes, constraintsRes] = await Promise.all([
        fetch('/api/employees', { credentials: 'include' }),
        fetch(`/api/schedule?year=${year}&month=${month}`, { credentials: 'include' }),
        fetch(`/api/constraints`, { credentials: 'include' }),
      ]);

      const employeesJson = await employeesRes.json().catch(() => ({ employees: [] }));
      const scheduleJson = await scheduleRes.json().catch(() => ({ schedule: [] }));
      const constraintsJson = await constraintsRes.json().catch(() => ({ constraints: [] }));

      setEmployees(employeesJson.employees ?? []);
      setSchedule(scheduleJson.schedule ?? []);
      setConstraints(constraintsJson.constraints ?? []);
    } catch {
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, [month, router, year]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const totalEmployees = employees.filter((e) => e.active).length;
    const totalScheduleEntries = schedule.reduce((sum, group) => sum + (group.entries?.length ?? 0), 0);
    return [
      { id: 'employees', title: 'עובדים פעילים', value: totalEmployees, icon: Users, gradient: 'from-blue-500 to-indigo-600' },
      { id: 'constraints', title: 'אילוצים במערכת', value: constraints.length, icon: Shield, gradient: 'from-amber-500 to-orange-600' },
      { id: 'entries', title: 'רשומות משמרת', value: totalScheduleEntries, icon: CalendarDays, gradient: 'from-rose-500 to-pink-600' },
    ];
  }, [constraints.length, employees, schedule]);

  const mergedCalendar = useMemo(() => {
    const flat = schedule.flatMap((group: any) => group.entries ?? []);
    const officeMap = new Map<string, number>();
    for (const entry of flat) {
      if (!officeMap.has(entry.date)) officeMap.set(entry.date, 0);
      if (entry.shift_type === 'morning' || entry.shift_type === 'afternoon' || entry.shift_type === 'night') officeMap.set(entry.date, officeMap.get(entry.date)! + 1);
    }
    return Array.from(officeMap.entries()).map(([date, count]) => ({
      date: new Date(date),
      status: count > 0 ? 'office' : 'home',
      label: `${count} במשרד`,
    }));
  }, [schedule]);

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE', credentials: 'include' });
    router.push('/login');
  }

  async function handleGenerateSchedule() {
    setBusy(true);
    setSuccess('');
    setError('');
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, overwrite: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'שגיאה ביצירת לוח');
      setSuccess('לוח הזמנים נוצר בהצלחה');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'שגיאה ביצירת לוח');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateEmployee(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSuccess('');
    setError('');
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'שגיאה בהוספת עובד');
      setForm({ username: '', email: '', full_name: '', password: '', role: 'employee' });
      setSuccess('העובד נוסף בהצלחה');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'שגיאה בהוספת עובד');
    } finally {
      setBusy(false);
    }
  }

  async function deactivateEmployee(emp: any) {
    await fetch(`/api/employees?id=${emp.id}`, { method: 'DELETE', credentials: 'include' });
    await loadData();
  }

  if (loading) {
    return <div className="app-shell flex items-center justify-center text-slate-300">טוען ניהול...</div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen md:flex">
      <Sidebar
        user={{ name: user.full_name, email: user.email, role: user.role }}
        isAdmin
        items={[
          { href: '/admin', label: 'ניהול', icon: Shield },
          { href: '/dashboard', label: 'עובד', icon: CalendarDays },
        ]}
        onLogout={handleLogout}
      />

      <main className="app-shell flex-1 mobile-safe-bottom">
        <div className="page-grid">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="section-title">פאנל ניהול</h1>
              <p className="section-subtitle">ניהול עובדים, לוחות, נוכחות ואילוצים</p>
            </div>
            <div className="flex gap-2">
              <button onClick={loadData} className="btn-secondary"><RefreshCcw className="h-4 w-4" /> רענן</button>
              <button onClick={handleLogout} className="btn-secondary hidden sm:inline-flex"><LogOut className="h-4 w-4" /> התנתקות</button>
            </div>
          </div>

          {error && <div className="data-card p-4 text-rose-300">{error}</div>}
          {success && <div className="data-card p-4 text-emerald-300">{success}</div>}

          <StatsCards stats={stats} cols={3} />

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="data-card p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">לוח צוות חודשי</h2>
                  <p className="text-sm text-slate-400">תצוגת צפיפות משרד לכל יום</p>
                </div>
                <div className="flex gap-2">
                  <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-dark w-28" />
                  <input type="number" value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input-dark w-24" min={1} max={12} />
                  <button onClick={handleGenerateSchedule} disabled={busy} className="btn-primary"><CalendarDays className="h-4 w-4" /> צור לוח</button>
                </div>
              </div>
              <ScheduleCalendar schedule={mergedCalendar as any} />
            </div>

            <div className="data-card p-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">הוספת עובד</h2>
                <p className="text-sm text-slate-400">יצירת משתמש חדש עם גישת עובד/מנהל</p>
              </div>
              <form onSubmit={handleCreateEmployee} className="grid gap-3">
                <input className="input-dark" placeholder="שם מלא" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                <input className="input-dark" placeholder="שם משתמש" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                <input className="input-dark" placeholder="אימייל" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <input className="input-dark" placeholder="סיסמה" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <select className="select-dark" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="employee">עובד</option>
                  <option value="manager">מנהל</option>
                  <option value="admin">אדמין</option>
                </select>
                <button type="submit" disabled={busy} className="btn-primary"><UserPlus className="h-4 w-4" /> הוסף עובד</button>
              </form>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <div className="data-card p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">רשימת עובדים</h2>
                  <p className="text-sm text-slate-400">ניהול, השבתה והצגת סטטוס</p>
                </div>
              </div>
              <EmployeeList
                employees={employees.map((e) => ({
                  id: String(e.id),
                  name: e.full_name,
                  email: e.email,
                  role: e.role,
                  status: e.active ? 'active' : 'inactive',
                  department: e.department,
                }))}
                isAdmin
                onDeactivate={deactivateEmployee}
              />
            </div>


          </div>
        </div>
      </main>

      <div className="md:hidden">
        <MobileNav isAdmin items={[
          { href: '/admin', label: 'ניהול', icon: Shield },
          { href: '/dashboard', label: 'עובד', icon: CalendarDays },
        ]} />
      </div>
    </div>
  );
}
