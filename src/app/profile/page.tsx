'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UserCircle, Loader2, Save, Key, CalendarRange, LogOut, ArrowRight } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import * as Toast from '@radix-ui/react-toast';

interface CurrentUser {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  role: 'admin' | 'manager' | 'employee';
}

interface ShiftEntry {
  id: number;
  date: string;
  shift_type: string;
}

const SHIFT_LABELS: Record<string, string> = {
  morning: 'בוקר', afternoon: 'אחה"צ', night: 'לילה',
  day_off: 'יום חופש', sick: 'מחלה', vacation: 'חופשה',
  holiday: 'חג', duty: 'כוננות', weekend_duty: 'כוננות סופ"ש',
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [shifts, setShifts] = useState<ShiftEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');

  // password form
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  // toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastOk, setToastOk] = useState(true);

  function showToast(msg: string, ok = true) {
    setToastMsg(msg); setToastOk(ok); setToastOpen(true);
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth', { credentials: 'include' });
      if (!authRes.ok) { router.push('/login'); return; }

      const profileRes = await fetch('/api/profile', { credentials: 'include' });
      if (!profileRes.ok) { router.push('/login'); return; }
      const { user: u } = await profileRes.json();
      setUser(u);
      setFullName(u.full_name ?? '');
      setEmail(u.email ?? '');
      setPhone(u.phone ?? '');
      setDepartment(u.department ?? '');

      const now = new Date();
      const schedRes = await fetch(`/api/schedule?year=${now.getFullYear()}&month=${now.getMonth() + 1}`, { credentials: 'include' });
      const schedJson = await schedRes.json().catch(() => ({}));
      let allShifts: ShiftEntry[] = [];
      if (schedJson.entries) allShifts = schedJson.entries;
      else if (schedJson.schedule) {
        for (const row of schedJson.schedule) {
          if (row.user_id === u.id || (row.entries && row.entries[0]?.user_id === u.id)) {
            allShifts = row.entries ?? [];
            break;
          }
        }
      }
      setShifts(allShifts.filter((s: ShiftEntry) => s).slice(0, 10));
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, email, phone, department }),
    });
    if (res.ok) {
      showToast('הפרופיל עודכן בהצלחה');
      await loadData();
    } else {
      const j = await res.json().catch(() => ({}));
      showToast(j.error ?? 'שגיאה בעדכון', false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confirmPwd) { showToast('הסיסמאות אינן תואמות', false); return; }
    if (newPwd.length < 8) { showToast('הסיסמה חייבת להכיל לפחות 8 תווים', false); return; }
    const res = await fetch('/api/profile', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change_password', old_password: oldPwd, new_password: newPwd }),
    });
    if (res.ok) {
      showToast('הסיסמה שונתה בהצלחה');
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
    } else {
      const j = await res.json().catch(() => ({}));
      showToast(j.error ?? 'שגיאה בשינוי סיסמה', false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE', credentials: 'include' });
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--muted)' }} />
      </div>
    );
  }
  if (!user) return null;

  const isAdmin = user.role !== 'employee';

  return (
    <Toast.Provider swipeDirection="right">
      <div className="min-h-screen md:flex" dir="rtl">
        <Sidebar
          user={{ name: user.full_name, email: user.email, role: user.role }}
          isAdmin={isAdmin}
          onLogout={handleLogout}
        />

        <main className="flex-1 app-shell mobile-safe-bottom">
          <div className="page-grid">

            {/* Header */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
                  <UserCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h1 className="section-title">פרופיל אישי</h1>
                  <p className="section-subtitle">{user.full_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => router.push('/dashboard')} className="btn-secondary hidden sm:inline-flex">
                  <ArrowRight className="w-4 h-4" /> חזור
                </button>
                <button onClick={handleLogout} className="btn-secondary hidden sm:inline-flex">
                  <LogOut className="w-4 h-4" /> יציאה
                </button>
              </div>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Profile form */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="data-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <UserCircle className="w-4 h-4 text-blue-400" />
                  <h2 className="text-base font-semibold text-white">פרטים אישיים</h2>
                </div>
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>שם מלא</label>
                    <input
                      className="form-input w-full"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>אימייל</label>
                    <input
                      className="form-input w-full"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>טלפון</label>
                    <input
                      className="form-input w-full"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>מחלקה</label>
                    <input
                      className="form-input w-full"
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn-primary self-start">
                    <Save className="w-4 h-4" /> שמור שינויים
                  </button>
                </form>
              </motion.div>

              {/* Password form */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="data-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="w-4 h-4 text-violet-400" />
                  <h2 className="text-base font-semibold text-white">שינוי סיסמה</h2>
                </div>
                <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>סיסמה נוכחית</label>
                    <input
                      className="form-input w-full"
                      type="password"
                      value={oldPwd}
                      onChange={e => setOldPwd(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>סיסמה חדשה</label>
                    <input
                      className="form-input w-full"
                      type="password"
                      value={newPwd}
                      onChange={e => setNewPwd(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>אישור סיסמה</label>
                    <input
                      className="form-input w-full"
                      type="password"
                      value={confirmPwd}
                      onChange={e => setConfirmPwd(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary self-start">
                    <Key className="w-4 h-4" /> שנה סיסמה
                  </button>
                </form>
              </motion.div>
            </div>

            {/* Recent shifts */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="data-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <CalendarRange className="w-4 h-4 text-amber-400" />
                <h2 className="text-base font-semibold text-white">משמרות אחרונות</h2>
              </div>
              <div className="flex flex-col gap-2">
                {shifts.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>אין משמרות לחודש זה</p>
                ) : (
                  shifts.map(s => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl px-4 py-3"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                      <span className="text-sm text-white">{new Date(s.date + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                      <span className="badge-soft text-xs">{SHIFT_LABELS[s.shift_type] ?? s.shift_type}</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

          </div>
        </main>
      </div>

      {/* Toast */}
      <Toast.Root
        open={toastOpen}
        onOpenChange={setToastOpen}
        className="rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 fixed bottom-6 left-6 z-50"
        style={{
          background: toastOk ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toastOk ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
          color: toastOk ? '#34d399' : '#f87171',
        }}
      >
        <Toast.Description className="text-sm font-medium">{toastMsg}</Toast.Description>
        <Toast.Close className="text-xs opacity-60 hover:opacity-100">✕</Toast.Close>
      </Toast.Root>
      <Toast.Viewport />
    </Toast.Provider>
  );
}
