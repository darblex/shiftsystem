'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldCheck, Plus, Loader2, LogOut, ArrowRight } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import DutyRoster from '@/components/DutyRoster';
import PushNotificationToggle from '@/components/PushNotificationToggle';

interface CurrentUser {
  id: number;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
}

export default function DutyPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h1 className="section-title flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-red-400" />
                לוח תורנויות
              </h1>
              <p className="section-subtitle">תורנויות וכוננויות בצורה פשוטה — לפי חודש, עובד ותאריך</p>
            </div>
            <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full lg:w-auto">
              {isAdmin && (
                <span className="badge-soft flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1">
                  <Plus className="w-3 h-3" />
                  לחץ על יום להוספת תורנות
                </span>
              )}
              <div className="col-span-2 sm:col-span-1 flex justify-center sm:block">
                <PushNotificationToggle />
              </div>
              <button type="button" onClick={() => router.push('/dashboard')} className="btn-secondary w-full sm:w-auto">
                <ArrowRight className="w-4 h-4" /> חזור
              </button>
              <button type="button" onClick={handleLogout} className="btn-secondary w-full sm:w-auto">
                <LogOut className="w-4 h-4" /> יציאה
              </button>
            </div>
          </motion.div>

          {/* Roster */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="data-card p-3 sm:p-4 md:p-6 no-x-scroll"
          >
            <DutyRoster currentUser={user} />
          </motion.div>

        </div>
      </main>
    </div>
  );
}
