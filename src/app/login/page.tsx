'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, LogIn, AlertCircle, Loader2, Calendar } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim()) { setError('נא להזין שם משתמש'); return; }
    if (!password) { setError('נא להזין סיסמה'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'שם משתמש או סיסמה שגויים');
        setLoading(false);
        return;
      }
      const dest = data?.user?.role === 'admin' ? '/admin' : '/dashboard';
      router.push(dest);
    } catch {
      setError('שגיאת תקשורת – נסה שוב');
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-3 mb-8 relative z-10"
      >
        <motion.div
          initial={{ scale: 0.7, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #2563eb, #6366f1)' }}
        >
          <Calendar className="w-8 h-8 text-white" />
        </motion.div>
        <h1 className="text-2xl font-bold text-white">מערכת ניהול משמרות</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>ברוכים הבאים — אנא התחברו למערכת</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="data-card w-full max-w-sm p-8 relative z-10"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-sm font-medium text-white">שם משתמש</label>
            <input
              id="username"
              type="text"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
              placeholder="הזן שם משתמש"
              className="input-dark"
              dir="ltr"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-white">סיסמה</label>
            <div className="relative">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="הזן סיסמה"
                className="input-dark"
                style={{ paddingLeft: '2.5rem' }}
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--muted)' }}
                tabIndex={-1}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            כניסה
          </button>
        </form>
      </motion.div>

      {/* Demo hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-6 w-full max-w-sm relative z-10"
      >
        <div className="rounded-xl px-5 py-4 text-sm" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24' }}>
          <p className="font-semibold mb-1">פרטי כניסה לדמו</p>
          <code className="text-xs rounded px-2 py-0.5" style={{ background: 'rgba(245,158,11,0.15)' }}>admin / Admin123!</code>
        </div>
      </motion.div>

      <p className="mt-8 text-xs relative z-10" style={{ color: 'var(--muted)' }}>
        © {new Date().getFullYear()} מערכת ניהול משמרות
      </p>
    </div>
  );
}
