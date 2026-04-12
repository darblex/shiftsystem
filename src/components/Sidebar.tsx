'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarRange,
  CalendarDays,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

export interface SidebarItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  adminOnly?: boolean;
}

export interface SidebarUser {
  name: string;
  email?: string;
  role: string;
  avatarUrl?: string;
}

export interface SidebarProps {
  user?: SidebarUser;
  isAdmin?: boolean;
  items?: SidebarItem[];
  onLogout?: () => void;
  className?: string;
}

const DEFAULT_ITEMS: SidebarItem[] = [
  { href: '/dashboard', label: 'לוח בקרה',       icon: LayoutDashboard },
  { href: '/schedule',  label: 'לוח משמרות',     icon: CalendarRange },
  { href: '/duty',      label: 'תורנויות',       icon: ShieldCheck },
  { href: '/admin',     label: 'ניהול',           icon: Settings, adminOnly: true },
];

function Avatar({ user }: { user?: SidebarUser }) {
  const initials = (user?.name ?? '?').split(' ').slice(0, 2).map((w) => w[0]).join('');
  return (
    <div className="relative w-9 h-9 shrink-0">
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ background: 'linear-gradient(135deg, #2563eb, #a855f7)' }}
        >
          {initials}
        </div>
      )}
      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 bg-emerald-400" style={{ borderColor: 'var(--bg-card)' }} />
    </div>
  );
}

function NavLink({ item, collapsed }: { item: SidebarItem; collapsed: boolean }) {
  const pathname = usePathname();
  const Icon = item.icon;
  const active = pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all focus:outline-none group"
      style={{
        color: active ? '#93c5fd' : 'var(--muted)',
        background: active ? 'rgba(59,130,246,0.12)' : 'transparent',
      }}
      title={collapsed ? item.label : undefined}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl"
          style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.25)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <div className="relative z-10 shrink-0">
        <Icon className="w-5 h-5" style={{ color: active ? '#60a5fa' : 'var(--muted)' }} strokeWidth={active ? 2.2 : 1.8} />
        {item.badge != null && item.badge > 0 && (
          <span className="absolute -top-1 -left-1 min-w-[15px] h-[15px] rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="relative z-10 truncate overflow-hidden whitespace-nowrap"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

export function Sidebar({ user, isAdmin = false, items, onLogout, className = '' }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navItems = (items ?? DEFAULT_ITEMS).filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      dir="rtl"
      className={`hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out overflow-hidden ${className}`}
      style={{
        width: collapsed ? 68 : 240,
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2 overflow-hidden"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #2563eb, #6366f1)' }}>
                <CalendarDays className="w-4 h-4" />
              </div>
              <span className="text-white font-semibold text-sm truncate">לוח משמרות</span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 rounded-lg transition-colors shrink-0"
          style={{ color: 'var(--muted)' }}
          aria-label={collapsed ? 'פתח תפריט' : 'צמצם תפריט'}
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronRight className="w-4 h-4" />
          </motion.div>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2" style={{ borderTop: '1px solid var(--border)' }}>
        <div className={`flex items-center gap-3 px-2 py-2 ${collapsed ? 'justify-center' : ''}`}>
          <Avatar user={user} />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                <p className="text-xs font-medium text-white truncate">{user?.name ?? 'משתמש'}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--muted)' }}>{user?.role}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg transition-colors shrink-0"
              style={{ color: 'var(--muted)' }}
              aria-label="התנתקות"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
