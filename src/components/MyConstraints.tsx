'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal, Sun, Sunset, Moon, Coffee, Loader2,
  CheckCircle2, ChevronRight, ChevronLeft, MessageSquare, Trash2,
} from 'lucide-react';
import type { User } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Pref = 'prefer_morning' | 'prefer_afternoon' | 'prefer_night' | 'no_preference' | 'fixed_morning' | 'fixed_afternoon';

interface ConstraintRecord {
  id?: number;
  user_id: number;
  year: number;
  month: number;
  preference: Pref;
  notes?: string;
  created_at?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PREF_OPTIONS: { value: Pref; label: string; sub: string; icon: React.ElementType; color: string; bg: string }[] = [
  { value: 'prefer_morning',   label: 'בוקר',            sub: '06:00–14:00', icon: Sun,     color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  { value: 'prefer_afternoon', label: 'צהריים',           sub: '14:00–22:00', icon: Sunset,  color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { value: 'prefer_night',     label: 'לילה',             sub: '22:00–06:00', icon: Moon,    color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  { value: 'fixed_morning',    label: 'קבוע בוקר',        sub: 'רק בוקר',     icon: Sun,     color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  { value: 'fixed_afternoon',  label: 'קבוע צהריים',      sub: 'רק צהריים',   icon: Coffee,  color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
  { value: 'no_preference',    label: 'ללא העדפה',         sub: 'כל משמרת',    icon: SlidersHorizontal, color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' },
];

const MONTH_NAMES = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MyConstraints({ currentUser }: { currentUser: User }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [constraint, setConstraint] = useState<ConstraintRecord | null>(null);
  const [selected, setSelected] = useState<Pref>('no_preference');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [allConstraints, setAllConstraints] = useState<ConstraintRecord[]>([]);

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Load current month constraint
      const r = await fetch(`/api/constraints?year=${year}&month=${month}`, { credentials: 'include' });
      const d = await r.json();
      const c = d.constraint as ConstraintRecord | null;
      setConstraint(c);
      setSelected(c?.preference ?? 'no_preference');
      setNotes(c?.notes ?? '');

      // Load all constraints history
      const r2 = await fetch(`/api/constraints`, { credentials: 'include' });
      const d2 = await r2.json();
      setAllConstraints(Array.isArray(d2.constraints) ? d2.constraints : []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { void load(); }, [load]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/constraints', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, preference: selected, notes: notes || undefined }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(y: number, m: number) {
    await fetch('/api/constraints', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: y, month: m }),
    });
    await load();
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const isChanged = !constraint || selected !== (constraint.preference ?? 'no_preference') || notes !== (constraint.notes ?? '');

  return (
    <div className="flex flex-col gap-5 max-w-lg mx-auto w-full" dir="rtl">

      {/* ── Month nav ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={prevMonth} className="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <ChevronRight className="w-5 h-5" style={{ color: 'var(--muted)' }} />
        </button>
        <div className="text-center">
          <p className="text-lg font-bold text-white">{monthLabel}</p>
          {isCurrentMonth && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}>החודש הנוכחי</span>}
        </div>
        <button onClick={nextMonth} className="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <ChevronLeft className="w-5 h-5" style={{ color: 'var(--muted)' }} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--muted)' }} />
        </div>
      ) : (
        <>
          {/* ── Current constraint banner ─────────────────────── */}
          {constraint && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#34d399' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                  {PREF_OPTIONS.find(o => o.value === constraint.preference)?.label ?? constraint.preference}
                </p>
                {constraint.notes && <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{constraint.notes}</p>}
              </div>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>שמור</span>
            </motion.div>
          )}

          {/* ── Preference picker ─────────────────────────────── */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="px-4 py-3" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold text-white">העדפת משמרת ל{monthLabel}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>בחר איזה משמרת תתאים לך החודש</p>
            </div>

            <div className="divide-y" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              {PREF_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = selected === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSelected(opt.value)}
                    className="w-full flex items-center gap-4 px-4 py-4 text-right transition-colors active:opacity-70"
                    style={{ background: active ? opt.bg : 'transparent' }}
                  >
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all"
                      style={{ background: active ? opt.bg : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? opt.color + '40' : 'var(--border)'}` }}>
                      <Icon className="w-5 h-5" style={{ color: active ? opt.color : 'var(--muted)' }} />
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-sm font-semibold" style={{ color: active ? opt.color : 'var(--fg)' }}>{opt.label}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{opt.sub}</p>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                      style={{ borderColor: active ? opt.color : 'var(--border)', background: active ? opt.color : 'transparent' }}>
                      {active && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Notes toggle ──────────────────────────────────── */}
          <button
            onClick={() => setShowNotes(v => !v)}
            className="flex items-center gap-2 text-sm w-full px-1"
            style={{ color: showNotes ? '#93c5fd' : 'var(--muted)' }}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{showNotes ? 'הסתר הערה' : 'הוסף הערה (רשות)'}</span>
          </button>

          <AnimatePresence>
            {showNotes && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              >
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="לדוגמה: אני בחופש ב-15–17 לחודש"
                  rows={3}
                  className="textarea-dark w-full text-sm resize-none"
                  style={{ borderRadius: '1rem' }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Save button ───────────────────────────────────── */}
          <motion.button
            onClick={handleSave}
            disabled={saving || !isChanged}
            whileTap={{ scale: 0.97 }}
            className="btn-primary w-full py-4 text-base font-semibold rounded-2xl disabled:opacity-40"
          >
            {saving ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> שומר...</>
            ) : saved ? (
              <><CheckCircle2 className="w-5 h-5" /> נשמר בהצלחה ✓</>
            ) : constraint ? (
              <><SlidersHorizontal className="w-5 h-5" /> עדכן אילוץ</>
            ) : (
              <><SlidersHorizontal className="w-5 h-5" /> שמור אילוץ ראשון</>
            )}
          </motion.button>

          {/* ── History ───────────────────────────────────────── */}
          {allConstraints.length > 0 && (
            <div className="flex flex-col gap-3 mt-2">
              <p className="text-xs font-semibold uppercase tracking-wider px-1" style={{ color: 'var(--muted)' }}>היסטוריית אילוצים</p>
              <div className="flex flex-col gap-2">
                {allConstraints.map((c) => {
                  const opt = PREF_OPTIONS.find(o => o.value === c.preference);
                  const Icon = opt?.icon ?? SlidersHorizontal;
                  const mn = `${MONTH_NAMES[(c.month ?? 1) - 1]} ${c.year}`;
                  return (
                    <motion.div
                      key={`${c.year}-${c.month}`}
                      layout
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: opt?.bg ?? 'transparent' }}>
                        <Icon className="w-4 h-4" style={{ color: opt?.color ?? 'var(--muted)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{mn}</p>
                        <p className="text-xs" style={{ color: opt?.color ?? 'var(--muted)' }}>{opt?.label}</p>
                        {c.notes && <p className="text-xs truncate mt-0.5" style={{ color: 'var(--muted)' }}>{c.notes}</p>}
                      </div>
                      {(c.year > now.getFullYear() || (c.year === now.getFullYear() && c.month >= now.getMonth() + 1)) && (
                        <button onClick={() => handleDelete(c.year, c.month)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                          style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)' }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
