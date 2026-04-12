'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, LogOut, Clock, CheckCircle2, XCircle, Loader2, History } from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AttendanceStatus = 'checked_in' | 'checked_out' | 'absent';

export interface AttendanceRecord {
  id: string;
  date: string;        // "YYYY-MM-DD"
  checkIn?: string;    // ISO timestamp
  checkOut?: string;   // ISO timestamp
  /** Computed duration in minutes */
  durationMinutes?: number;
}

export interface AttendancePanelProps {
  status: AttendanceStatus;
  lastCheckIn?: string;   // ISO timestamp
  lastCheckOut?: string;  // ISO timestamp
  history?: AttendanceRecord[];
  onCheckIn?: () => Promise<void> | void;
  onCheckOut?: () => Promise<void> | void;
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} דק'`;
  if (m === 0) return `${h} שע'`;
  return `${h}:${String(m).padStart(2, '0')} שע'`;
}

function formatTimestamp(iso: string): string {
  try {
    return format(parseISO(iso), 'HH:mm');
  } catch {
    return '--:--';
  }
}

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: he });
  } catch {
    return '';
  }
}

// ─── Status Indicator ────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AttendanceStatus, {
  label: string;
  bg: string;
  dot: string;
  icon: typeof CheckCircle2;
}> = {
  checked_in:  { label: 'נוכח',         bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25', dot: 'bg-emerald-400',  icon: CheckCircle2 },
  checked_out: { label: 'יצא',          bg: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/25',         dot: 'bg-zinc-400',     icon: XCircle },
  absent:      { label: 'לא נרשם',      bg: 'bg-amber-500/15 text-amber-300 border-amber-500/25',      dot: 'bg-amber-400',    icon: Clock },
};

// ─── History Row ─────────────────────────────────────────────────────────────

function HistoryRow({ record }: { record: AttendanceRecord }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="text-xs text-zinc-500 w-20 shrink-0 text-left">{record.date}</div>
      <div className="flex items-center gap-1 text-xs text-zinc-300">
        <LogIn className="w-3.5 h-3.5 text-emerald-400" />
        {record.checkIn ? formatTimestamp(record.checkIn) : '--:--'}
      </div>
      <div className="flex items-center gap-1 text-xs text-zinc-300">
        <LogOut className="w-3.5 h-3.5 text-zinc-400" />
        {record.checkOut ? formatTimestamp(record.checkOut) : '--:--'}
      </div>
      {record.durationMinutes != null && (
        <div className="mr-auto flex items-center gap-1 text-xs text-zinc-500">
          <Clock className="w-3 h-3" />
          {formatDuration(record.durationMinutes)}
        </div>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AttendancePanel({
  status,
  lastCheckIn,
  lastCheckOut,
  history = [],
  onCheckIn,
  onCheckOut,
  className = '',
}: AttendancePanelProps) {
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  async function handleAction() {
    if (loading) return;
    setLoading(true);
    try {
      if (status === 'checked_in') await onCheckOut?.();
      else await onCheckIn?.();
    } finally {
      setLoading(false);
    }
  }

  const isCheckedIn = status === 'checked_in';
  const actionLabel = isCheckedIn ? 'יציאה' : 'כניסה';
  const ActionIcon = isCheckedIn ? LogOut : LogIn;
  const actionGradient = isCheckedIn
    ? 'from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-rose-900/30'
    : 'from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-emerald-900/30';

  return (
    <div
      dir="rtl"
      className={`rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">נוכחות</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {format(new Date(), 'EEEE, dd/MM/yyyy', { locale: he })}
          </p>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${statusConfig.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} animate-pulse`} />
          {statusConfig.label}
        </span>
      </div>

      {/* Time display */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/5 border border-white/8 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <LogIn className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-zinc-500">כניסה</span>
          </div>
          <p className="text-lg font-bold text-white tabular-nums">
            {lastCheckIn ? formatTimestamp(lastCheckIn) : '--:--'}
          </p>
          {lastCheckIn && (
            <p className="text-[10px] text-zinc-600 mt-0.5">{timeAgo(lastCheckIn)}</p>
          )}
        </div>

        <div className="rounded-xl bg-white/5 border border-white/8 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <LogOut className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs text-zinc-500">יציאה</span>
          </div>
          <p className="text-lg font-bold text-white tabular-nums">
            {lastCheckOut ? formatTimestamp(lastCheckOut) : '--:--'}
          </p>
          {lastCheckOut && (
            <p className="text-[10px] text-zinc-600 mt-0.5">{timeAgo(lastCheckOut)}</p>
          )}
        </div>
      </div>

      {/* Action button */}
      <div className="px-4 pb-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleAction}
          disabled={loading}
          className={`
            w-full flex items-center justify-center gap-2 rounded-xl
            bg-gradient-to-l ${actionGradient}
            text-white text-sm font-semibold py-3 px-4
            transition-all shadow-lg
            disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/20
          `}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <ActionIcon className="w-4 h-4" />
              {actionLabel}
            </>
          )}
        </motion.button>
      </div>

      {/* History toggle */}
      {history.length > 0 && (
        <>
          <button
            onClick={() => setShowHistory((s) => !s)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border-t border-white/10 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            {showHistory ? 'הסתר היסטוריה' : `היסטוריה (${history.length})`}
          </button>

          <AnimatePresence initial={false}>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 max-h-52 overflow-y-auto space-y-0">
                  {history.map((record) => (
                    <HistoryRow key={record.id} record={record} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

export default AttendancePanel;
