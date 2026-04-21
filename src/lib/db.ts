// ============================================================
// lib/db.ts — SQLite database initialisation and helpers
// ============================================================

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { ISRAELI_HOLIDAYS, getHolidaysForMonth } from './holidays';
import type {
  User,
  UserWithHash,
  ShiftEntry,
  ConstraintRecord,
  Holiday,
  DutyAssignment,
  ShiftRequest,
  AttendanceRecord,
} from '@/types';

// ── Database path ────────────────────────────────────────────────────────────

const DATA_DIR = process.env.DATABASE_DIR || path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_PATH = path.join(DATA_DIR, 'shiftsystem.db');
const DEMO_SEED_ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO_SEED === 'true';

// ── Singleton (works with Next.js hot reload in dev) ─────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

function getDb(): Database.Database {
  if (process.env.NEXT_PHASE === 'phase-export' || process.env.NEXT_PHASE === 'phase-production-build') {
    return {} as Database.Database;
  }

  if (!global.__db) {
    global.__db = new Database(DB_PATH);
    initDb(global.__db);
  }
  return global.__db;
}

function initDb(database: Database.Database) {
  database.pragma('journal_mode = WAL');
  database.pragma('synchronous = NORMAL');
  database.pragma('foreign_keys = ON');

  // ── Schema ─────────────────────────────────────────────────────────────────

  database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    username       TEXT    NOT NULL UNIQUE,
    email          TEXT    NOT NULL UNIQUE,
    full_name      TEXT    NOT NULL,
    role           TEXT    NOT NULL DEFAULT 'employee' CHECK(role IN ('admin','manager','employee')),
    department     TEXT,
    phone          TEXT,
    password_hash  TEXT    NOT NULL,
    active         INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date          TEXT    NOT NULL,
    shift_type    TEXT    NOT NULL CHECK(shift_type IN ('morning','afternoon','night','day_off','holiday','duty','weekend_duty','sick','vacation')),
    notes         TEXT,
    approved_by   INTEGER REFERENCES users(id),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, date)
  );

  CREATE INDEX IF NOT EXISTS idx_shifts_user_date ON shifts(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);

  CREATE TABLE IF NOT EXISTS constraints (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year        INTEGER NOT NULL,
    month       INTEGER NOT NULL,
    preference  TEXT    NOT NULL DEFAULT 'no_preference',
    notes       TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, year, month)
  );

  CREATE INDEX IF NOT EXISTS idx_constraints_user ON constraints(user_id);

  CREATE TABLE IF NOT EXISTS holidays (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    date     TEXT    NOT NULL,
    name_he  TEXT    NOT NULL,
    name_en  TEXT    NOT NULL,
    type     TEXT    NOT NULL CHECK(type IN ('public','eve','memorial')),
    year     INTEGER,
    UNIQUE(date, name_en)
  );

  CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

  CREATE TABLE IF NOT EXISTS duty_assignments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT    NOT NULL,
    employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    duty_type   TEXT    NOT NULL DEFAULT 'regular' CHECK(duty_type IN ('regular','weekend','holiday')),
    notes       TEXT,
    UNIQUE(employee_id, date)
  );

  CREATE INDEX IF NOT EXISTS idx_duty_date ON duty_assignments(date);

  CREATE TABLE IF NOT EXISTS shift_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_date TEXT NOT NULL,
    current_shift TEXT NOT NULL,
    requested_shift TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
    admin_note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_shift_requests_requester ON shift_requests(requester_id);

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint   TEXT    NOT NULL UNIQUE,
    p256dh     TEXT    NOT NULL,
    auth       TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
  CREATE INDEX IF NOT EXISTS idx_shift_requests_date ON shift_requests(target_date);
  CREATE INDEX IF NOT EXISTS idx_shift_requests_status ON shift_requests(status);
  CREATE INDEX IF NOT EXISTS idx_shift_requests_requester_target_status
    ON shift_requests(requester_id, target_date, status);
  CREATE INDEX IF NOT EXISTS idx_shift_requests_status_target_date
    ON shift_requests(status, target_date);
  CREATE INDEX IF NOT EXISTS idx_shift_requests_requester_created_at
    ON shift_requests(requester_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS attendance_records (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date             TEXT    NOT NULL,
    clock_in         TEXT    NOT NULL,
    clock_out        TEXT,
    duration_minutes INTEGER,
    notes            TEXT,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, date)
  );

  CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_records(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
`);

  // ── Seed helpers ─────────────────────────────────────────────────────────────

  function seedUsers(db: Database.Database): void {
    const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
    if (count > 0 || !DEMO_SEED_ENABLED) return;

    const insert = db.prepare(`
      INSERT OR IGNORE INTO users (username, email, full_name, role, department, password_hash)
      VALUES (@username, @email, @full_name, @role, @department, @password_hash)
    `);

    const employees: Array<Omit<UserWithHash, 'id' | 'active' | 'created_at' | 'updated_at' | 'phone'>> = [
      {
        username: 'admin',
        email: 'admin@shiftsystem.local',
        full_name: 'מנהל מערכת',
        role: 'admin',
        department: 'IT',
        password_hash: bcrypt.hashSync('admin', 12),
      },
      {
        username: 'yossi',
        email: 'yossi@shiftsystem.local',
        full_name: 'יוסי כהן',
        role: 'employee',
        department: 'פיתוח',
        password_hash: bcrypt.hashSync('employee1', 12),
      },
      {
        username: 'michal',
        email: 'michal@shiftsystem.local',
        full_name: 'מיכל לוי',
        role: 'employee',
        department: 'פיתוח',
        password_hash: bcrypt.hashSync('employee2', 12),
      },
      {
        username: 'avi',
        email: 'avi@shiftsystem.local',
        full_name: 'אבי ישראלי',
        role: 'manager',
        department: 'פיתוח',
        password_hash: bcrypt.hashSync('manager1', 12),
      },
      {
        username: 'dana',
        email: 'dana@shiftsystem.local',
        full_name: 'דנה שפירא',
        role: 'employee',
        department: 'תפעול',
        password_hash: bcrypt.hashSync('employee3', 12),
      },
    ];

    const seedMany = db.transaction((rows: typeof employees) => {
      for (const row of rows) {
        insert.run(row);
      }
    });

    seedMany(employees);
  }

  function seedHolidays(db: Database.Database): void {
    const count = (db.prepare('SELECT COUNT(*) as c FROM holidays').get() as { c: number }).c;
    if (count > 0) return;

    const insert = db.prepare(`
      INSERT OR IGNORE INTO holidays (date, name_he, name_en, type, year)
      VALUES (@date, @name_he, @name_en, @type, @year)
    `);

    const insertAll = db.transaction((holidays: Holiday[]) => {
      for (const h of holidays) {
        insert.run(h);
      }
    });

    insertAll(ISRAELI_HOLIDAYS);
  }

  // Run seeds once
  seedUsers(database);
  seedHolidays(database);
}

// Export db as lazy singleton
export const db: Database.Database = new Proxy({} as Database.Database, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  }
});

// ── User helpers ─────────────────────────────────────────────────────────────

export function getUserById(id: number): User | undefined {
  return db
    .prepare(
      `SELECT id, username, email, full_name, role, department, phone, active, created_at, updated_at
       FROM users WHERE id = ?`
    )
    .get(id) as User | undefined;
}

export function getUserByUsername(username: string): UserWithHash | undefined {
  return db
    .prepare(`SELECT * FROM users WHERE username = ? AND active = 1`)
    .get(username) as UserWithHash | undefined;
}

export function getAllActiveUsers(): User[] {
  return db
    .prepare(
      `SELECT id, username, email, full_name, role, department, phone, active, created_at, updated_at
       FROM users WHERE active = 1 ORDER BY full_name`
    )
    .all() as User[];
}

export function createUser(data: {
  username: string;
  email: string;
  full_name: string;
  role: User['role'];
  department?: string;
  phone?: string;
  password_hash: string;
}): User {
  return db
    .prepare(
      `INSERT OR IGNORE INTO users (username, email, full_name, role, department, phone, password_hash)
       VALUES (@username, @email, @full_name, @role, @department, @phone, @password_hash)
       RETURNING id, username, email, full_name, role, department, phone, active, created_at, updated_at`
    )
    .get(data) as User;
}

export function updateUser(
  id: number,
  data: Partial<Pick<User, 'email' | 'full_name' | 'role' | 'department' | 'phone' | 'active'>>
): User | undefined {
  const fields = Object.keys(data)
    .map((k) => `${k} = @${k}`)
    .join(', ');
  if (!fields) return getUserById(id);

  return db
    .prepare(
      `UPDATE users SET ${fields}, updated_at = datetime('now')
       WHERE id = @id
       RETURNING id, username, email, full_name, role, department, phone, active, created_at, updated_at`
    )
    .get({ ...data, id }) as User | undefined;
}

// ── Shift helpers ─────────────────────────────────────────────────────────────

export function getShiftsForMonth(year: number, month: number, userId?: number): ShiftEntry[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  if (userId !== undefined) {
    return db
      .prepare(`SELECT * FROM shifts WHERE user_id = ? AND date LIKE ? ORDER BY date`)
      .all(userId, `${prefix}%`) as ShiftEntry[];
  }
  return db
    .prepare(`SELECT * FROM shifts WHERE date LIKE ? ORDER BY date`)
    .all(`${prefix}%`) as ShiftEntry[];
}

export function getAllShiftsForMonth(year: number, month: number): ShiftEntry[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return db
    .prepare(
      `SELECT s.*, u.full_name, u.department
       FROM shifts s
       JOIN users u ON u.id = s.user_id
       WHERE s.date LIKE ?
       ORDER BY s.date, u.full_name`
    )
    .all(`${prefix}%`) as ShiftEntry[];
}

export function upsertShift(entry: Omit<ShiftEntry, 'id' | 'created_at'>): ShiftEntry {
  return db
    .prepare(
      `INSERT INTO shifts (user_id, date, shift_type, notes, approved_by)
       VALUES (@user_id, @date, @shift_type, @notes, @approved_by)
       ON CONFLICT(user_id, date) DO UPDATE SET
         shift_type  = excluded.shift_type,
         notes       = excluded.notes,
         approved_by = excluded.approved_by
       RETURNING *`
    )
    .get(entry) as ShiftEntry;
}

export function bulkUpsertShifts(entries: Array<Omit<ShiftEntry, 'id' | 'created_at'>>): void {
  const insert = db.prepare(`
    INSERT INTO shifts (user_id, date, shift_type, notes, approved_by)
    VALUES (@user_id, @date, @shift_type, @notes, @approved_by)
    ON CONFLICT(user_id, date) DO UPDATE SET
      shift_type  = excluded.shift_type,
      notes       = excluded.notes,
      approved_by = excluded.approved_by
  `);
  const insertAll = db.transaction((rows: typeof entries) => {
    for (const row of rows) {
      insert.run(row);
    }
  });
  insertAll(entries);
}

export function deleteShift(userId: number, date: string): void {
  db.prepare(`DELETE FROM shifts WHERE user_id = ? AND date = ?`).run(userId, date);
}

export function copyShiftsToMonth(
  userId: number,
  fromYear: number,
  fromMonth: number,
  toYear: number,
  toMonth: number
): number {
  const fromPrefix = `${fromYear}-${String(fromMonth).padStart(2, '0')}`;
  const toPrefix = `${toYear}-${String(toMonth).padStart(2, '0')}`;

  // Get source shifts
  const sourceShifts = db
    .prepare(
      `SELECT * FROM shifts WHERE user_id = ? AND date LIKE ? AND shift_type != 'holiday'`
    )
    .all(userId, `${fromPrefix}%`) as ShiftEntry[];

  if (sourceShifts.length === 0) return 0;

  // Get holiday dates in target month (to skip)
  const holidaySet = new Set(getHolidaysForMonth(toYear, toMonth).map((holiday) => holiday.date));

  // Map day-of-month from source to target
  const insert = db.prepare(`
    INSERT INTO shifts (user_id, date, shift_type, notes, approved_by)
    VALUES (@user_id, @date, @shift_type, @notes, @approved_by)
    ON CONFLICT(user_id, date) DO UPDATE SET
      shift_type  = excluded.shift_type,
      notes       = excluded.notes,
      approved_by = excluded.approved_by
  `);

  let count = 0;
  const insertAll = db.transaction(() => {
    for (const s of sourceShifts) {
      const day = s.date.slice(8, 10); // DD part
      const targetDate = `${toPrefix}-${day}`;

      // Validate target date exists in the target month
      const testDate = new Date(`${targetDate}T00:00:00`);
      if (
        testDate.getMonth() + 1 !== toMonth ||
        testDate.getFullYear() !== toYear
      ) continue;

      if (holidaySet.has(targetDate)) continue;

      insert.run({
        user_id: userId,
        date: targetDate,
        shift_type: s.shift_type,
        notes: s.notes ?? null,
        approved_by: null,
      });
      count++;
    }
  });
  insertAll();
  return count;
}

// ── Constraints helpers ───────────────────────────────────────────────────────

export function getConstraints(userId: number, year: number, month: number): ConstraintRecord | undefined {
  return db
    .prepare(`SELECT * FROM constraints WHERE user_id = ? AND year = ? AND month = ?`)
    .get(userId, year, month) as ConstraintRecord | undefined;
}

export function upsertConstraints(data: Omit<ConstraintRecord, 'id' | 'created_at'>): ConstraintRecord {
  return db
    .prepare(
      `INSERT INTO constraints (user_id, year, month, preference, notes)
       VALUES (@user_id, @year, @month, @preference, @notes)
       ON CONFLICT(user_id, year, month) DO UPDATE SET
         preference = excluded.preference,
         notes      = excluded.notes
       RETURNING *`
    )
    .get(data) as ConstraintRecord;
}

// ── Duty helpers ──────────────────────────────────────────────────────────────

export function getDutyAssignmentsForMonth(year: number, month: number): DutyAssignment[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return db
    .prepare(
      `SELECT d.id, d.date, d.employee_id, u.full_name AS employee_name, d.duty_type, d.notes
       FROM duty_assignments d
       JOIN users u ON u.id = d.employee_id
       WHERE d.date LIKE ? ORDER BY d.date`
    )
    .all(`${prefix}%`) as DutyAssignment[];
}

export function upsertDutyAssignment(data: {
  date: string;
  employee_id: number;
  duty_type: DutyAssignment['duty_type'];
  notes?: string | null;
}): DutyAssignment {
  return db
    .prepare(
      `INSERT INTO duty_assignments (date, employee_id, duty_type, notes)
       VALUES (@date, @employee_id, @duty_type, @notes)
       ON CONFLICT(employee_id, date) DO UPDATE SET
         duty_type = excluded.duty_type,
         notes     = excluded.notes
       RETURNING *`
    )
    .get(data) as DutyAssignment;
}

// ── Shift request helpers ─────────────────────────────────────────────────────

export function getShiftForUserOnDate(userId: number, date: string): ShiftEntry | undefined {
  return db
    .prepare(`SELECT * FROM shifts WHERE user_id = ? AND date = ? LIMIT 1`)
    .get(userId, date) as ShiftEntry | undefined;
}

export function getShiftRequestById(id: number): ShiftRequest | undefined {
  return db
    .prepare(
      `SELECT sr.*, u.full_name AS requester_name
       FROM shift_requests sr
       JOIN users u ON u.id = sr.requester_id
       WHERE sr.id = ?`
    )
    .get(id) as ShiftRequest | undefined;
}

export function findPendingShiftRequest(requesterId: number, targetDate: string): ShiftRequest | undefined {
  return db
    .prepare(
      `SELECT sr.*, u.full_name AS requester_name
       FROM shift_requests sr
       JOIN users u ON u.id = sr.requester_id
       WHERE sr.requester_id = ? AND sr.target_date = ? AND sr.status = 'pending'
       LIMIT 1`
    )
    .get(requesterId, targetDate) as ShiftRequest | undefined;
}

export function listShiftRequests(options: {
  requesterId?: number;
  status?: ShiftRequest['status'];
  fromDate?: string;
  toDate?: string;
  limit?: number;
} = {}): ShiftRequest[] {
  const { requesterId, status, fromDate, toDate } = options;
  const safeLimit = Math.min(Math.max(options.limit ?? 100, 1), 500);

  let query = `
    SELECT sr.*, u.full_name AS requester_name
    FROM shift_requests sr
    JOIN users u ON u.id = sr.requester_id
  `;
  const clauses: string[] = [];
  const params: Array<number | string> = [];

  if (requesterId !== undefined) {
    clauses.push('sr.requester_id = ?');
    params.push(requesterId);
  }
  if (status) {
    clauses.push('sr.status = ?');
    params.push(status);
  }
  if (fromDate) {
    clauses.push('sr.target_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    clauses.push('sr.target_date <= ?');
    params.push(toDate);
  }

  if (clauses.length > 0) {
    query += ` WHERE ${clauses.join(' AND ')}`;
  }

  query += ' ORDER BY sr.created_at DESC LIMIT ?';
  params.push(safeLimit);

  return db.prepare(query).all(...params) as ShiftRequest[];
}

export function createShiftRequest(data: {
  requester_id: number;
  target_date: string;
  current_shift: ShiftEntry['shift_type'];
  requested_shift: ShiftEntry['shift_type'];
  reason?: string | null;
}): ShiftRequest {
  const result = db
    .prepare(
      `INSERT INTO shift_requests (requester_id, target_date, current_shift, requested_shift, reason)
       VALUES (@requester_id, @target_date, @current_shift, @requested_shift, @reason)`
    )
    .run(data);

  return getShiftRequestById(Number(result.lastInsertRowid)) as ShiftRequest;
}

export function resolveShiftRequest(
  id: number,
  status: Extract<ShiftRequest['status'], 'approved' | 'rejected' | 'cancelled'>,
  actorId?: number,
  adminNote?: string | null,
):
  | { ok: true; request: ShiftRequest }
  | { ok: false; code: 'not_found' | 'not_pending' | 'missing_shift' | 'shift_changed'; currentShift?: ShiftEntry['shift_type'] } {
  const run = db.transaction((requestId: number) => {
    const request = db
      .prepare(`SELECT * FROM shift_requests WHERE id = ?`)
      .get(requestId) as ShiftRequest | undefined;

    if (!request) {
      return { ok: false, code: 'not_found' } as const;
    }

    if (request.status !== 'pending') {
      return { ok: false, code: 'not_pending' } as const;
    }

    if (status === 'approved') {
      const currentShift = getShiftForUserOnDate(request.requester_id, request.target_date);
      if (!currentShift) {
        return { ok: false, code: 'missing_shift' } as const;
      }
      if (currentShift.shift_type !== request.current_shift) {
        return {
          ok: false,
          code: 'shift_changed',
          currentShift: currentShift.shift_type,
        } as const;
      }

      db.prepare(
        `UPDATE shifts
         SET shift_type = ?, approved_by = ?
         WHERE user_id = ? AND date = ?`
      ).run(request.requested_shift, actorId ?? null, request.requester_id, request.target_date);
    }

    db.prepare(
      `UPDATE shift_requests
       SET status = ?, admin_note = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(status, adminNote ?? null, requestId);

    return { ok: true, request: getShiftRequestById(requestId) as ShiftRequest } as const;
  });

  return run(id);
}

// ── Settings helpers ──────────────────────────────────────────────────────────

export function getSetting(key: string): string | undefined {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

// ── Push subscription helpers ─────────────────────────────────────────────────

export interface PushSubscriptionRow {
  id: number;
  user_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export function savePushSubscription(
  userId: number,
  endpoint: string,
  p256dh: string,
  auth: string,
): void {
  db.prepare(`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth
  `).run(userId, endpoint, p256dh, auth);
}

export function removePushSubscription(endpoint: string): void {
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
}

export function getPushSubscriptionsForUser(userId: number): PushSubscriptionRow[] {
  return db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(userId) as PushSubscriptionRow[];
}

// ── Attendance helpers ────────────────────────────────────────────────────────

export function getAttendanceForUser(userId: number, year: number, month: number): AttendanceRecord[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return db
    .prepare(
      `SELECT * FROM attendance_records WHERE user_id = ? AND date LIKE ? ORDER BY date DESC`
    )
    .all(userId, `${prefix}%`) as AttendanceRecord[];
}

export function getAllAttendanceForMonth(year: number, month: number): AttendanceRecord[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return db
    .prepare(
      `SELECT a.*, u.full_name
       FROM attendance_records a
       JOIN users u ON u.id = a.user_id
       WHERE a.date LIKE ? ORDER BY a.date DESC, u.full_name`
    )
    .all(`${prefix}%`) as AttendanceRecord[];
}

export function getTodayAttendance(userId: number, today: string): AttendanceRecord | undefined {
  return db
    .prepare(`SELECT * FROM attendance_records WHERE user_id = ? AND date = ?`)
    .get(userId, today) as AttendanceRecord | undefined;
}

export function clockIn(userId: number, date: string, clockIn: string, notes?: string | null): AttendanceRecord {
  return db
    .prepare(
      `INSERT INTO attendance_records (user_id, date, clock_in, notes)
       VALUES (?, ?, ?, ?)
       RETURNING *`
    )
    .get(userId, date, clockIn, notes ?? null) as AttendanceRecord;
}

export function clockOut(userId: number, date: string, clockOut: string): AttendanceRecord | undefined {
  const record = getTodayAttendance(userId, date);
  if (!record) return undefined;

  const clockInTime = new Date(record.clock_in).getTime();
  const clockOutTime = new Date(clockOut).getTime();
  const duration = Math.round((clockOutTime - clockInTime) / 60000);

  return db
    .prepare(
      `UPDATE attendance_records
       SET clock_out = ?, duration_minutes = ?
       WHERE user_id = ? AND date = ?
       RETURNING *`
    )
    .get(clockOut, duration > 0 ? duration : 0, userId, date) as AttendanceRecord | undefined;
}

// ── Holiday helpers (from DB) ─────────────────────────────────────────────────

export function getHolidaysFromDB(year: number, month?: number): Holiday[] {
  if (month !== undefined) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return db
      .prepare(`SELECT * FROM holidays WHERE date LIKE ? ORDER BY date`)
      .all(`${prefix}%`) as Holiday[];
  }
  return db
    .prepare(`SELECT * FROM holidays WHERE year = ? ORDER BY date`)
    .all(year) as Holiday[];
}
