'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Loader2, ChevronRight, ChevronLeft, Download, Mail, Users2, CalendarDays } from 'lucide-react';

interface EmployeeSummary {
  id: number;
  full_name: string;
  department: string | null;
  counts: Record<string, number>;
  working_days: number;
  off_days: number;
  total_shifts: number;
}

interface DeptEntry {
  working: number;
  off: number;
  employees: number;
}

interface SummaryData {
  year: number;
  month: number;
  monthLabel: string;
  daysInMonth: number;
  totalEmployees: number;
  totalShiftEntries: number;
  globalCounts: Record<string, number>;
  shiftLabel: Record<string, string>;
  employees: EmployeeSummary[];
  departments: Record<string, DeptEntry>;
}

function prevMonth(y: number, m: number) { return m === 1 ? [y - 1, 12] : [y, m - 1]; }
function nextMonth(y: number, m: number) { return m === 12 ? [y + 1, 1] : [y, m + 1]; }

const WORK_SHIFTS = ['morning', 'afternoon', 'night', 'duty', 'weekend_duty'];
const ABSENCE_SHIFTS = ['day_off', 'sick', 'vacation', 'holiday'];

export default function MonthlySummary() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/summary?year=${year}&month=${month}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'שגיאה'); return; }
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { void load(); }, [load]);

  function goPrev() { const [y, m] = prevMonth(year, month); setYear(y); setMonth(m); }
  function goNext() { const [y, m] = nextMonth(year, month); setYear(y); setMonth(m); }

  function handleEmailSummary() {
    if (!data) return;
    const lines = [
      `סיכום משמרות — ${data.monthLabel}`,
      `סה"כ עובדים: ${data.totalEmployees} | ימים בחודש: ${data.daysInMonth}`,
      '',
      ...data.employees.map(e =>
        `${e.full_name}${e.department ? ` (${e.department})` : ''}: ${e.working_days} ימי עבודה, ${e.off_days} ימי חופש`
      ),
    ];
    const body = encodeURIComponent(lines.join('\n'));
    const subject = encodeURIComponent(`סיכום משמרות — ${data.monthLabel}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-2" style={{ color: 'var(--muted)' }}>
      <Loader2 className="w-5 h-5 animate-spin" /><span>טוען סיכום...</span>
    </div>
  );

  if (error) return (
    <div className="text-center py-12 text-red-400 text-sm">{error}</div>
  );

  if (!data) return null;

  const sortedEmployees = [...data.employees].sort((a, b) => b.working_days - a.working_days);

  return (
    <div dir="rtl" className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 data-card px-3 py-1.5">
          <button onClick={goPrev} className="p-1 rounded-lg hover:bg-white/10 text-white">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="px-3 text-sm font-semibold text-white whitespace-nowrap">{data.monthLabel}</span>
          <button onClick={goNext} className="p-1 rounded-lg hover:bg-white/10 text-white">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 mr-auto">
          <button onClick={handleEmailSummary} className="btn-secondary text-xs py-2 px-3">
            <Mail className="w-3.5 h-3.5" />
            שלח במייל
          </button>
          <button onClick={() => window.print()} className="btn-secondary text-xs py-2 px-3 no-print">
            <Download className="w-3.5 h-3.5" />
            הדפס
          </button>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users2, label: 'עובדים', value: data.totalEmployees, color: '#3b82f6' },
          { icon: CalendarDays, label: 'ימים בחודש', value: data.daysInMonth, color: '#a855f7' },
          { icon: BarChart2, label: 'סה"כ משמרות', value: data.globalCounts['morning'] ?? 0 + (data.globalCounts['afternoon'] ?? 0) + (data.globalCounts['night'] ?? 0), color: '#f59e0b' },
          { icon: CalendarDays, label: 'ימי מחלה/חופש', value: (data.globalCounts['sick'] ?? 0) + (data.globalCounts['vacation'] ?? 0) + (data.globalCounts['day_off'] ?? 0), color: '#ef4444' },
        ].map(({ icon: Icon, label, value, color }, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="data-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Global shift breakdown */}
      <div className="data-card p-5">
        <h3 className="text-sm font-semibold text-white mb-3">פילוח משמרות — {data.monthLabel}</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.globalCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => (
              <div key={type} className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}>
                <span className="text-xs font-medium text-white">{data.shiftLabel[type] ?? type}</span>
                <span className="text-xs font-bold rounded-full px-2 py-0.5"
                  style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Departments */}
      {Object.keys(data.departments).length > 1 && (
        <div className="data-card p-5">
          <h3 className="text-sm font-semibold text-white mb-3">לפי מחלקה</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(data.departments).map(([dept, stats]) => (
              <div key={dept} className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <p className="text-sm font-semibold text-white mb-1">{dept}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {stats.employees} עובדים · {stats.working} ימי עבודה · {stats.off} חופש
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-employee table */}
      <div className="data-card p-5">
        <h3 className="text-sm font-semibold text-white mb-3">סיכום לפי עובד</h3>
        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                <th className="text-right px-4 py-2.5 font-semibold text-white whitespace-nowrap">עובד</th>
                {WORK_SHIFTS.map(s => (
                  <th key={s} className="px-3 py-2.5 font-medium text-center whitespace-nowrap" style={{ color: 'var(--muted)', borderRight: '1px solid var(--border)' }}>
                    {data.shiftLabel[s]}
                  </th>
                ))}
                {ABSENCE_SHIFTS.map(s => (
                  <th key={s} className="px-3 py-2.5 font-medium text-center whitespace-nowrap" style={{ color: '#f87171', borderRight: '1px solid var(--border)' }}>
                    {data.shiftLabel[s]}
                  </th>
                ))}
                <th className="px-3 py-2.5 font-bold text-center text-white whitespace-nowrap">סה"כ עבודה</th>
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map((emp, i) => (
                <motion.tr key={emp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-4 py-2.5">
                    <p className="text-white font-medium text-xs">{emp.full_name}</p>
                    {emp.department && <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{emp.department}</p>}
                  </td>
                  {WORK_SHIFTS.map(s => (
                    <td key={s} className="px-3 py-2.5 text-center" style={{ borderRight: '1px solid var(--border)' }}>
                      <span className="text-white text-xs">{emp.counts[s] ?? '—'}</span>
                    </td>
                  ))}
                  {ABSENCE_SHIFTS.map(s => (
                    <td key={s} className="px-3 py-2.5 text-center" style={{ borderRight: '1px solid var(--border)' }}>
                      <span style={{ color: (emp.counts[s] ?? 0) > 0 ? '#f87171' : 'var(--muted)' }} className="text-xs">
                        {emp.counts[s] ?? '—'}
                      </span>
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-xs font-bold rounded-full px-2 py-0.5"
                      style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>
                      {emp.working_days}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
