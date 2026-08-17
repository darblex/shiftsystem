'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  LayoutDashboard,
  ShieldCheck,
  Clock,
  Settings,
  BarChart2,
  UserCircle,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  adminOnly?: boolean;
}

export interface MobileNavProps {
  isAdmin?: boolean;
  items?: NavItem[];
  className?: string;
}

const EMPLOYEE_ITEMS: NavItem[] = [
  { href: '/dashboard',  label: 'בית',     icon: LayoutDashboard },
  { href: '/schedule',   label: 'משמרות',  icon: CalendarDays },
  { href: '/duty',       label: 'תורנויות', icon: ShieldCheck },
  { href: '/attendance', label: 'נוכחות',   icon: Clock },
  { href: '/profile',    label: 'פרופיל',   icon: UserCircle },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'בית',    icon: LayoutDashboard },
  { href: '/schedule',  label: 'משמרות', icon: CalendarDays },
  { href: '/duty',      label: 'תורנויות', icon: ShieldCheck },
  { href: '/attendance', label: 'נוכחות', icon: Clock },
  { href: '/reports',   label: 'דוחות',  icon: BarChart2 },
  { href: '/admin',     label: 'ניהול',  icon: Settings },
  { href: '/profile',   label: 'פרופיל', icon: UserCircle },
];

export function MobileNav({ isAdmin = false, items, className = '' }: MobileNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const adminExtras = isAdmin && !items ? ADMIN_ITEMS.slice(4) : [];
  const navItems = items ?? (isAdmin ? ADMIN_ITEMS.slice(0, 4) : EMPLOYEE_ITEMS);
  const moreActive = adminExtras.some((item) => pathname === item.href || pathname.startsWith(item.href + '/'));

  return (
    <nav
      dir="rtl"
      className={`fixed bottom-0 inset-x-0 z-50 md:hidden px-3 pb-3 ${className}`}
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      aria-label="ניווט ראשי"
    >
      {adminExtras.length > 0 && moreOpen && (
        <div
          className="mx-auto mb-2 max-w-md rounded-2xl p-2 grid grid-cols-3 gap-1 shadow-2xl"
          style={{ background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          {adminExtras.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="min-h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-bold"
                style={{ color: active ? '#fff' : '#8ea0b8', background: active ? 'rgba(37,99,235,0.3)' : 'transparent' }}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
      <div
        className="mx-auto max-w-md h-[72px] grid items-center rounded-[1.55rem] px-1.5 shadow-2xl"
        style={{
          gridTemplateColumns: `repeat(${navItems.length + (adminExtras.length ? 1 : 0)}, minmax(0, 1fr))`,
          background: 'linear-gradient(180deg, rgba(15,23,42,0.94), rgba(2,6,23,0.92))',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 20px 55px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.08)',
          backdropFilter: 'blur(22px)',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative h-[58px] rounded-[1.15rem] flex flex-col items-center justify-center gap-1 transition focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              style={{ color: active ? '#ffffff' : '#8ea0b8' }}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.span
                  layoutId="mobile-nav-active-pill"
                  className="absolute inset-1 rounded-[1rem]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(14,165,233,0.78))',
                    boxShadow: '0 10px 30px rgba(37,99,235,0.35)',
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}

              <span className="relative z-10">
                <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`} strokeWidth={active ? 2.4 : 1.9} />
                {item.badge != null && item.badge > 0 && (
                  <span className="absolute -top-2 -left-2 min-w-[17px] h-[17px] rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center px-1 leading-none">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </span>
              <span className="relative z-10 text-[10px] font-bold leading-none truncate max-w-full px-1">{item.label}</span>
            </Link>
          );
        })}
        {adminExtras.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className="relative h-[58px] rounded-[1.15rem] flex flex-col items-center justify-center gap-1 transition focus:outline-none focus:ring-2 focus:ring-blue-400/30"
            style={{ color: moreOpen || moreActive ? '#ffffff' : '#8ea0b8' }}
            aria-expanded={moreOpen}
            aria-label="אפשרויות נוספות"
          >
            {(moreOpen || moreActive) && (
              <motion.span
                className="absolute inset-1 rounded-[1rem]"
                style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.95), rgba(14,165,233,0.78))' }}
              />
            )}
            <MoreHorizontal className="relative z-10 w-5 h-5" />
            <span className="relative z-10 text-[10px] font-bold">עוד</span>
          </button>
        )}
      </div>
    </nav>
  );
}

export default MobileNav;
