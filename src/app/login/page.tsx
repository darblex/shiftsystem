'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, AlertCircle, Loader2, Shield } from 'lucide-react';

// ─── Tiny UI primitives ─────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-xl border border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

function Button({
  children,
  type = 'button',
  loading = false,
  disabled = false,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  type?: 'button' | 'submit';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all
        disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

function Input({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  suffix,
  error,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  suffix?: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-gray-50 focus:bg-white
            focus:outline-none focus:ring-2 focus:ring-blue-500 transition
            ${error ? 'border-red-400 focus:ring-red-400' : 'border-gray-200'}
            ${suffix ? 'pl-12' : ''}`}
          dir="ltr"
        />
        {suffix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{suffix}</span>
        )}
      </div>
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

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
      // The server sets the auth cookie; redirect based on role returned
      const dest = data?.user?.role === 'admin' ? '/admin' : '/dashboard';
      router.push(dest);
    } catch {
      setError('שגיאת תקשורת – נסה שוב');
      setLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-10"
    >
      {/* Logo / Brand */}
      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">מערכת ניהול משמרות</h1>
        <p className="text-sm text-gray-500">כניסה למערכת</p>
      </div>

      <Card className="w-full max-w-sm p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            id="username"
            label="שם משתמש"
            value={username}
            onChange={setUsername}
            placeholder="הזן שם משתמש"
            autoComplete="username"
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              סיסמה
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="הזן סיסמה"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-gray-50 focus:bg-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500 transition pl-10
                  ${error ? 'border-red-400' : 'border-gray-200'}`}
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                tabIndex={-1}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            loading={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white w-full mt-1"
          >
            <LogIn className="w-4 h-4" />
            כניסה
          </Button>
        </form>
      </Card>

      {/* Demo hint */}
      <div className="mt-6 w-full max-w-sm">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">פרטי כניסה לדמו</p>
          <p className="font-mono text-xs bg-amber-100 rounded px-2 py-1 inline-block">
            admin / Admin123!
          </p>
          <p className="text-xs text-amber-600 mt-2">
            השתמש בפרטים אלה כדי לגשת למערכת בסביבת הדמו
          </p>
        </div>
      </div>

      <p className="mt-8 text-xs text-gray-400">
        © {new Date().getFullYear()} מערכת ניהול משמרות · כל הזכויות שמורות
      </p>
    </div>
  );
}
