'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DayStatus =
  | 'office'
  | 'home'
  | 'duty'
  | 'weekend_duty'
  | 'holiday'
  | 'none';

export interface ScheduleDay {
  date: Date;
  status: DayStatus;
  label?: string;
}

export interface ScheduleCalendarProps {
  /** Scheduled days with their statuses */
  schedule?: ScheduleDay[];
  /** Called when a day cell is clicked */
  onDayClick?: (date: Date, status: DayStatus) => void;
  /** Initial month to display (defaults to current) */
  initialMonth?: Date;
  /** Allow the user to navigate months */
  navigable?: boolean;
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<DayStatus, { bg: string; text: string; label: string }> = {
  office:       { bg: 'bg-blue-500/80',   text: 'text-white',        label: 'משרד' },
  home:         { bg: 'bg-emerald-500/80', text: 'text-white',        label: 'בית' },
  duty:         { bg: 'bg-amber-500/80',  text: 'text-white',         label: 'תורנות' },
  weekend_duty: { bg: 'bg-rose-500/80',   text: 'text-white',         label: 'תורנות סוף שבוע' },
  holiday:      { bg: 'bg-purple-500/80', text: 'text-white',         label: 'חג / חופשה' },
  none:         { bg: 'bg-white/5',       text: 'text-zinc-400',      label: '' },
};

const HEBREW_DAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const HEBREW_MONTHS: Record<string, string> = {
  January: 'ינואר', February: 'פברואר', March: 'מרץ', April: 'אפריל',
  May: 'מאי', June: 'יוני', July: 'יולי', August: 'אוגוסט',
  September: 'ספטמבר', October: 'אוקטובר', November: 'נובמבר', December: 'דצמבר',
};

// ─── Legend ──────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 justify-end text-xs mt-3">
      {(Object.entries(STATUS_STYLES) as [DayStatus, typeof STATUS_STYLES[DayStatus]][])
        .filter(([k]) => k !== 'none')
        .map(([key, val]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-full ${val.bg}`} />
            <span className="text-zinc-400">{val.label}</span>
          </span>
        ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ScheduleCalendar({
  schedule = [],
  onDayClick,
  initialMonth,
  navigable = true,
  className = '',
}: ScheduleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth ?? new Date());
  const [direction, setDirection] = useState<1 | -1>(1);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  // Sunday-first grid (RTL visual — we'll reverse columns via CSS)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const scheduleMap = new Map<string, ScheduleDay>(
    schedule.map((s) => [format(s.date, 'yyyy-MM-dd'), s])
  );

  function navigate(dir: 1 | -1) {
    setDirection(dir);
    setCurrentMonth((m) => (dir === 1 ? addMonths(m, 1) : subMonths(m, 1)));
  }

  const monthLabel = `${HEBREW_MONTHS[format(currentMonth, 'MMMM')]} ${format(currentMonth, 'yyyy')}`;

  return (
    <div
      dir="rtl"
      className={`rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 select-none ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        {navigable && (
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-xl hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
            aria-label="חודש קודם"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-base font-semibold text-white tracking-wide">{monthLabel}</h2>
        {navigable && (
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-xl hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
            aria-label="חודש הבא"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Day headers (RTL: Sun on right) */}
      <div className="grid grid-cols-7 mb-1">
        {[...HEBREW_DAYS].reverse().map((d) => (
          <div key={d} className="text-center text-xs font-medium text-zinc-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={format(currentMonth, 'yyyy-MM')}
          initial={{ opacity: 0, x: direction * 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -direction * 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="grid grid-cols-7 gap-1"
        >
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const entry = scheduleMap.get(key);
            const status: DayStatus = entry?.status ?? 'none';
            const style = STATUS_STYLES[status];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());

            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.92 }}
                onClick={() => onDayClick?.(day, status)}
                className={`
                  relative aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-medium
                  transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/50
                  ${isCurrentMonth ? style.bg : 'bg-transparent'}
                  ${isCurrentMonth ? style.text : 'text-zinc-600'}
                  ${isToday ? 'ring-2 ring-white/60' : ''}
                  ${onDayClick ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}
                `}
                aria-label={`${key} - ${style.label}`}
              >
                <span>{format(day, 'd')}</span>
                {entry?.label && (
                  <span className="text-[9px] leading-tight opacity-80 truncate max-w-full px-0.5">
                    {entry.label}
                  </span>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <Legend />
    </div>
  );
}

export default ScheduleCalendar;
