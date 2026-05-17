'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarRange, LayoutGrid, Loader2, LogOut, BarChart2, ArrowRight, SlidersHorizontal } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import ShiftBoard from '@/components/ShiftBoard';
import WeekView from '@/components/WeekView';
import MonthlySummary from '@/components/MonthlySummary';
import MyConstraints from '@/components/MyConstraints';

interface CurrentUser {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  active: number;
  created_at: string;
  updated_at: string;
}

type ViewMode = 'monthly' | 'weekly' | 'constraints' | 'summary';

const VIEW_BUTTONS = [
  { key: 'monthly', label: 'לוח חודשי', sub: 'כל החודש לפי עובדים', icon: LayoutGrid, accent: '#3b82f6' },
  { key: 'weekly', label: 'לוח שבועי', sub: 'השבוע הקרוב בצורה ברורה', icon: CalendarRange, accent: '#22d3ee' },
  { key: 'constraints', label: 'האילוצים שלי', sub: 'בחירת העדפות משמרת', icon: SlidersHorizontal, accent: '#f59e0b' },
  { key: 'summary', label: 'סיכום חודש', sub: 'סטטיסטיקה וייצוא', icon: BarChart2, accent: '#a855f7' },
] as const;

export default function SchedulePage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('monthly');

  const loadUser = useCallback(async () => {
    const res = await fetch('/api/auth', { credentials: 'include' });
    if (!res.ok) { router.push('/login'); return; }
    const json = await res.json();
    setUser(json.user);
    setLoading(false);
  }, [router]);

  useEffect(() => { void loadUser(); }, [loadUser]);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('view') as ViewMode | null;
    if (requested && ['monthly', 'weekly', 'constraints', 'summary'].includes(requested)) {
      setView(requested);
    }
  }, []);

  function changeView(nextView: ViewMode) {
    setView(nextView);
    const url = nextView === 'monthly' ? '/schedule' : `/schedule?view=${nextView}`;
    window.history.replaceState(null, '', url);
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
    <div className="min-h-screen md:flex" dir="rtl">
      <Sidebar
        user={{ name: user.full_name, email: user.email, role: user.role }}
        isAdmin={isAdmin}
        onLogout={handleLogout}
      />

      <main className="flex-1 app-shell mobile-safe-bottom">
        <div className="page-grid">

          {/* Header */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="section-title flex items-center gap-2">
                  <CalendarRange className="w-6 h-6 text-blue-400" />
                  לוח משמרות
                </h1>
                <p className="section-subtitle">בחר תצוגה, עדכן אילוצים, ונהל משמרות בצורה נוחה מכל טלפון</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              {/* View actions — vertical on phones, compact on desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 w-full">
                {VIEW_BUTTONS.map(({ key, label, sub, icon: Icon, accent }) => {
                  const active = view === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={active}
                      title={label}
                      onClick={() => changeView(key)}
                      className="touch-target group flex items-center gap-3 rounded-3xl px-4 py-3.5 text-right transition-all active:scale-[0.98]"
                      style={{
                        background: active ? `linear-gradient(135deg, ${accent}33, rgba(14,165,233,0.18))` : 'var(--bg-card)',
                        color: active ? '#fff' : 'var(--fg)',
                        border: `1px solid ${active ? accent + '66' : 'var(--border)'}`,
                        boxShadow: active ? `0 14px 34px ${accent}22` : 'none',
                      }}
                    >
                      <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: active ? accent : 'rgba(255,255,255,0.06)', color: active ? '#fff' : accent }}>
                        <Icon className="w-5 h-5" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-black truncate">{label}</span>
                        <span className="block text-xs truncate mt-0.5" style={{ color: active ? 'rgba(255,255,255,0.75)' : 'var(--muted)' }}>{sub}</span>
                      </span>
                      {active && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: accent }} />}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 sm:flex items-center gap-2">
                <button type="button" onClick={() => router.push('/dashboard')} className="btn-secondary w-full sm:w-auto">
                  <ArrowRight className="w-4 h-4" /> חזור
                </button>
                <button type="button" onClick={handleLogout} className="btn-secondary w-full sm:w-auto">
                  <LogOut className="w-4 h-4" /> יציאה
                </button>
              </div>
            </div>
          </motion.div>

          {/* Board */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="data-card p-3 sm:p-4 md:p-6 no-x-scroll"
          >
            {view === 'monthly' ? (
              <ShiftBoard currentUser={user} />
            ) : view === 'weekly' ? (
              <WeekView currentUser={user} />
            ) : view === 'constraints' ? (
              <MyConstraints currentUser={user} />
            ) : (
              <MonthlySummary />
            )}
          </motion.div>

        </div>
      </main>
    </div>
  );
}
