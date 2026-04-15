'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ShiftType } from '@/types';
import { SHIFT_ABBREV, SHIFT_CLASS, SHIFT_EDIT_ORDER, SHIFT_LABEL, SHIFT_TIME_RANGE } from './shiftMeta';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShiftOption {
  value: ShiftType;
  label: string;
  timeRange: string;
  colorClass: string;
}

const SHIFT_OPTIONS: ShiftOption[] = SHIFT_EDIT_ORDER.map((value) => ({
  value,
  label: SHIFT_LABEL[value],
  timeRange: SHIFT_TIME_RANGE[value] ?? '—',
  colorClass: SHIFT_CLASS[value],
}));

export interface ShiftEditModalProps {
  open: boolean;
  employeeName: string;
  date: string; // yyyy-MM-dd
  currentShift?: ShiftType;
  onSave: (shift: ShiftType, notes: string) => Promise<void>;
  onClose: () => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ShiftEditModal({ open, employeeName, date, currentShift, onSave, onClose }: ShiftEditModalProps) {
  const [selected, setSelected] = useState<ShiftType>(currentShift ?? 'day_off');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(currentShift ?? 'day_off');
    setNotes('');
  }, [open, currentShift]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(selected, notes);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed inset-x-4 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 w-auto md:w-full md:max-w-md"
            dir="rtl"
          >
            <div className="data-card p-6 rounded-t-3xl md:rounded-3xl">
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-white">עריכת משמרת</h2>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
                    {employeeName} · {formatDate(date)}
                  </p>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl transition-colors" style={{ color: 'var(--muted)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Shift radio options */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {SHIFT_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: selected === opt.value ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${selected === opt.value ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
                    }}
                  >
                    <input
                      type="radio"
                      name="shift"
                      value={opt.value}
                      checked={selected === opt.value}
                      onChange={() => setSelected(opt.value)}
                      className="sr-only"
                    />
                    <span className={`shift-badge ${opt.colorClass} text-xs`}>
                      {SHIFT_ABBREV[opt.value]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{opt.label}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{opt.timeRange}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Notes */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-white mb-1.5">הערות</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="הערות (אופציונלי)"
                  rows={2}
                  className="textarea-dark resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  שמור
                </button>
                <button onClick={onClose} className="btn-secondary flex-1">
                  ביטול
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export { SHIFT_ABBREV, SHIFT_CLASS } from './shiftMeta';
