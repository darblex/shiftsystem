'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Clock,
  LogIn,
  LogOut,
  Loader2,
  CalendarDays,
  Timer,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import type { AttendanceRecord } from '@/types';

interface CurrentUser {
  id: number;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
}

function formatTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(minutes?: number): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}ש' ${m}ד'` : `${m}ד'`;
}

function todayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateHe(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' });
}

function totalHoursForMonth(records: AttendanceRecord[]): string {
  const total = records.reduce((acc, r) => acc + (r.duration_minutes ?? 0), 0);
  if (!total) return '0ש\'';
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0 ? `${h}ש' ${m}ד'` : `${h}ש'`;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusDot({ clocked }: { clocked: boolean }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full ml-2"
      style={{ background: clocked ? '#34d399' : 'var(--muted)' }}
    />
  );
}

// ─── Clock Card ───────────────────────────────────────────────────────────────

function ClockCard({
  today,
  user,
  onAction,
}: {
  today: AttendanceRecord | null;
  user: CurrentUser;
  onAction: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isClockedIn = Boolean(today?.clock_in && !today?.clock_out);
  const isDone = Boolean(today?.clock_out);

  async function handleClick() {
    setBusy(true);
    setError(null);
    const action = isClockedIn ? 'clock_out' : 'clock_in';
    const res = await fetch('/api/attendance', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (!res.ok) setError(json.error ?? 'שגיאה');
    else onAction();
    setBusy(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="data-card p-6 flex flex-col gap-4"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
        >
          <Clock className="w-6 h-6" style={{ color: '#818cf8' }} />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
            נוכחות היום
          </p>
          <p className="text-xl font-bold text-white flex items-center">
            <StatusDot clocked={isClockedIn} />
            {isDone ? 'יום הסתיים' : isClockedIn ? 'נוכח/ת' : 'לא צ\'קין'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>כניסה</p>
          <p className="text-sm font-semibold text-white">{formatTime(today?.clock_in)}</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>יציאה</p>
          <p className="text-sm font-semibold text-white">{formatTime(today?.clock_out)}</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>סה"כ</p>
          <p className="text-sm font-semibold text-white">{formatDuration(today?.duration_minutes)}</p>
        </div>
      </div>

      {!isDone && (
        <button
          onClick={handleClick}
          disabled={busy}
          className="btn-primary flex items-center justify-center gap-2 w-full"
          style={
            isClockedIn
              ? { background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }
              : undefined
          }
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isClockedIn ? (
            <>
              <LogOut className="w-4 h-4" />
              <span>צ'ק-אאוט</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>צ'ק-אין</span>
            </>
          )}
        </button>
      )}

      {error && (
        <p className="text-sm text-center" style={{ color: '#f87171' }}>
          {error}
        </p>
      )}
    </motion.div>
  );
}

// ─── Record Row ───────────────────────────────────────────────────────────────

function RecordRow({ record, showName }: { record: AttendanceRecord; showName: boolean }) {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      <div className="text-sm font-medium text-white min-w-[90px]">{formatDateHe(record.date)}</div>
      {showName && (
        <div className="text-sm min-w-[100px] truncate" style={{ color: 'var(--muted)' }}>
          {record.full_name ?? '—'}
        </div>
      )}
      <div className="text-sm text-emerald-400 min-w-[52px]">{formatTime(record.clock_in)}</div>
      <div className="text-sm min-w-[52px]" style={{ color: record.clock_out ? '#fbbf24' : 'var(--muted)' }}>
        {formatTime(record.clock_out)}
      </div>
      <div className="mr-auto text-sm font-semibold" style={{ color: '#818cf8' }}>
        {formatDuration(record.duration_minutes)}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [today, setToday] = useState<AttendanceRecord | null>(null);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const loadUser = useCallback(async () => {
    const res = await fetch('/api/auth', { credentials: 'include' });
    if (!res.ok) { router.push('/login'); return; }
    const json = await res.json();
    setUser(json.user);
  }, [router]);

  const loadRecords = useCallback(async (yr: number, mo: number) => {
    const res = await fetch(`/api/attendance?year=${yr}&month=${mo}`, { credentials: 'include' });
    if (!res.ok) return;
    const json = await res.json();
    const all: AttendanceRecord[] = json.records ?? [];
    setRecords(all);
    const td = todayDate();
    setToday(all.find((r) => r.date === td && !r.full_name) ?? null);
  }, []);

  const loadSelfToday = useCallback(async () => {
    const td = todayDate();
    const res = await fetch(`/api/attendance?year=${now.getFullYear()}&month=${now.getMonth() + 1}`, {
      credentials: 'include',
    });
    if (!res.ok) return;
    const json = await res.json();
    const all: AttendanceRecord[] = json.records ?? [];
    setRecords(all);
    setToday(all.find((r) => r.date === td) ?? null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void (async () => {
      await loadUser();
      setLoading(false);
    })();
  }, [loadUser]);

  useEffect(() => {
    if (user) void loadRecords(year, month);
  }, [user, year, month, loadRecords]);

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE', credentials: 'include' });
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--muted)' }} />
      </div>
    );
  }
  if (!user) return null;

  const isAdmin = user.role !== 'employee';
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('he-IL', {
    month: 'long',
    year: 'numeric',
  });

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const selfRecords = isAdmin ? records : records;
  const daysPresent = records.filter((r) => r.clock_out).length;

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
              >
                <Clock className="w-5 h-5" style={{ color: '#818cf8' }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">נוכחות</h1>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {isAdmin ? 'כל העובדים' : 'הנוכחות שלי'}
                </p>
              </div>
            </div>

            {/* Month nav */}
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
                style={{ color: 'var(--muted)' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-white min-w-[110px] text-center">{monthLabel}</span>
              <button
                onClick={nextMonth}
                disabled={isCurrentMonth}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10 disabled:opacity-30"
                style={{ color: 'var(--muted)' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stat row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="data-card p-4 flex items-center gap-3"
            >
              <CalendarDays className="w-5 h-5 shrink-0" style={{ color: '#34d399' }} />
              <div>
                <p className="text-xl font-bold text-white">{daysPresent}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>ימי נוכחות</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="data-card p-4 flex items-center gap-3"
            >
              <Timer className="w-5 h-5 shrink-0" style={{ color: '#818cf8' }} />
              <div>
                <p className="text-xl font-bold text-white">{totalHoursForMonth(isAdmin ? records : records)}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>שעות החודש</p>
              </div>
            </motion.div>
            {isAdmin && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="data-card p-4 flex items-center gap-3"
              >
                <Users className="w-5 h-5 shrink-0" style={{ color: '#fbbf24' }} />
                <div>
                  <p className="text-xl font-bold text-white">
                    {new Set(records.map((r) => r.user_id)).size}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>עובדים פעילים</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Clock card — only for current month */}
          {isCurrentMonth && !isAdmin && (
            <ClockCard
              today={today}
              user={user}
              onAction={loadSelfToday}
            />
          )}

          {/* Records list */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="data-card p-5"
          >
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" style={{ color: 'var(--muted)' }} />
              רישומי נוכחות — {monthLabel}
            </h2>

            {records.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--muted)' }}>
                אין רשומות לחודש זה
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Column headers */}
                <div
                  className="flex items-center gap-4 px-4 py-2 text-xs font-medium"
                  style={{ color: 'var(--muted)' }}
                >
                  <span className="min-w-[90px]">תאריך</span>
                  {isAdmin && <span className="min-w-[100px]">עובד</span>}
                  <span className="min-w-[52px]">כניסה</span>
                  <span className="min-w-[52px]">יציאה</span>
                  <span className="mr-auto">משך</span>
                </div>
                {records.map((r) => (
                  <RecordRow key={r.id} record={r} showName={isAdmin} />
                ))}
              </div>
            )}
          </motion.div>

        </div>
      </main>
    </div>
  );
}
