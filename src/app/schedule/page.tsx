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
            <div>
              <h1 className="section-title flex items-center gap-2">
                <CalendarRange className="w-6 h-6 text-blue-400" />
                לוח משמרות
              </h1>
              <p className="section-subtitle">תצוגה מלאה של לוח העבודה החודשי/שבועי</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              {/* View toggle — mobile-first grid, no horizontal scroll */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto">
                {([
                  { key: 'monthly',     label: 'חודשי',        icon: LayoutGrid },
                  { key: 'weekly',      label: 'שבועי',        icon: CalendarRange },
                  { key: 'constraints', label: 'האילוצים שלי', icon: SlidersHorizontal },
                  { key: 'summary',     label: 'סיכום',         icon: BarChart2 },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setView(key)}
                    className="touch-target flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-bold transition-all rounded-2xl"
                    style={{
                      background: view === key ? 'linear-gradient(135deg, rgba(37,99,235,0.92), rgba(14,165,233,0.72))' : 'var(--bg-card)',
                      color: view === key ? '#fff' : 'var(--muted)',
                      border: `1px solid ${view === key ? 'rgba(147,197,253,0.35)' : 'var(--border)'}`,
                    }}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <button onClick={() => router.push('/dashboard')} className="btn-secondary">
                  <ArrowRight className="w-4 h-4" /> חזור
                </button>
                <button onClick={handleLogout} className="btn-secondary">
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
