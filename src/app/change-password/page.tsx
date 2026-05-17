'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, KeyRound, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Verify user is logged in
    fetch('/api/auth', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { router.push('/login'); return; }
        setUserName(data.user?.full_name || data.user?.username || '');
        // If no need to change password, redirect to dashboard
        if (!data.must_change_password && !data.user?.must_change_password) {
          router.push('/dashboard');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!currentPassword) { setError('נא להזין סיסמה נוכחית'); return; }
    if (newPassword.length < 8) { setError('הסיסמה החדשה חייבת להכיל לפחות 8 תווים'); return; }
    if (newPassword === currentPassword) { setError('הסיסמה החדשה חייבת להיות שונה מהנוכחית'); return; }
    if (newPassword !== confirmPassword) { setError('הסיסמאות אינן תואמות'); return; }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'שגיאה בשינוי הסיסמה');
        setLoading(false);
        return;
      }
      // Success — redirect to dashboard
      router.push('/dashboard');
    } catch {
      setError('שגיאת תקשורת — נסה שוב');
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-3 mb-8 relative z-10"
      >
        <motion.div
          initial={{ scale: 0.7 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
        >
          <KeyRound className="w-8 h-8 text-white" />
        </motion.div>
        <h1 className="text-2xl font-bold text-white">בחר סיסמה אישית</h1>
        {userName && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>שלום {userName}, נא להגדיר סיסמה חדשה לפני הכניסה</p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="data-card w-full max-w-sm p-8 relative z-10"
      >
        {/* Info banner */}
        <div className="rounded-xl px-4 py-3 mb-5 text-sm flex items-start gap-2" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>זוהי כניסתך הראשונה. הסיסמה חייבת להכיל לפחות 8 תווים.</span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Current password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white">סיסמה זמנית (Pass1234)</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="הזן סיסמה זמנית"
                className="input-dark"
                style={{ paddingLeft: '2.5rem' }}
                dir="ltr"
              />
              <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--muted)' }} tabIndex={-1}>
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white">סיסמה חדשה</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="לפחות 8 תווים"
                className="input-dark"
                style={{ paddingLeft: '2.5rem' }}
                dir="ltr"
              />
              <button type="button" onClick={() => setShowNew(p => !p)} className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--muted)' }} tabIndex={-1}>
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword.length > 0 && (
              <div className="flex gap-1 mt-1">
                {[8, 10, 12].map(len => (
                  <div key={len} className="h-1 flex-1 rounded-full transition-all" style={{ background: newPassword.length >= len ? '#22c55e' : 'var(--border)' }} />
                ))}
                <span className="text-xs mr-1" style={{ color: newPassword.length >= 8 ? '#22c55e' : 'var(--muted)' }}>
                  {newPassword.length >= 12 ? 'חזקה' : newPassword.length >= 10 ? 'בינונית' : newPassword.length >= 8 ? 'בסיסית' : 'קצרה מדי'}
                </span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white">אישור סיסמה</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="הזן שוב את הסיסמה החדשה"
              className="input-dark"
              dir="ltr"
            />
            {confirmPassword && newPassword && (
              <p className="text-xs mt-0.5" style={{ color: confirmPassword === newPassword ? '#22c55e' : '#f87171' }}>
                {confirmPassword === newPassword ? '✓ הסיסמאות תואמות' : '✗ הסיסמאות אינן תואמות'}
              </p>
            )}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-sm rounded-xl px-4 py-3"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            שמור סיסמה וכנס
          </button>
        </form>
      </motion.div>

      <div className="mt-8 flex flex-col items-center gap-1 relative z-10">
        <p className="text-xs" style={{ color: 'var(--muted)' }}>© {new Date().getFullYear()} מערכת ניהול משמרות הפניקס</p>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>כל הזכויות שייכות ל TH AI Project</p>
      </div>
    </div>
  );
}
