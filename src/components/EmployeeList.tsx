'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Shield, UserMinus, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type EmployeeRole = 'admin' | 'manager' | 'employee';
export type EmployeeStatus = 'active' | 'inactive' | 'on_leave';

export interface Employee {
  id: string;
  name: string;
  email?: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  department?: string;
  avatarUrl?: string;
  /** ISO date string */
  joinedAt?: string;
}

export interface EmployeeListProps {
  employees: Employee[];
  isAdmin?: boolean;
  onPromote?: (employee: Employee) => void;
  onDeactivate?: (employee: Employee) => void;
  onViewProfile?: (employee: Employee) => void;
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<EmployeeRole, string> = {
  admin: 'מנהל מערכת',
  manager: 'מנהל',
  employee: 'עובד',
};

const STATUS_STYLES: Record<EmployeeStatus, { dot: string; bg: string; label: string }> = {
  active:   { dot: 'bg-emerald-400', bg: 'bg-emerald-500/15 text-emerald-300', label: 'פעיל' },
  inactive: { dot: 'bg-zinc-400',    bg: 'bg-zinc-500/15 text-zinc-400',       label: 'לא פעיל' },
  on_leave: { dot: 'bg-amber-400',   bg: 'bg-amber-500/15 text-amber-300',     label: 'בחופשה' },
};

const ROLE_STYLES: Record<EmployeeRole, string> = {
  admin:    'bg-rose-500/15 text-rose-300',
  manager:  'bg-blue-500/15 text-blue-300',
  employee: 'bg-zinc-500/15 text-zinc-400',
};

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name, url, size = 10 }: { name: string; url?: string; size?: number }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`w-${size} h-${size} rounded-full object-cover ring-2 ring-white/10`}
      />
    );
  }
  return (
    <div
      className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white/10 shrink-0`}
    >
      {initials}
    </div>
  );
}

// ─── Actions Menu ────────────────────────────────────────────────────────────

function ActionsMenu({
  employee,
  isAdmin,
  onPromote,
  onDeactivate,
  onViewProfile,
}: Pick<EmployeeListProps, 'isAdmin' | 'onPromote' | 'onDeactivate' | 'onViewProfile'> & {
  employee: Employee;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
        aria-label="פעולות"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 top-8 z-20 min-w-[160px] rounded-xl bg-zinc-900/95 backdrop-blur border border-white/10 shadow-xl overflow-hidden"
            >
              {onViewProfile && (
                <button
                  className="w-full text-right px-3 py-2 text-sm text-zinc-200 hover:bg-white/10 transition-colors flex items-center gap-2"
                  onClick={() => { setOpen(false); onViewProfile(employee); }}
                >
                  פרופיל
                </button>
              )}
              {isAdmin && onPromote && employee.role === 'employee' && (
                <button
                  className="w-full text-right px-3 py-2 text-sm text-blue-300 hover:bg-white/10 transition-colors flex items-center gap-2"
                  onClick={() => { setOpen(false); onPromote(employee); }}
                >
                  <Shield className="w-4 h-4" /> קדם לתפקיד
                </button>
              )}
              {isAdmin && onDeactivate && employee.status === 'active' && (
                <button
                  className="w-full text-right px-3 py-2 text-sm text-rose-400 hover:bg-white/10 transition-colors flex items-center gap-2"
                  onClick={() => { setOpen(false); onDeactivate(employee); }}
                >
                  <UserMinus className="w-4 h-4" /> השבת משתמש
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function EmployeeRow({
  employee,
  isAdmin,
  onPromote,
  onDeactivate,
  onViewProfile,
}: { employee: Employee } & Pick<
  EmployeeListProps,
  'isAdmin' | 'onPromote' | 'onDeactivate' | 'onViewProfile'
>) {
  const statusStyle = STATUS_STYLES[employee.status];
  const roleStyle = ROLE_STYLES[employee.role];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
    >
      <div className="relative shrink-0">
        <Avatar name={employee.name} url={employee.avatarUrl} size={10} />
        <span
          className={`absolute bottom-0 left-0 w-3 h-3 rounded-full border-2 border-zinc-950 ${statusStyle.dot}`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{employee.name}</p>
        {employee.email && (
          <p className="text-xs text-zinc-500 truncate">{employee.email}</p>
        )}
        {employee.department && (
          <p className="text-xs text-zinc-500 truncate">{employee.department}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle.bg}`}>
          {statusStyle.label}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium hidden sm:block ${roleStyle}`}>
          {ROLE_LABELS[employee.role]}
        </span>
        <ActionsMenu
          employee={employee}
          isAdmin={isAdmin}
          onPromote={onPromote}
          onDeactivate={onDeactivate}
          onViewProfile={onViewProfile}
        />
      </div>
    </motion.div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EmployeeList({
  employees,
  isAdmin = false,
  onPromote,
  onDeactivate,
  onViewProfile,
  className = '',
}: EmployeeListProps) {
  const [query, setQuery] = useState('');
  const [sortField, setSortField] = useState<'name' | 'status' | 'role'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = employees
    .filter(
      (e) =>
        e.name.includes(query) ||
        (e.email ?? '').includes(query) ||
        (e.department ?? '').includes(query)
    )
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      return a[sortField] > b[sortField] ? mul : -mul;
    });

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setDirection(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  // eslint-disable-next-line @typescript-eslint/no-shadow
  function setDirection(d: 'asc' | 'desc') { setSortDir(d); }

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field ? (
      sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    ) : null;

  return (
    <div
      dir="rtl"
      className={`rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden ${className}`}
    >
      {/* Search bar */}
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="search"
            placeholder="חיפוש עובד..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pr-9 pl-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
          />
        </div>
      </div>

      {/* Sort header */}
      <div className="flex items-center gap-4 px-3 py-2 text-xs text-zinc-500 border-b border-white/5">
        <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
          שם <SortIcon field="name" />
        </button>
        <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
          סטטוס <SortIcon field="status" />
        </button>
        <button onClick={() => toggleSort('role')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
          תפקיד <SortIcon field="role" />
        </button>
        <span className="mr-auto text-zinc-600">{filtered.length} עובדים</span>
      </div>

      {/* List */}
      <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
        <AnimatePresence initial={false}>
          {filtered.length === 0 ? (
            <p className="text-center text-zinc-500 py-10 text-sm">לא נמצאו עובדים</p>
          ) : (
            filtered.map((emp) => (
              <EmployeeRow
                key={emp.id}
                employee={emp}
                isAdmin={isAdmin}
                onPromote={onPromote}
                onDeactivate={onDeactivate}
                onViewProfile={onViewProfile}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default EmployeeList;
