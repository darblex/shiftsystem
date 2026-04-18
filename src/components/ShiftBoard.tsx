'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Copy, Loader2, AlertCircle } from 'lucide-react';
import ShiftEditModal from './ShiftEditModal';
import CopyMonthModal from './CopyMonthModal';
import type { ShiftType } from '@/types';
import { SHIFT_ABBREV, SHIFT_CLASS, SHIFT_LABEL } from './shiftMeta';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: number;
  full_name: string;
  department?: string;
}

interface ShiftEntry {
  id: number;
  user_id: number;
  date: string;
  shift_type: ShiftType;
  notes?: string;
}

interface HolidayEntry {
  date: string;
  name_he: string;
}

interface EmployeeRow {
  employee: Employee;
  shifts: Record<string, ShiftEntry>; // key = date "yyyy-MM-dd"
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HEBREW_WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getDayOfWeek(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay(); // 0=Sun, 5=Fri, 6=Sat
}

function padDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function prevMonth(year: number, month: number) {
  return month === 1 ? [year - 1, 12] : [year, month - 1];
}

function nextMonth(year: number, month: number) {
  return month === 12 ? [year + 1, 1] : [year, month + 1];
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
}

// ─── Shift Badge ──────────────────────────────────────────────────────────────

function ShiftCell({
  entry,
  isWeekend,
  isHoliday,
  canEdit,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
  isDragging,
}: {
  entry?: ShiftEntry;
  isWeekend: boolean;
  isHoliday: boolean;
  canEdit: boolean;
  onClick: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  isDragOver?: boolean;
  isDragging?: boolean;
}) {
  const type = entry?.shift_type ?? 'day_off';
  const abbrev = SHIFT_ABBREV[type] ?? '—';
  const cls = SHIFT_CLASS[type] ?? 'shift-off';
  const draggable = canEdit && !!entry && entry.shift_type !== 'day_off';

  return (
    <div
      className={`flex items-center justify-center h-8 transition-all
        ${canEdit ? 'cursor-pointer' : ''}
        ${isDragOver ? 'scale-110 ring-2 ring-blue-400 ring-inset rounded' : ''}
        ${isDragging ? 'opacity-40' : ''}
      `}
      style={{
        background: isDragOver
          ? 'rgba(59,130,246,0.18)'
          : isWeekend ? 'rgba(168,85,247,0.05)'
          : isHoliday ? 'rgba(34,197,94,0.05)'
          : 'transparent',
      }}
      draggable={draggable}
      onDragStart={draggable ? (e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); } : undefined}
      onDragOver={canEdit ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver?.(e); } : undefined}
      onDrop={canEdit ? (e) => { e.preventDefault(); onDrop?.(); } : undefined}
      onDragEnd={onDragEnd}
      onClick={canEdit ? onClick : undefined}
      title={draggable ? 'גרור להחלפת משמרת' : canEdit ? 'לחץ לעריכה' : undefined}
    >
      <span className={`shift-badge ${cls} ${isDragging ? 'cursor-grabbing' : draggable ? 'cursor-grab' : ''}`}>{abbrev}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ShiftBoardProps {
  currentUser: { id: number; role: string; full_name: string };
  initialYear?: number;
  initialMonth?: number;
}

export default function ShiftBoard({ currentUser, initialYear, initialMonth }: ShiftBoardProps) {
  const now = new Date();
  const [year, setYear] = useState(initialYear ?? now.getFullYear());
  const [month, setMonth] = useState(initialMonth ?? now.getMonth() + 1);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedule, setSchedule] = useState<ShiftEntry[]>([]);
  const [holidays, setHolidays] = useState<HolidayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [editTarget, setEditTarget] = useState<{ employee: Employee; date: string; entry?: ShiftEntry } | null>(null);
  const [copyTarget, setCopyTarget] = useState<{ userId: number; name: string } | null>(null);

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';

  // ── Drag & drop state ─────────────────────────────────────────────────────
  const dragSource = useRef<{ employee: Employee; date: string; entry: ShiftEntry } | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null); // "userId:date"
  const [draggingKey, setDraggingKey] = useState<string | null>(null); // "userId:date"

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [empRes, schedRes, holRes] = await Promise.all([
        fetch('/api/employees', { credentials: 'include' }),
        fetch(`/api/schedule?year=${year}&month=${month}`, { credentials: 'include' }),
        fetch(`/api/holidays?year=${year}&month=${month}`, { credentials: 'include' }),
      ]);

      const empJson = await empRes.json().catch(() => ({ employees: [] }));
      const schedJson = await schedRes.json().catch(() => ({ schedule: [], entries: [] }));
      const holJson = await holRes.json().catch(() => ({ holidays: [] }));

      setEmployees(empJson.employees ?? []);

      // API returns either `schedule` (array of {userId, entries}) or `entries` (own entries)
      if (schedJson.schedule) {
        const flat: ShiftEntry[] = [];
        for (const row of schedJson.schedule) {
          flat.push(...(row.entries ?? []));
        }
        setSchedule(flat);
      } else {
        setSchedule(schedJson.entries ?? []);
      }

      setHolidays(holJson.holidays ?? []);
    } catch {
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { void loadData(); }, [loadData]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);

  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department ?? '').filter(Boolean))),
    [employees]
  );

  const visibleEmployees = useMemo(
    () => deptFilter ? employees.filter((e) => e.department === deptFilter) : employees,
    [employees, deptFilter]
  );

  const rows: EmployeeRow[] = useMemo(() => {
    return visibleEmployees.map((emp) => {
      const shifts: Record<string, ShiftEntry> = {};
      for (const entry of schedule) {
        if (entry.user_id === emp.id) {
          shifts[entry.date] = entry;
        }
      }
      return { employee: emp, shifts };
    });
  }, [visibleEmployees, schedule]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  function goPrev() {
    const [y, m] = prevMonth(year, month);
    setYear(y); setMonth(m);
  }
  function goNext() {
    const [y, m] = nextMonth(year, month);
    setYear(y); setMonth(m);
  }

  // ── Save shift ──────────────────────────────────────────────────────────────
  async function handleSaveShift(shiftType: ShiftType, notes: string) {
    if (!editTarget) return;
    await fetch('/api/schedule', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: editTarget.employee.id,
        date: editTarget.date,
        shiftType,
        notes: notes || null,
      }),
    });
    await loadData();
  }

  // ── Drag & drop swap ────────────────────────────────────────────────────────
  async function handleDropSwap(targetEmployee: Employee, targetDate: string, targetEntry?: ShiftEntry) {
    const src = dragSource.current;
    dragSource.current = null;
    setDragOverKey(null);
    setDraggingKey(null);
    if (!src) return;
    // Same cell — no-op
    if (src.employee.id === targetEmployee.id && src.date === targetDate) return;

    const srcType = src.entry.shift_type;
    const tgtType = targetEntry?.shift_type ?? 'day_off';

    // Swap both cells in parallel
    await Promise.all([
      fetch('/api/schedule', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: src.employee.id, date: src.date, shiftType: tgtType, notes: targetEntry?.notes ?? null }),
      }),
      fetch('/api/schedule', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetEmployee.id, date: targetDate, shiftType: srcType, notes: src.entry.notes ?? null }),
      }),
    ]);
    await loadData();
  }

  // ── Copy month ──────────────────────────────────────────────────────────────
  async function handleCopyMonth() {
    if (!copyTarget) return;
    const [fromY, fromM] = prevMonth(year, month);
    // Load previous month entries for this user, then write them to current month
    const res = await fetch(
      `/api/schedule?year=${fromY}&month=${fromM}&userId=${copyTarget.userId}`,
      { credentials: 'include' }
    );
    const json = await res.json().catch(() => ({ entries: [] }));
    const prevEntries: ShiftEntry[] = json.entries ?? [];

    // Map day-of-month to shift type (preserve same day numbers, different month)
    const patchPromises = prevEntries.map((entry) => {
      const dayNum = Number(entry.date.split('-')[2]);
      if (dayNum > daysInMonth) return Promise.resolve();
      const newDate = padDate(year, month, dayNum);
      return fetch('/api/schedule', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: copyTarget.userId,
          date: newDate,
          shiftType: entry.shift_type,
          notes: entry.notes ?? null,
        }),
      });
    });
    await Promise.all(patchPromises);
    await loadData();
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const [fromY, fromM] = prevMonth(year, month);

  return (
    <div dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Month nav */}
        <div className="flex items-center gap-1 data-card px-3 py-1.5">
          <button onClick={goPrev} className="p-1 rounded-lg transition-colors hover:bg-white/10 text-white">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="px-3 text-sm font-semibold text-white whitespace-nowrap">{monthLabel(year, month)}</span>
          <button onClick={goNext} className="p-1 rounded-lg transition-colors hover:bg-white/10 text-white">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Dept filter */}
        {departments.length > 0 && (
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="select-dark py-1.5 text-sm"
            style={{ width: 'auto', minWidth: 120 }}
          >
            <option value="">כל המחלקות</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}

        {/* Legend */}
        <div className="flex items-center gap-2 flex-wrap">
          {([
            'morning',
            'afternoon',
            'night',
            'duty',
          ] as const).map((shiftType) => (
            <span key={shiftType} className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
              <span className={`shift-badge ${SHIFT_CLASS[shiftType]}`}>{SHIFT_ABBREV[shiftType]}</span>
              {SHIFT_LABEL[shiftType]}
            </span>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm rounded-xl px-4 py-3 mb-4"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2" style={{ color: 'var(--muted)' }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>טוען לוח משמרות...</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm border-collapse" style={{ minWidth: `${180 + daysInMonth * 40}px` }}>
            {/* Head: days */}
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {/* Sticky name col */}
                <th
                  className="text-right font-semibold px-4 py-3 whitespace-nowrap sticky right-0 z-20"
                  style={{ background: 'var(--bg-elevated)', minWidth: 180, borderLeft: '1px solid var(--border)' }}
                >
                  עובד
                </th>
                {days.map((d) => {
                  const dow = getDayOfWeek(year, month, d);
                  const isWeekend = dow === 5 || dow === 6;
                  const dateStr = padDate(year, month, d);
                  const isHoliday = holidaySet.has(dateStr);
                  const isToday = dateStr === padDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
                  return (
                    <th
                      key={d}
                      className="py-2 font-medium text-center"
                      style={{
                        minWidth: 40,
                        color: isToday ? '#60a5fa' : isWeekend ? '#c084fc' : isHoliday ? '#4ade80' : 'var(--muted)',
                        borderRight: '1px solid var(--border)',
                        background: isToday
                          ? 'rgba(59,130,246,0.12)'
                          : isWeekend
                          ? 'rgba(168,85,247,0.07)'
                          : isHoliday
                          ? 'rgba(34,197,94,0.07)'
                          : 'transparent',
                      }}
                    >
                      <div>{d}</div>
                      <div className="text-[10px]">{HEBREW_WEEKDAYS[dow]}</div>
                    </th>
                  );
                })}
                {/* Copy button col */}
                <th className="px-3 py-3 whitespace-nowrap font-medium" style={{ color: 'var(--muted)', borderRight: '1px solid var(--border)' }}>
                  פעולות
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, ri) => (
                <motion.tr
                  key={row.employee.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: ri * 0.02 }}
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  {/* Name cell — sticky */}
                  <td
                    className="px-4 py-2 sticky right-0 z-10"
                    style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', minWidth: 180 }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: 'linear-gradient(135deg, #2563eb, #a855f7)' }}
                      >
                        {row.employee.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium text-xs truncate">{row.employee.full_name}</p>
                        {row.employee.department && (
                          <p className="text-[10px] truncate" style={{ color: 'var(--muted)' }}>{row.employee.department}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Shift cells */}
                  {days.map((d) => {
                    const dow = getDayOfWeek(year, month, d);
                    const isWeekend = dow === 5 || dow === 6;
                    const dateStr = padDate(year, month, d);
                    const isHoliday = holidaySet.has(dateStr);
                    const entry = row.shifts[dateStr];
                    const canEdit = isAdmin;
                    const cellKey = `${row.employee.id}:${dateStr}`;
                    return (
                      <td
                        key={d}
                        style={{
                          borderRight: '1px solid var(--border)',
                          background: isWeekend
                            ? 'rgba(168,85,247,0.04)'
                            : isHoliday
                            ? 'rgba(34,197,94,0.04)'
                            : 'transparent',
                        }}
                      >
                        <ShiftCell
                          entry={entry}
                          isWeekend={isWeekend}
                          isHoliday={isHoliday}
                          canEdit={canEdit}
                          isDragOver={dragOverKey === cellKey}
                          isDragging={draggingKey === cellKey}
                          onDragStart={() => {
                            if (!entry) return;
                            dragSource.current = { employee: row.employee, date: dateStr, entry };
                            setDraggingKey(cellKey);
                          }}
                          onDragOver={() => setDragOverKey(cellKey)}
                          onDrop={() => handleDropSwap(row.employee, dateStr, entry)}
                          onDragEnd={() => { dragSource.current = null; setDraggingKey(null); setDragOverKey(null); }}
                          onClick={() => {
                            if (!canEdit) return;
                            setEditTarget({ employee: row.employee, date: dateStr, entry });
                          }}
                        />
                      </td>
                    );
                  })}

                  {/* Copy button */}
                  <td className="px-3 text-center" style={{ borderRight: '1px solid var(--border)' }}>
                    {isAdmin && (
                      <button
                        onClick={() => setCopyTarget({ userId: row.employee.id, name: row.employee.full_name })}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--muted)' }}
                        title="העתק מחודש קודם"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}

              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={daysInMonth + 2} className="text-center py-12" style={{ color: 'var(--muted)' }}>
                    אין עובדים להצגה
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <ShiftEditModal
          open={!!editTarget}
          employeeName={editTarget.employee.full_name}
          date={editTarget.date}
          currentShift={editTarget.entry?.shift_type ?? 'day_off'}
          onSave={handleSaveShift}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Copy Modal */}
      {copyTarget && (
        <CopyMonthModal
          open={!!copyTarget}
          fromYear={fromY}
          fromMonth={fromM}
          toYear={year}
          toMonth={month}
          onConfirm={handleCopyMonth}
          onClose={() => setCopyTarget(null)}
        />
      )}
    </div>
  );
}
