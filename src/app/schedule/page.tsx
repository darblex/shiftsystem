'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarRange, LayoutGrid, Loader2, LogOut, ArrowLeftRight, BarChart2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import ShiftBoard from '@/components/ShiftBoard';
import WeekView from '@/components/WeekView';
import SwapRequests from '@/components/SwapRequests';
import MonthlySummary from '@/components/MonthlySummary';

interface CurrentUser {
  id: number;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
}

type ViewMode = 'monthly' | 'weekly' | 'requests' | 'summary';

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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="section-title flex items-center gap-2">
                <CalendarRange className="w-6 h-6 text-blue-400" />
                לוח משמרות
              </h1>
              <p className="section-subtitle">תצוגה מלאה של לוח העבודה החודשי/שבועי</p>
            </div>

            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {([
                  { key: 'monthly',  label: 'חודשי',   icon: LayoutGrid },
                  { key: 'weekly',   label: 'שבועי',   icon: CalendarRange },
                  { key: 'requests', label: 'בקשות',   icon: ArrowLeftRight },
                  { key: 'summary',  label: 'סיכום',    icon: BarChart2 },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setView(key)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all"
                    style={{
                      background: view === key ? 'rgba(59,130,246,0.2)' : 'var(--bg-card)',
                      color: view === key ? '#93c5fd' : 'var(--muted)',
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              <button onClick={handleLogout} className="btn-secondary hidden sm:inline-flex">
                <LogOut className="w-4 h-4" /> יציאה
              </button>
            </div>
          </motion.div>

          {/* Board */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="data-card p-4 md:p-6"
          >
            {view === 'monthly' ? (
              <ShiftBoard currentUser={user} />
            ) : view === 'weekly' ? (
              <WeekView currentUser={user} />
            ) : view === 'requests' ? (
              <SwapRequests currentUser={user} />
            ) : (
              <MonthlySummary />
            )}
          </motion.div>

        </div>
      </main>
    </div>
  );
}
