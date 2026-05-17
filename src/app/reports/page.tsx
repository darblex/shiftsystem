'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BarChart2, ChevronRight, ChevronLeft, Loader2, Users, CalendarRange, Trophy, Clock, LogOut, ArrowRight } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

interface ShiftsPerEmployee {
  user_id: number;
  full_name: string;
  total: number;
  morning: number;
  afternoon: number;
  night: number;
  day_off: number;
  sick: number;
  vacation: number;
  holiday: number;
}

interface AttendanceSummary {
  user_id: number;
  full_name: string;
  totalClockIns: number;
  avgDurationMinutes: number | null;
}

interface ReportsData {
  year: number;
  month: number;
  shiftsPerEmployee: ShiftsPerEmployee[];
  shiftTypeDistribution: Record<string, number>;
  attendanceSummary: AttendanceSummary[];
  topWorkers: ShiftsPerEmployee[];
}

interface CurrentUser {
  id: number;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
}

function StatCard({ icon: Icon, label, value, accent, delay }: {
  icon: React.ElementType; label: string; value: string | number; accent: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="data-card p-5 flex items-center gap-4"
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}>
        <Icon className="w-6 h-6" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
      </div>
    </motion.div>
  );
}

const SHIFT_COLORS: Record<string, string> = {
  morning: '#f59e0b',
  afternoon: '#3b82f6',
  night: '#a855f7',
  day_off: '#6b7280',
  sick: '#ef4444',
  vacation: '#10b981',
  holiday: '#ec4899',
  duty: '#f97316',
  weekend_duty: '#fb923c',
};

const SHIFT_LABELS: Record<string, string> = {
  morning: 'בוקר',
  afternoon: 'אחה"צ',
  night: 'לילה',
  day_off: 'יום חופש',
  sick: 'מחלה',
  vacation: 'חופשה',
  holiday: 'חג',
  duty: 'כוננות',
  weekend_duty: 'כוננות סופ"ש',
};

export default function ReportsPage() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth', { credentials: 'include' });
      if (!authRes.ok) { router.push('/login'); return; }
      const authJson = await authRes.json();
      setUser(authJson.user);

      const res = await fetch(`/api/reports?year=${year}&month=${month}`, { credentials: 'include' });
      if (res.ok) {
        setData(await res.json());
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [year, month, router]);

  useEffect(() => { void loadData(); }, [loadData]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); } else { setMonth(m => m - 1); }
  }
  function nextMonthFn() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); } else { setMonth(m => m + 1); }
  }

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE', credentials: 'include' });
    router.push('/login');
  }

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--muted)' }} />
      </div>
    );
  }
  if (!user) return null;

  const isAdmin = user.role !== 'employee';
  const totalShifts = data?.shiftsPerEmployee.reduce((s, e) => s + e.total, 0) ?? 0;
  const totalEmployees = data?.shiftsPerEmployee.length ?? 0;
  const topWorker = data?.topWorkers[0]?.full_name ?? '—';
  const totalAttendanceHours = Math.round(
    (data?.attendanceSummary.reduce((s, a) => s + (a.avgDurationMinutes ?? 0) * a.totalClockIns, 0) ?? 0) / 60
  );

  const maxShifts = Math.max(...(data?.shiftsPerEmployee.map(e => e.total) ?? [1]), 1);
  const distTotal = Object.values(data?.shiftTypeDistribution ?? {}).reduce((s, v) => s + v, 0) || 1;

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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                <BarChart2 className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h1 className="section-title">דוחות וסטטיסטיקות</h1>
                <p className="section-subtitle">ניתוח משמרות ונוכחות</p>
              </div>
            </div>

            {/* Month nav */}
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/dashboard')} className="btn-secondary hidden sm:inline-flex">
                <ArrowRight className="w-4 h-4" /> חזור
              </button>
              <button onClick={handleLogout} className="btn-secondary hidden sm:inline-flex">
                <LogOut className="w-4 h-4" /> יציאה
              </button>
              <button onClick={prevMonth} className="btn-secondary p-2"><ChevronRight className="w-4 h-4" /></button>
              <span className="text-sm font-semibold text-white min-w-[120px] text-center">{monthLabel}</span>
              <button onClick={nextMonthFn} className="btn-secondary p-2"><ChevronLeft className="w-4 h-4" /></button>
            </div>
          </motion.div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={CalendarRange} label="סה״כ משמרות"      value={totalShifts}        accent="#3b82f6" delay={0.05} />
            <StatCard icon={Users}         label="עובדים פעילים"     value={totalEmployees}     accent="#a855f7" delay={0.10} />
            <StatCard icon={Trophy}        label="עובד מוביל"        value={topWorker}          accent="#f59e0b" delay={0.15} />
            <StatCard icon={Clock}         label="שעות נוכחות כוללות" value={totalAttendanceHours} accent="#10b981" delay={0.20} />
          </div>

          {/* Shift type distribution */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="data-card p-5">
            <h2 className="text-base font-semibold text-white mb-4">חלוקת משמרות לפי סוג</h2>
            <div className="flex flex-col gap-3">
              {Object.entries(data?.shiftTypeDistribution ?? {}).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                const pct = Math.round((count / distTotal) * 100);
                const color = SHIFT_COLORS[type] ?? '#6b7280';
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-sm w-24 shrink-0 text-right" style={{ color: 'var(--muted)' }}>{SHIFT_LABELS[type] ?? type}</span>
                    <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <span className="text-xs font-mono w-12 text-left shrink-0" style={{ color: 'var(--muted)' }}>{count} ({pct}%)</span>
                  </div>
                );
              })}
              {Object.keys(data?.shiftTypeDistribution ?? {}).length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>אין נתונים לחודש זה</p>
              )}
            </div>
          </motion.div>

          {/* Workers ranked list */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="data-card p-5">
            <h2 className="text-base font-semibold text-white mb-4">עובדים לפי כמות משמרות</h2>
            <div className="flex flex-col gap-3">
              {(data?.shiftsPerEmployee ?? []).map((emp, i) => (
                <div key={emp.user_id} className="flex items-center gap-3">
                  <span className="text-xs font-bold w-5 text-center shrink-0" style={{ color: i < 3 ? '#f59e0b' : 'var(--muted)' }}>{i + 1}</span>
                  <span className="text-sm font-medium text-white w-32 shrink-0 truncate">{emp.full_name}</span>
                  <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.round((emp.total / maxShifts) * 100)}%`, background: '#3b82f6' }}
                    />
                  </div>
                  <span className="text-xs font-mono w-8 text-left shrink-0 text-white">{emp.total}</span>
                </div>
              ))}
              {(data?.shiftsPerEmployee ?? []).length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>אין נתונים לחודש זה</p>
              )}
            </div>
          </motion.div>

          {/* Attendance summary */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="data-card p-5 overflow-x-auto">
            <h2 className="text-base font-semibold text-white mb-4">נוכחות חודשית</h2>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="py-2 px-3 text-right font-medium" style={{ color: 'var(--muted)' }}>עובד</th>
                  <th className="py-2 px-3 text-center font-medium" style={{ color: 'var(--muted)' }}>כניסות</th>
                  <th className="py-2 px-3 text-center font-medium" style={{ color: 'var(--muted)' }}>ממוצע שעות</th>
                </tr>
              </thead>
              <tbody>
                {(data?.attendanceSummary ?? []).map((a) => (
                  <tr key={a.user_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="py-2 px-3 text-white">{a.full_name}</td>
                    <td className="py-2 px-3 text-center" style={{ color: 'var(--muted)' }}>{a.totalClockIns}</td>
                    <td className="py-2 px-3 text-center" style={{ color: 'var(--muted)' }}>
                      {a.avgDurationMinutes != null ? `${Math.round(a.avgDurationMinutes / 60 * 10) / 10}h` : '—'}
                    </td>
                  </tr>
                ))}
                {(data?.attendanceSummary ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-sm" style={{ color: 'var(--muted)' }}>אין נתוני נוכחות לחודש זה</td>
                  </tr>
                )}
              </tbody>
            </table>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
