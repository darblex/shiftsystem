'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Loader2 } from 'lucide-react';
import { useState } from 'react';

function monthName(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
}

export interface CopyMonthModalProps {
  open: boolean;
  fromYear: number;
  fromMonth: number;
  toYear: number;
  toMonth: number;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export default function CopyMonthModal({ open, fromYear, fromMonth, toYear, toMonth, onConfirm, onClose }: CopyMonthModalProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      setDone(true);
      setTimeout(() => {
        setDone(false);
        onClose();
      }, 1200);
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
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Copy className="w-5 h-5 text-blue-400" />
                  העתקת לוח משמרות
                </h2>
                <button onClick={onClose} className="p-1.5 rounded-xl" style={{ color: 'var(--muted)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="rounded-xl p-4 mb-5 text-center" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>העתקה מ</p>
                <p className="text-xl font-bold text-white mt-1">{monthName(fromYear, fromMonth)}</p>
                <div className="my-3 text-blue-400 text-2xl">↓</div>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>אל</p>
                <p className="text-xl font-bold text-white mt-1">{monthName(toYear, toMonth)}</p>
              </div>

              <p className="text-sm mb-5 text-center" style={{ color: 'var(--muted)' }}>
                פעולה זו תעתיק את תבנית המשמרות מהחודש הקודם לחודש הנוכחי.
                משמרות קיימות יוחלפו.
              </p>

              <AnimatePresence mode="wait">
                {done ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-3 text-emerald-400 font-semibold"
                  >
                    ✓ הועתק בהצלחה!
                  </motion.div>
                ) : (
                  <motion.div key="actions" className="flex gap-3">
                    <button onClick={handleConfirm} disabled={loading} className="btn-primary flex-1">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                      העתק
                    </button>
                    <button onClick={onClose} className="btn-secondary flex-1">ביטול</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
