'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  Users,
  LayoutDashboard,
  ShieldCheck,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from '@/lib/useTheme';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  adminOnly?: boolean;
}

export interface MobileNavProps {
  isAdmin?: boolean;
  /** Override the default nav items */
  items?: NavItem[];
  className?: string;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'בית',        icon: LayoutDashboard },
  { href: '/schedule',  label: 'משמרות',     icon: CalendarDays },
  { href: '/duty',      label: 'תורנויות',   icon: ShieldCheck },
  { href: '/admin',     label: 'ניהול',      icon: Users, adminOnly: true },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function MobileNav({
  isAdmin = false,
  items,
  className = '',
}: MobileNavProps) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  const navItems = (items ?? DEFAULT_NAV_ITEMS).filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <nav
      dir="rtl"
      className={`
        fixed bottom-0 inset-x-0 z-50
        bg-zinc-950/80 backdrop-blur-xl
        border-t border-white/10
        safe-area-pb
        ${className}
      `}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="ניווט ראשי"
    >
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative flex-1 flex flex-col items-center justify-center gap-0.5
                transition-colors duration-200 focus:outline-none
                ${active ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}
              `}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.span
                  layoutId="mobile-nav-indicator"
                  className="absolute top-0 inset-x-2 h-0.5 rounded-full bg-gradient-to-l from-blue-500 to-indigo-500"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}

              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${active ? 'scale-110' : ''}`}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {item.badge != null && item.badge > 0 && (
                  <span className="absolute -top-1 -left-1 min-w-[16px] h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center px-1 leading-none">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}

        {/* Theme toggle in mobile nav */}
        <button
          onClick={toggle}
          className="relative flex-1 flex flex-col items-center justify-center gap-0.5 text-zinc-500 hover:text-zinc-300 transition-colors duration-200 focus:outline-none"
          aria-label={isDark ? 'תצוגה בהירה' : 'תצוגה כהה'}
        >
          {isDark ? <Sun className="w-5 h-5" strokeWidth={1.8} /> : <Moon className="w-5 h-5" strokeWidth={1.8} />}
          <span className="text-[10px] font-medium leading-none">{isDark ? 'בהיר' : 'כהה'}</span>
        </button>
      </div>
    </nav>
  );
}

export default MobileNav;
