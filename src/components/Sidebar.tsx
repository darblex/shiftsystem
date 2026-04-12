'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  Users,
  LayoutDashboard,
  ClipboardList,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Settings,
  type LucideIcon,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_ITEMS: SidebarItem[] = [
  { href: '/dashboard',   label: 'דשבורד',     icon: LayoutDashboard },
  { href: '/schedule',    label: 'לוח זמנים',  icon: CalendarDays },
  { href: '/duty',        label: 'תורנויות',   icon: ShieldCheck },
  { href: '/constraints', label: 'אילוצים',    icon: ClipboardList },
  { href: '/employees',   label: 'עובדים',     icon: Users,         adminOnly: true },
  { href: '/settings',    label: 'הגדרות',     icon: Settings },
];

// ─── Avatar ──────────────────────────────────────────────────────────────────

function SidebarAvatar({ user }: { user?: SidebarUser }) {
  const initials = user?.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('') ?? '?';

  return (
    <div className="relative w-9 h-9 shrink-0">
      {user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.name}
          className="w-full h-full rounded-full object-cover ring-2 ring-white/10"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white/10">
          {initials}
        </div>
      )}
      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-zinc-950" />
    </div>
  );
}

// ─── NavLink ─────────────────────────────────────────────────────────────────

function SidebarLink({ item, collapsed }: { item: SidebarItem; collapsed: boolean }) {
  const pathname = usePathname();
  const Icon = item.icon;
  const active = pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      className={`
        relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-blue-500/40
        ${active
          ? 'bg-blue-500/20 text-blue-300'
          : 'text-zinc-400 hover:text-white hover:bg-white/8'
        }
      `}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
    >
      {active && (
        <motion.span
          layoutId="sidebar-indicator"
          className="absolute inset-0 rounded-xl bg-blue-500/15 border border-blue-500/25"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <div className="relative z-10 shrink-0">
        <Icon
          className={`w-5 h-5 transition-colors ${active ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}
          strokeWidth={active ? 2.2 : 1.8}
        />
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

// ─── Component ───────────────────────────────────────────────────────────────

export function Sidebar({
  user,
  isAdmin = false,
  items,
  onLogout,
  className = '',
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = (items ?? DEFAULT_ITEMS).filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <aside
      dir="rtl"
      className={`
        hidden md:flex flex-col
        ${collapsed ? 'w-[68px]' : 'w-[240px]'}
        transition-all duration-300 ease-in-out
        bg-zinc-950/60 backdrop-blur-xl
        border-l border-white/10
        h-screen sticky top-0
        overflow-hidden
        ${className}
      `}
      aria-label="תפריט צד"
    >
      {/* Brand / collapse toggle */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-white/10">
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2 overflow-hidden"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                S
              </div>
              <span className="text-white font-semibold text-sm truncate">ShiftSystem</span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors shrink-0"
          aria-label={collapsed ? 'פתח תפריט' : 'צמצם תפריט'}
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronRight className="w-4 h-4" />
          </motion.div>
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map((item) => (
          <SidebarLink key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-2">
        <div className={`flex items-center gap-3 px-2 py-2 ${collapsed ? 'justify-center' : ''}`}>
          <SidebarAvatar user={user} />
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
                <p className="text-[10px] text-zinc-500 truncate">{user?.role}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-rose-400 transition-colors shrink-0"
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
