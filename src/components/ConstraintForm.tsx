'use client';

import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, MessageSquare, ChevronDown, CheckCircle2, Loader2 } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ShiftPreference = 'office' | 'home' | 'day_off' | 'no_preference';

export interface ConstraintEntry {
  date: string;          // ISO date: "YYYY-MM-DD"
  preference: ShiftPreference;
  reason?: string;
}

export interface ConstraintFormProps {
  /** Existing constraints to display below the form */
  existingConstraints?: ConstraintEntry[];
  onSubmit?: (entry: ConstraintEntry) => Promise<void> | void;
  onDelete?: (date: string) => void;
  /** If true the form is disabled */
  disabled?: boolean;
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PREFERENCE_OPTIONS: { value: ShiftPreference; label: string; emoji: string }[] = [
  { value: 'office',       label: 'משרד',           emoji: '🏢' },
  { value: 'home',         label: 'עבודה מהבית',    emoji: '🏠' },
  { value: 'day_off',      label: 'יום חופש',        emoji: '🌴' },
  { value: 'no_preference', label: 'ללא העדפה',      emoji: '🤷' },
];

const PREF_STYLES: Record<ShiftPreference, string> = {
  office:        'bg-blue-500/15 text-blue-300 border-blue-500/30',
  home:          'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  day_off:       'bg-purple-500/15 text-purple-300 border-purple-500/30',
  no_preference: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

// ─── Constraint Badge ─────────────────────────────────────────────────────────

function ConstraintBadge({ entry, onDelete }: { entry: ConstraintEntry; onDelete?: () => void }) {
  const pref = PREFERENCE_OPTIONS.find((o) => o.value === entry.preference)!;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${PREF_STYLES[entry.preference]}`}
    >
      <span>{pref.emoji}</span>
      <span className="font-medium">{entry.date}</span>
      <span>{pref.label}</span>
      {entry.reason && <span className="text-zinc-400 truncate max-w-[100px]">· {entry.reason}</span>}
      {onDelete && (
        <button
          onClick={onDelete}
          className="mr-auto text-zinc-500 hover:text-rose-400 transition-colors text-base leading-none"
          aria-label="מחק"
        >
          ×
        </button>
      )}
    </motion.div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ConstraintForm({
  existingConstraints = [],
  onSubmit,
  onDelete,
  disabled = false,
  className = '',
}: ConstraintFormProps) {
  const [date, setDate] = useState('');
  const [preference, setPreference] = useState<ShiftPreference>('no_preference');
  const [reason, setReason] = useState('');
  const [prefOpen, setPrefOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPref = PREFERENCE_OPTIONS.find((o) => o.value === preference)!;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!date) { setError('יש לבחור תאריך'); return; }
    setError(null);
    setLoading(true);
    try {
      await onSubmit?.({ date, preference, reason: reason.trim() || undefined });
      setSuccess(true);
      setDate('');
      setReason('');
      setPreference('no_preference');
      setTimeout(() => setSuccess(false), 2500);
    } catch {
      setError('שגיאה בשמירה, נסה שוב');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className={`rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/10">
        <h3 className="text-base font-semibold text-white">הוסף אילוץ לוח זמנים</h3>
        <p className="text-xs text-zinc-500 mt-0.5">ציין תאריכים שבהם יש לך העדפה מיוחדת</p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" /> תאריך
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={disabled}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition disabled:opacity-50"
            style={{ colorScheme: 'dark' }}
          />
        </div>

        {/* Preference selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400">העדפה</label>
          <div className="relative">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setPrefOpen((o) => !o)}
              className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${PREF_STYLES[preference]} disabled:opacity-50`}
            >
              <span className="flex items-center gap-2">
                <span>{selectedPref.emoji}</span>
                <span>{selectedPref.label}</span>
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${prefOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {prefOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setPrefOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.12 }}
                    className="absolute z-20 top-full mt-1 w-full rounded-xl bg-zinc-900/95 backdrop-blur border border-white/10 overflow-hidden shadow-xl"
                  >
                    {PREFERENCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setPreference(opt.value); setPrefOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-zinc-200 hover:bg-white/10 transition-colors"
                      >
                        <span>{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> סיבה (אופציונלי)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={disabled}
            placeholder="הוסף הסבר קצר..."
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition disabled:opacity-50"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-rose-400 bg-rose-500/10 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={disabled || loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold py-2.5 px-4 transition-all shadow-lg shadow-blue-900/30 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : success ? (
            <><CheckCircle2 className="w-4 h-4" /> נשמר!</>
          ) : (
            'שמור אילוץ'
          )}
        </button>
      </form>

      {/* Existing constraints */}
      {existingConstraints.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs font-medium text-zinc-500">אילוצים קיימים</p>
          <AnimatePresence initial={false}>
            {existingConstraints.map((c) => (
              <ConstraintBadge
                key={c.date}
                entry={c}
                onDelete={onDelete ? () => onDelete(c.date) : undefined}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default ConstraintForm;
