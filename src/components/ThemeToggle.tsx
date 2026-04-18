'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/useTheme';

interface ThemeToggleProps {
  className?: string;
  collapsed?: boolean;
}

export function ThemeToggle({ className = '', collapsed = false }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all focus:outline-none group ${className}`}
      style={{ color: 'var(--muted)' }}
      aria-label={isDark ? 'עבור לתצוגה בהירה' : 'עבור לתצוגה כהה'}
      title={collapsed ? (isDark ? 'תצוגה בהירה' : 'תצוגה כהה') : undefined}
    >
      {isDark ? (
        <Sun className="w-5 h-5 shrink-0 group-hover:text-amber-400 transition-colors" />
      ) : (
        <Moon className="w-5 h-5 shrink-0 group-hover:text-blue-400 transition-colors" />
      )}
      {!collapsed && (
        <span className="truncate group-hover:text-white transition-colors">
          {isDark ? 'תצוגה בהירה' : 'תצוגה כהה'}
        </span>
      )}
    </button>
  );
}

export default ThemeToggle;
