'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftRight, X, Check, XCircle, Clock, Loader2, PlusCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { ShiftRequest, ShiftType } from '@/types';
import { SHIFT_ABBREV, SHIFT_CLASS, SHIFT_LABEL } from './shiftMeta';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<ShiftRequest['status'], string> = {
  pending: 'ממתין',
  approved: 'אושר',
  rejected: 'נדחה',
  cancelled: 'בוטל',
};
const STATUS_COLOR: Record<ShiftRequest['status'], string> = {
  pending: '#fbbf24',
  approved: '#4ade80',
  rejected: '#f87171',
  cancelled: '#94a3b8',
};

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('he-IL', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

const SHIFT_TYPES: ShiftType[] = ['morning', 'afternoon', 'night', 'duty', 'weekend_duty', 'day_off', 'sick', 'vacation', 'holiday'];

// ─── New Request Form ─────────────────────────────────────────────────────────

function NewRequestForm({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [targetDate, setTargetDate] = useState('');
  const [currentShift, setCurrentShift] = useState<ShiftType>('morning');
  const [requestedShift, setRequestedShift] = useState<ShiftType>('day_off');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetDate) { setError('חובה לבחור תאריך'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDate, currentShift, requestedShift, reason: reason || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? 'שגיאה ביצירת הבקשה'); return; }
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} dir="rtl" className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-white mb-1.5">תאריך מבוקש</label>
          <input
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            className="input-dark text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white mb-1.5">משמרת נוכחית</label>
          <select value={currentShift} onChange={e => setCurrentShift(e.target.value as ShiftType)} className="select-dark text-sm">
            {SHIFT_TYPES.map(t => <option key={t} value={t}>{SHIFT_LABEL[t]}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-white mb-1.5">משמרת מבוקשת</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {SHIFT_TYPES.map(t => (
            <label
              key={t}
              className="flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all text-xs"
              style={{
                background: requestedShift === t ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${requestedShift === t ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
              }}
            >
              <input type="radio" name="requestedShift" value={t} checked={requestedShift === t}
                onChange={() => setRequestedShift(t)} className="sr-only" />
              <span className={`shift-badge ${SHIFT_CLASS[t]}`}>{SHIFT_ABBREV[t]}</span>
              <span className="text-white truncate">{SHIFT_LABEL[t]}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-white mb-1.5">סיבה (אופציונלי)</label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="הסבר קצר..."
          rows={2}
          className="textarea-dark resize-none text-sm"
          maxLength={500}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm py-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
          שלח בקשה
        </button>
        <button type="button" onClick={onClose} className="btn-secondary px-4 text-sm py-2">ביטול</button>
      </div>
    </form>
  );
}

// ─── Request Row ──────────────────────────────────────────────────────────────

function RequestRow({
  req,
  isAdmin,
  onAction,
}: {
  req: ShiftRequest;
  isAdmin: boolean;
  onAction: (id: number, status: 'approved' | 'rejected' | 'cancelled', note?: string) => Promise<void>;
}) {
  const [acting, setActing] = useState(false);
  const [note, setNote] = useState('');
  const [expanded, setExpanded] = useState(false);

  async function act(status: 'approved' | 'rejected' | 'cancelled') {
    setActing(true);
    try { await onAction(req.id, status, note || undefined); }
    finally { setActing(false); }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      dir="rtl"
    >
      <div className="flex items-center gap-3 flex-wrap">
        {/* Date & requester */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{req.requester_name ?? `משתמש ${req.requester_id}`}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{formatDate(req.target_date)}</p>
        </div>

        {/* Shift arrow */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`shift-badge ${SHIFT_CLASS[req.current_shift]}`}>{SHIFT_ABBREV[req.current_shift]}</span>
          <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--muted)' }} />
          <span className={`shift-badge ${SHIFT_CLASS[req.requested_shift]}`}>{SHIFT_ABBREV[req.requested_shift]}</span>
        </div>

        {/* Status badge */}
        <span
          className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ color: STATUS_COLOR[req.status], background: `${STATUS_COLOR[req.status]}1a`, border: `1px solid ${STATUS_COLOR[req.status]}33` }}
        >
          {req.status === 'pending' && <Clock className="w-3 h-3" />}
          {req.status === 'approved' && <Check className="w-3 h-3" />}
          {req.status === 'rejected' && <XCircle className="w-3 h-3" />}
          {STATUS_LABEL[req.status]}
        </span>

        {/* Expand toggle */}
        <button onClick={() => setExpanded(v => !v)} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--muted)' }}>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t mt-3 flex flex-col gap-2" style={{ borderColor: 'var(--border)' }}>
              {req.reason && (
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  <span className="font-medium text-white">סיבה: </span>{req.reason}
                </p>
              )}
              {req.admin_note && (
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  <span className="font-medium text-white">הערת מנהל: </span>{req.admin_note}
                </p>
              )}
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {SHIFT_LABEL[req.current_shift]} → {SHIFT_LABEL[req.requested_shift]}
              </p>

              {/* Admin actions */}
              {isAdmin && req.status === 'pending' && (
                <div className="flex flex-col gap-2 mt-1">
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="הערה למנהל (אופציונלי)"
                    className="input-dark text-xs py-2"
                    maxLength={200}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => act('approved')}
                      disabled={acting}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors"
                      style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}
                    >
                      {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      אשר
                    </button>
                    <button
                      onClick={() => act('rejected')}
                      disabled={acting}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                    >
                      {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                      דחה
                    </button>
                  </div>
                </div>
              )}

              {/* Employee cancel */}
              {!isAdmin && req.status === 'pending' && (
                <button
                  onClick={() => act('cancelled')}
                  disabled={acting}
                  className="self-start flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{ background: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.25)' }}
                >
                  {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                  בטל בקשה
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SwapRequestsProps {
  currentUser: { id: number; role: string; full_name: string };
}

export default function SwapRequests({ currentUser }: SwapRequestsProps) {
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ShiftRequest['status'] | 'all'>('all');
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (!isAdmin) params.set('userId', String(currentUser.id));
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/requests?${params}`, { credentials: 'include' });
      const json = await res.json().catch(() => ({ requests: [] }));
      setRequests(json.requests ?? []);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentUser.id, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  async function handleAction(id: number, status: 'approved' | 'rejected' | 'cancelled', note?: string) {
    await fetch(`/api/requests/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNote: note }),
    });
    await load();
  }

  const pending = requests.filter(r => r.status === 'pending').length;

  return (
    <div dir="rtl" className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="section-title flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-400" />
            בקשות שינוי משמרת
            {pending > 0 && (
              <span className="inline-flex items-center justify-center rounded-full text-xs font-bold px-2 h-5"
                style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                {pending}
              </span>
            )}
          </h2>
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="select-dark text-sm py-1.5"
          style={{ width: 'auto', minWidth: 110 }}
        >
          <option value="all">הכל</option>
          <option value="pending">ממתין</option>
          <option value="approved">אושר</option>
          <option value="rejected">נדחה</option>
          <option value="cancelled">בוטל</option>
        </select>

        {/* New request button */}
        <button
          onClick={() => setShowForm(v => !v)}
          className="btn-primary text-sm py-2 no-print"
        >
          <PlusCircle className="w-4 h-4" />
          בקשה חדשה
        </button>
      </div>

      {/* New request form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="data-card p-5"
          >
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-blue-400" />
              בקשת שינוי משמרת חדשה
            </h3>
            <NewRequestForm onCreated={load} onClose={() => setShowForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2" style={{ color: 'var(--muted)' }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>טוען בקשות...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
          <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">אין בקשות</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {requests.map(r => (
            <RequestRow key={r.id} req={r} isAdmin={isAdmin} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  );
}
