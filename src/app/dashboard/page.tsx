'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users,
  CalendarRange,
  ShieldCheck,
  Sunrise,
  Sun,
  Moon,
  ChevronLeft,
  LogOut,
  Loader2,
  CalendarDays,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

interface CurrentUser {
  id: number;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  department?: string;
}

interface ShiftEntry {
  user_id: number;
  date: string;
  schedule_type: string;
  notes?: string;
}

interface DutyAssignment {
  id: number;
  user_id: number;
  date: string;
  duty_type: string;
  full_name?: string;
}

interface Employee {
  id: number;
  full_name: string;
  department?: string;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="data-card p-5 flex items-center gap-4"
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}>
        <Icon className="w-6 h-6" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
      </div>
    </motion.div>
  );
}

// ─── Shift Group ─────────────────────────────────────────────────────────────

function TodayShiftGroup({
  icon: Icon,
  label,
  color,
  employees,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  employees: string[];
}) {
  if (employees.length === 0) return null;
  return (
    <div className="rounded-2xl p-4" style={{ background: `${color}0d`, border: `1px solid ${color}25` }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-sm font-semibold" style={{ color }}>{label}</span>
        <span className="badge-soft text-xs">{employees.length}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {employees.map((name) => (
          <span key={name} className="text-xs px-2.5 py-1 rounded-full text-white font-medium" style={{ background: `${color}20` }}>
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const todayIso = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedule, setSchedule] = useState<ShiftEntry[]>([]);
  const [duties, setDuties] = useState<DutyAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth', { credentials: 'include' });
      if (!authRes.ok) { router.push('/login'); return; }
      const authJson = await authRes.json();
      setUser(authJson.user);

      const [empRes, schedRes, dutyRes] = await Promise.all([
        fetch('/api/employees', { credentials: 'include' }),
        fetch(`/api/schedule?year=${year}&month=${month}`, { credentials: 'include' }),
        fetch(`/api/duty?year=${year}&month=${month}`, { credentials: 'include' }),
      ]);

      const empJson = await empRes.json().catch(() => ({ employees: [] }));
      const schedJson = await schedRes.json().catch(() => ({ schedule: [], entries: [] }));
      const dutyJson = await dutyRes.json().catch(() => ({ assignments: [] }));

      setEmployees(empJson.employees ?? []);

      if (schedJson.schedule) {
        const flat: ShiftEntry[] = [];
        for (const row of schedJson.schedule) flat.push(...(row.entries ?? []));
        setSchedule(flat);
      } else {
        setSchedule(schedJson.entries ?? []);
      }

      setDuties(dutyJson.assignments ?? []);
    } finally {
      setLoading(false);
    }
  }, [year, month, router]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE', credentials: 'include' });
    router.push('/login');
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const totalShifts = useMemo(
    () => schedule.filter((e) => e.schedule_type !== 'day_off').length,
    [schedule]
  );
  const totalDuties = duties.length;

  // ── Today's shifts ───────────────────────────────────────────────────────────
  const todayShifts = useMemo(() => {
    const empMap = new Map(employees.map((e) => [e.id, e.full_name]));
    const morning: string[] = [];
    const afternoon: string[] = [];
    const night: string[] = [];

    for (const entry of schedule) {
      if (entry.date !== todayIso) continue;
      const name = empMap.get(entry.user_id) ?? 'עובד';
      if (entry.schedule_type === 'office') morning.push(name);
      else if (entry.schedule_type === 'home') afternoon.push(name);
      else if (entry.schedule_type === 'night') night.push(name);
    }
    return { morning, afternoon, night };
  }, [schedule, employees, todayIso]);

  // ── Upcoming duties (next 7 days) ─────────────────────────────────────────
  const upcomingDuties = useMemo(() => {
    const cutoff = new Date(now.getTime() + 7 * 86400000);
    return duties
      .filter((d) => {
        const dd = new Date(d.date + 'T00:00:00');
        return dd >= now && dd <= cutoff;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [duties, now]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--muted)' }} />
      </div>
    );
  }
  if (!user) return null;

  const isAdmin = user.role !== 'employee';

  return (
    <div className="min-h-screen md:flex" dir="rtl">
      <Sidebar
        user={{ name: user.full_name, email: user.email, role: user.role }}
        isAdmin={isAdmin}
        onLogout={handleLogout}
      />

      <main className="flex-1 app-shell mobile-safe-bottom">
        <div className="page-grid">

          {/* Header */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start justify-between gap-4">
            <div>
              <h1 className="section-title">שלום, {user.full_name.split(' ')[0]} 👋</h1>
              <p className="section-subtitle">
                {now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <button onClick={handleLogout} className="btn-secondary hidden sm:inline-flex">
              <LogOut className="w-4 h-4" /> יציאה
            </button>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Users}        label="עובדים פעילים" value={employees.length} accent="#3b82f6" delay={0.05} />
            <StatCard icon={CalendarRange} label="משמרות החודש"  value={totalShifts}      accent="#f59e0b" delay={0.10} />
            <StatCard icon={ShieldCheck}  label="תורנויות"      value={totalDuties}      accent="#ef4444" delay={0.15} />
            <StatCard icon={CalendarDays} label="ימים בחודש"    value={new Date(year, month, 0).getDate()} accent="#a855f7" delay={0.20} />
          </div>

          {/* Today + Upcoming */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Today's shifts */}
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="data-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white">כוח אדם היום</h2>
                <span className="badge-soft">{todayIso}</span>
              </div>
              <div className="flex flex-col gap-3">
                <TodayShiftGroup icon={Sunrise} label="בוקר 07:00–15:00" color="#f59e0b" employees={todayShifts.morning} />
                <TodayShiftGroup icon={Sun}     label="אחהצ 13:00–21:00" color="#3b82f6" employees={todayShifts.afternoon} />
                <TodayShiftGroup icon={Moon}    label="לילה 21:00–07:00" color="#a855f7" employees={todayShifts.night} />
                {!todayShifts.morning.length && !todayShifts.afternoon.length && !todayShifts.night.length && (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>אין משמרות מוגדרות להיום</p>
                )}
              </div>
            </motion.div>

            {/* Upcoming duties */}
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="data-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white">תורנויות קרובות</h2>
                <Link href="/duty" className="text-xs text-blue-400 hover:underline">הצג הכל</Link>
              </div>
              <div className="flex flex-col gap-2">
                {upcomingDuties.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>אין תורנויות ב-7 הימים הקרובים</p>
                ) : (
                  upcomingDuties.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 rounded-xl px-4 py-3"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <ShieldCheck className="w-4 h-4 shrink-0 text-red-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{d.full_name ?? 'עובד'}</p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
                          {new Date(d.date + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                        {d.duty_type === 'weekend' ? 'סופ״ש' : 'כוננות'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* Quick actions */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-3">
            <Link href="/schedule" className="btn-primary">
              <CalendarRange className="w-4 h-4" />
              לוח משמרות
            </Link>
            <Link href="/duty" className="btn-secondary">
              <ShieldCheck className="w-4 h-4" />
              תורנויות
            </Link>
            {isAdmin && (
              <Link href="/admin" className="btn-secondary">
                <Users className="w-4 h-4" />
                ניהול עובדים
              </Link>
            )}
          </motion.div>

        </div>
      </main>
    </div>
  );
}
