'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Plus, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface Employee {
  id: number;
  full_name: string;
  department?: string;
}

interface DutyAssignment {
  id: number;
  employee_id: number;
  date: string;
  duty_type: 'regular' | 'weekend' | 'holiday';
  employee_name?: string;
  notes?: string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getDayOfWeek(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay();
}

function padDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
}

const HE_WEEKDAYS_SHORT = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

// ─── Add Duty Modal ───────────────────────────────────────────────────────────

interface AddDutyModalProps {
  open: boolean;
  date: string;
  employees: Employee[];
  onSave: (userId: number, dutyType: 'weekend' | 'regular', notes: string) => Promise<void>;
  onClose: () => void;
}

function AddDutyModal({ open, date, employees, onSave, onClose }: AddDutyModalProps) {
  const [userId, setUserId] = useState('');
  const [dutyType, setDutyType] = useState<'weekend' | 'regular'>('weekend');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!userId) return;
    setLoading(true);
    try {
      await onSave(Number(userId), dutyType, notes);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed inset-x-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 md:w-full md:max-w-sm"
            dir="rtl"
          >
            <div className="data-card p-6 rounded-3xl">
              <div className="flex items-start justify-between mb-5">
                <h2 className="text-lg font-bold text-white">הוסף תורנות</h2>
                <button onClick={onClose} className="p-1.5 rounded-xl" style={{ color: 'var(--muted)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm mb-4 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted)' }}>
                {new Date(date + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="flex flex-col gap-4 mb-5">
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">עובד</label>
                  <select value={userId} onChange={(e) => setUserId(e.target.value)} className="select-dark">
                    <option value="">בחר עובד...</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">סוג תורנות</label>
                  <div className="flex gap-2">
                    {(['weekend', 'regular'] as const).map((t) => (
                      <label
                        key={t}
                        className="flex-1 flex items-center justify-center gap-2 p-2 rounded-xl cursor-pointer text-sm transition-all"
                        style={{
                          background: dutyType === t ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${dutyType === t ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
                          color: dutyType === t ? '#f87171' : 'var(--muted)',
                        }}
                      >
                        <input type="radio" name="duty_type" value={t} checked={dutyType === t} onChange={() => setDutyType(t)} className="sr-only" />
                        {t === 'weekend' ? 'סופ״ש' : 'כוננות'}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">הערות</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="textarea-dark resize-none" placeholder="הערות (אופציונלי)" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={!userId || loading} className="btn-primary flex-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  שמור
                </button>
                <button onClick={onClose} className="btn-secondary flex-1">ביטול</button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface DutyRosterProps {
  currentUser: { id: number; role: string };
  initialYear?: number;
  initialMonth?: number;
}

export default function DutyRoster({ currentUser, initialYear, initialMonth }: DutyRosterProps) {
  const now = new Date();
  const [year, setYear] = useState(initialYear ?? now.getFullYear());
  const [month, setMonth] = useState(initialMonth ?? now.getMonth() + 1);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [duties, setDuties] = useState<DutyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addTarget, setAddTarget] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [empRes, dutyRes] = await Promise.all([
        fetch('/api/employees', { credentials: 'include' }),
        fetch(`/api/duty?year=${year}&month=${month}`, { credentials: 'include' }),
      ]);
      const empJson = await empRes.json().catch(() => ({ employees: [] }));
      const dutyJson = await dutyRes.json().catch(() => ({ assignments: [] }));
      setEmployees(empJson.employees ?? []);
      setDuties(dutyJson.assignments ?? []);
    } catch {
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { void loadData(); }, [loadData]);

  function goPrev() { setMonth((m) => { if (m === 1) { setYear(y => y - 1); return 12; } return m - 1; }); }
  function goNext() { setMonth((m) => { if (m === 12) { setYear(y => y + 1); return 1; } return m + 1; }); }

  const dutyMap = useMemo(() => {
    const map = new Map<string, DutyAssignment[]>();
    for (const d of duties) {
      const arr = map.get(d.date) ?? [];
      arr.push(d);
      map.set(d.date, arr);
    }
    return map;
  }, [duties]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getDayOfWeek(year, month, 1);
  const calCells: Array<{ day: number | null; date: string | null }> = [];
  for (let i = 0; i < firstDow; i++) calCells.push({ day: null, date: null });
  for (let d = 1; d <= daysInMonth; d++) calCells.push({ day: d, date: padDate(year, month, d) });

  async function handleAddDuty(userId: number, dutyType: 'weekend' | 'regular', notes: string) {
    if (!addTarget) return;
    await fetch('/api/duty', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, date: addTarget, dutyType, notes: notes || null }),
    });
    await loadData();
  }

  return (
    <div dir="rtl">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1 data-card px-3 py-1.5">
          <button onClick={goPrev} className="p-1 rounded-lg hover:bg-white/10 text-white">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="px-3 text-sm font-semibold text-white whitespace-nowrap">{monthLabel(year, month)}</span>
          <button onClick={goNext} className="p-1 rounded-lg hover:bg-white/10 text-white">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
        {isAdmin && (
          <span className="text-xs badge-soft">לחץ על יום לתורנות חדשה</span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm rounded-xl px-4 py-3 mb-4"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2" style={{ color: 'var(--muted)' }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>טוען תורנויות...</span>
        </div>
      ) : (
        <>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {HE_WEEKDAYS_SHORT.map((d) => (
              <div key={d} className="text-center text-xs font-medium py-1" style={{ color: 'var(--muted)' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calCells.map((cell, i) => {
              if (!cell.day || !cell.date) {
                return <div key={i} />;
              }
              const dow = getDayOfWeek(year, month, cell.day);
              const isWeekend = dow === 5 || dow === 6;
              const isToday = cell.date === padDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
              const dayDuties = dutyMap.get(cell.date) ?? [];

              return (
                <motion.div
                  key={cell.date}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.008 }}
                  className="group rounded-xl p-1.5 cursor-pointer transition-all hover:scale-105"
                  style={{
                    background: isToday
                      ? 'rgba(59,130,246,0.15)'
                      : isWeekend
                      ? 'rgba(168,85,247,0.08)'
                      : 'var(--bg-card)',
                    border: `1px solid ${isToday ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
                    minHeight: 72,
                  }}
                  onClick={() => isAdmin && setAddTarget(cell.date)}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: isToday ? '#60a5fa' : isWeekend ? '#c084fc' : 'var(--muted)' }}
                    >
                      {cell.day}
                    </span>
                    {isAdmin && (
                      <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--muted)' }} />
                    )}
                  </div>

                  <div className="flex flex-col gap-0.5">
                    {dayDuties.map((duty) => (
                      <div
                        key={duty.id}
                        className="flex items-center gap-1 rounded-md px-1.5 py-0.5"
                        style={{
                          background: duty.duty_type === 'weekend'
                            ? 'rgba(239,68,68,0.15)'
                            : duty.duty_type === 'holiday'
                            ? 'rgba(34,197,94,0.15)'
                            : 'rgba(249,115,22,0.15)',
                          border: `1px solid ${duty.duty_type === 'weekend'
                            ? 'rgba(239,68,68,0.3)'
                            : duty.duty_type === 'holiday'
                            ? 'rgba(34,197,94,0.3)'
                            : 'rgba(249,115,22,0.3)'}`,
                        }}
                      >
                        <ShieldCheck
                          className="w-2.5 h-2.5 shrink-0"
                          style={{
                            color: duty.duty_type === 'weekend'
                              ? '#f87171'
                              : duty.duty_type === 'holiday'
                              ? '#4ade80'
                              : '#fb923c',
                          }}
                        />
                        <span className="text-[9px] font-medium text-white truncate">
                          {duty.employee_name?.split(' ')[0] ?? 'עובד'}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
              <ShieldCheck className="w-3 h-3 text-red-400" />
              תורנות סופ״ש
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
              <ShieldCheck className="w-3 h-3 text-orange-400" />
              כוננות
            </div>
          </div>
        </>
      )}

      {/* Add duty modal */}
      {addTarget && (
        <AddDutyModal
          open={!!addTarget}
          date={addTarget}
          employees={employees}
          onSave={handleAddDuty}
          onClose={() => setAddTarget(null)}
        />
      )}
    </div>
  );
}
