'use client';

import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type StatTrend = 'up' | 'down' | 'neutral';

export interface StatCard {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: StatTrend;
  trendValue?: string;
  /** Tailwind gradient classes, e.g. 'from-blue-500 to-indigo-600' */
  gradient?: string;
  /** 0-100 */
  progress?: number;
}

export interface StatsCardsProps {
  stats: StatCard[];
  /** Grid columns: 2 | 3 | 4 (default auto responsive) */
  cols?: 2 | 3 | 4;
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-purple-500 to-violet-600',
  'from-cyan-500 to-blue-600',
];

const TREND_STYLES: Record<StatTrend, { color: string; arrow: string }> = {
  up:      { color: 'text-emerald-400', arrow: '↑' },
  down:    { color: 'text-rose-400',    arrow: '↓' },
  neutral: { color: 'text-zinc-500',    arrow: '→' },
};

const COLS_CLASS: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4',
};

// ─── Single Card ─────────────────────────────────────────────────────────────

function Card({ stat, index }: { stat: StatCard; index: number }) {
  const Icon = stat.icon;
  const gradient = stat.gradient ?? DEFAULT_GRADIENTS[index % DEFAULT_GRADIENTS.length];
  const trendStyle = stat.trend ? TREND_STYLES[stat.trend] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: 'easeOut' }}
      className="relative rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10 p-4 flex flex-col gap-3"
    >
      {/* Gradient accent top-right */}
      <div
        className={`absolute -top-8 -left-8 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl pointer-events-none`}
      />

      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className="space-y-0.5 flex-1 min-w-0">
          <p className="text-xs font-medium text-zinc-400 truncate">{stat.title}</p>
          <p className="text-2xl font-bold text-white leading-none tracking-tight">
            {stat.value}
          </p>
          {stat.subtitle && (
            <p className="text-xs text-zinc-500 truncate">{stat.subtitle}</p>
          )}
        </div>

        {Icon && (
          <div className={`shrink-0 p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
            <Icon className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
        )}
      </div>

      {/* Progress bar */}
      {stat.progress != null && (
        <div className="space-y-1">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, stat.progress))}%` }}
              transition={{ duration: 0.8, delay: index * 0.06 + 0.2, ease: 'easeOut' }}
              className={`h-full rounded-full bg-gradient-to-l ${gradient}`}
            />
          </div>
          <p className="text-[10px] text-zinc-500 text-left">{stat.progress}%</p>
        </div>
      )}

      {/* Trend */}
      {trendStyle && stat.trendValue && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trendStyle.color}`}>
          <span>{trendStyle.arrow}</span>
          <span>{stat.trendValue}</span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StatsCards({
  stats,
  cols = 4,
  className = '',
}: StatsCardsProps) {
  return (
    <div
      dir="rtl"
      className={`grid gap-3 ${COLS_CLASS[cols]} ${className}`}
    >
      {stats.map((stat, i) => (
        <Card key={stat.id} stat={stat} index={i} />
      ))}
    </div>
  );
}

export default StatsCards;
