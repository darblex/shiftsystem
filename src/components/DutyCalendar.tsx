'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Shield } from 'lucide-react';
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
  getDay,
} from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DutyDay {
  date: Date;
  /** Name of the person on duty */
  employeeName?: string;
  note?: string;
}

export interface DutyCalendarProps {
  /** Array of weekend duty assignments */
  dutyDays?: DutyDay[];
  /** Currently authenticated user's name (to highlight their duties) */
  currentUserName?: string;
  onDayClick?: (date: Date, duty?: DutyDay) => void;
  initialMonth?: Date;
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const HEBREW_MONTHS: Record<string, string> = {
  January: 'ינואר', February: 'פברואר', March: 'מרץ', April: 'אפריל',
  May: 'מאי', June: 'יוני', July: 'יולי', August: 'אוגוסט',
  September: 'ספטמבר', October: 'אוקטובר', November: 'נובמבר', December: 'דצמבר',
};

const HEBREW_DAYS_SHORT = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

/** Returns true for Friday (5) or Saturday (6) */
function isWeekend(date: Date): boolean {
  const d = getDay(date);
  return d === 5 || d === 6;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DutyCalendar({
  dutyDays = [],
  currentUserName,
  onDayClick,
  initialMonth,
  className = '',
}: DutyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth ?? new Date());
  const [direction, setDirection] = useState<1 | -1>(1);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const dutyMap = new Map<string, DutyDay>(
    dutyDays.map((d) => [format(d.date, 'yyyy-MM-dd'), d])
  );

  function navigate(dir: 1 | -1) {
    setDirection(dir);
    setCurrentMonth((m) => (dir === 1 ? addMonths(m, 1) : subMonths(m, 1)));
  }

  const monthLabel = `${HEBREW_MONTHS[format(currentMonth, 'MMMM')]} ${format(currentMonth, 'yyyy')}`;

  // Count user's weekend duties this month
  const myDutiesCount = dutyDays.filter(
    (d) => isSameMonth(d.date, currentMonth) && d.employeeName === currentUserName
  ).length;

  return (
    <div dir="rtl" className={`rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-xl hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
          aria-label="חודש קודם"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="text-base font-semibold text-white">{monthLabel}</h2>
          {currentUserName && (
            <p className="text-xs text-zinc-500 mt-0.5">
              {myDutiesCount} תורנויות סוף שבוע שלי
            </p>
          )}
        </div>
        <button
          onClick={() => navigate(1)}
          className="p-1.5 rounded-xl hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
          aria-label="חודש הבא"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 my-2">
        {[...HEBREW_DAYS_SHORT].reverse().map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-medium py-1 ${
              i >= 5 ? 'text-rose-400' : 'text-zinc-500'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
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
            const duty = dutyMap.get(key);
            const inMonth = isSameMonth(day, currentMonth);
            const weekend = isWeekend(day);
            const isToday = isSameDay(day, new Date());
            const isMyDuty = duty?.employeeName === currentUserName;

            let cellClass = 'bg-white/5 text-zinc-600';
            if (!inMonth) {
              cellClass = 'bg-transparent text-zinc-700';
            } else if (isMyDuty) {
              cellClass = 'bg-gradient-to-br from-rose-500/70 to-rose-700/70 text-white shadow-lg shadow-rose-900/30';
            } else if (duty) {
              cellClass = 'bg-rose-500/30 text-rose-200';
            } else if (weekend && inMonth) {
              cellClass = 'bg-rose-500/10 text-rose-400';
            } else if (inMonth) {
              cellClass = 'bg-white/5 text-zinc-300';
            }

            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.9 }}
                onClick={() => onDayClick?.(day, duty)}
                className={`
                  relative aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-medium
                  transition-all duration-150 focus:outline-none
                  ${cellClass}
                  ${isToday ? 'ring-2 ring-white/60' : ''}
                  ${onDayClick ? 'cursor-pointer' : 'cursor-default'}
                `}
                aria-label={key}
              >
                <span>{format(day, 'd')}</span>
                {duty && inMonth && (
                  <Shield className="w-2.5 h-2.5 mt-0.5 opacity-80" />
                )}
                {duty?.employeeName && inMonth && (
                  <span className="text-[8px] leading-tight opacity-80 truncate max-w-full px-0.5">
                    {duty.employeeName.split(' ')[0]}
                  </span>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Legend */}
      <div className="flex gap-4 justify-end mt-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-500/70" />
          <span className="text-zinc-400">תורנות שלי</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-500/30" />
          <span className="text-zinc-400">תורנות אחרת</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-500/10" />
          <span className="text-zinc-400">סוף שבוע</span>
        </span>
      </div>
    </div>
  );
}

export default DutyCalendar;
