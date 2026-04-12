'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import { SHIFT_ABBREV, SHIFT_CLASS, type ShiftType } from './ShiftEditModal';

interface Employee {
  id: number;
  full_name: string;
  department?: string;
}

interface ShiftEntry {
  user_id: number;
  date: string;
  schedule_type: string;
  notes?: string;
}

const SHIFT_TIMES: Partial<Record<ShiftType, { start: string; end: string; label: string }>> = {
  office: { start: '07:00', end: '15:00', label: 'בוקר' },
  home:   { start: '13:00', end: '21:00', label: 'אחהצ' },
  night:  { start: '21:00', end: '07:00', label: 'לילה' },
  duty:   { start: '00:00', end: '23:59', label: 'תורנות' },
};

const HE_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function getWeekDates(year: number, week: number): Date[] {
  // week = 0-based week of year, starting Sunday
  const jan1 = new Date(year, 0, 1);
  const startOfWeek = new Date(jan1.getTime() + week * 7 * 86400000 - jan1.getDay() * 86400000);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekOfYear(d: Date) {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.floor((d.getTime() - jan1.getTime() + jan1.getDay() * 86400000) / (7 * 86400000));
}

interface WeekViewProps {
  currentUser: { id: number; role: string };
  initialYear?: number;
  initialWeek?: number;
}

export default function WeekView({ currentUser, initialYear, initialWeek }: WeekViewProps) {
  const now = new Date();
  const [year, setYear] = useState(initialYear ?? now.getFullYear());
  const [week, setWeek] = useState(initialWeek ?? getWeekOfYear(now));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedule, setSchedule] = useState<ShiftEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const weekDates = useMemo(() => getWeekDates(year, week), [year, week]);
  const month = weekDates[0].getMonth() + 1;
  const weekMonth = weekDates[3].getMonth() + 1; // midpoint month

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [empRes, schedRes] = await Promise.all([
        fetch('/api/employees', { credentials: 'include' }),
        fetch(`/api/schedule?year=${year}&month=${weekMonth}`, { credentials: 'include' }),
      ]);
      const empJson = await empRes.json().catch(() => ({ employees: [] }));
      const schedJson = await schedRes.json().catch(() => ({ schedule: [], entries: [] }));
      setEmployees(empJson.employees ?? []);
      if (schedJson.schedule) {
        const flat: ShiftEntry[] = [];
        for (const row of schedJson.schedule) flat.push(...(row.entries ?? []));
        setSchedule(flat);
      } else {
        setSchedule(schedJson.entries ?? []);
      }
    } catch {
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, [year, weekMonth]);

  useEffect(() => { void loadData(); }, [loadData]);

  function prevWeek() {
    if (week === 0) { setYear(y => y - 1); setWeek(52); }
    else setWeek(w => w - 1);
  }
  function nextWeekFn() {
    if (week >= 52) { setYear(y => y + 1); setWeek(0); }
    else setWeek(w => w + 1);
  }

  const weekLabel = `${weekDates[0].toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })} – ${weekDates[6].toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  // Build matrix: for each day, list of (employee, shift)
  const weekMatrix = useMemo(() => {
    return weekDates.map((date) => {
      const iso = toIso(date);
      const dayEntries: Array<{ employee: Employee; entry: ShiftEntry }> = [];
      for (const emp of employees) {
        const entry = schedule.find((s) => s.user_id === emp.id && s.date === iso);
        if (entry && entry.schedule_type !== 'day_off') {
          dayEntries.push({ employee: emp, entry });
        }
      }
      return { date, iso, entries: dayEntries };
    });
  }, [weekDates, employees, schedule]);

  return (
    <div dir="rtl">
      {/* Nav */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1 data-card px-3 py-1.5">
          <button onClick={prevWeek} className="p-1 rounded-lg hover:bg-white/10 text-white">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="px-3 text-sm font-semibold text-white whitespace-nowrap">{weekLabel}</span>
          <button onClick={nextWeekFn} className="p-1 rounded-lg hover:bg-white/10 text-white">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm rounded-xl px-4 py-3 mb-4"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2" style={{ color: 'var(--muted)' }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>טוען תצוגה שבועית...</span>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {weekMatrix.map(({ date, iso, entries }, di) => {
            const isToday = iso === toIso(now);
            const isWeekend = date.getDay() === 5 || date.getDay() === 6;
            return (
              <motion.div
                key={iso}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: di * 0.04 }}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: isToday
                    ? 'rgba(59,130,246,0.12)'
                    : isWeekend
                    ? 'rgba(168,85,247,0.06)'
                    : 'var(--bg-card)',
                  border: `1px solid ${isToday ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
                  minHeight: 120,
                }}
              >
                {/* Day header */}
                <div
                  className="px-2 py-2 text-center"
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: isToday ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)',
                  }}
                >
                  <p className="text-[10px] font-medium" style={{ color: isToday ? '#93c5fd' : 'var(--muted)' }}>
                    {HE_DAYS[date.getDay()]}
                  </p>
                  <p className={`text-base font-bold ${isToday ? 'text-blue-400' : 'text-white'}`}>
                    {date.getDate()}
                  </p>
                </div>

                {/* Shift cards */}
                <div className="p-1.5 flex flex-col gap-1">
                  {entries.length === 0 ? (
                    <p className="text-[10px] text-center py-2" style={{ color: 'var(--muted)' }}>—</p>
                  ) : (
                    entries.map(({ employee, entry }) => {
                      const type = entry.schedule_type as ShiftType;
                      const cls = SHIFT_CLASS[type] ?? 'shift-off';
                      const timeInfo = SHIFT_TIMES[type];
                      return (
                        <div
                          key={employee.id}
                          className={`rounded-lg px-2 py-1.5 ${cls}`}
                          style={{ border: 'none' }}
                        >
                          <p className="text-[10px] font-semibold truncate leading-tight">{employee.full_name.split(' ')[0]}</p>
                          {timeInfo && (
                            <p className="text-[9px] opacity-75">{timeInfo.start}–{timeInfo.end}</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
