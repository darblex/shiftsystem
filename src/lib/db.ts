// ============================================================
// lib/db.ts — SQLite database initialisation and helpers
// ============================================================

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { ISRAELI_HOLIDAYS } from './holidays';
import type {
  User,
  UserWithHash,
  ScheduleEntry,
  ConstraintRecord,
  Holiday,
  DutyAssignment,
  AttendanceRecord,
} from '@/types';

// ── Database path ────────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_PATH = path.join(DATA_DIR, 'shiftsystem.db');

// ── Singleton (works with Next.js hot reload in dev) ─────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

function getDb(): Database.Database {
  // During Next.js static build (phase export), skip DB init to avoid lock conflicts
  if (process.env.NEXT_PHASE === 'phase-export' || process.env.NEXT_PHASE === 'phase-production-build') {
    // Return a mock db during build that won't be used
    return {} as Database.Database;
  }

  if (process.env.NODE_ENV === 'production') {
    if (!global.__db) {
      global.__db = new Database(DB_PATH);
      initDb(global.__db);
    }
    return global.__db;
  } else {
    if (!global.__db) {
      global.__db = new Database(DB_PATH);
      initDb(global.__db);
    }
    return global.__db;
  }
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

  CREATE TABLE IF NOT EXISTS schedule_entries (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date          TEXT    NOT NULL,
    schedule_type TEXT    NOT NULL CHECK(schedule_type IN ('home','office','holiday','weekend_duty','vacation','sick')),
    notes         TEXT,
    approved_by   INTEGER REFERENCES users(id),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, date)
  );

  CREATE INDEX IF NOT EXISTS idx_schedule_user_date ON schedule_entries(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_schedule_date      ON schedule_entries(date);

  CREATE TABLE IF NOT EXISTS constraints (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year              INTEGER NOT NULL,
    month             INTEGER NOT NULL,
    preference        TEXT    NOT NULL DEFAULT 'no_preference',
    max_office_days   INTEGER,
    max_home_days     INTEGER,
    unavailable_dates TEXT    DEFAULT '[]',
    notes             TEXT,
    created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, year, month)
  );

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
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date       TEXT    NOT NULL,
    duty_type  TEXT    NOT NULL DEFAULT 'weekend' CHECK(duty_type IN ('weekend','oncall')),
    notes      TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, date, duty_type)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date         TEXT    NOT NULL,
    check_in     TEXT,
    check_out    TEXT,
    location     TEXT    NOT NULL DEFAULT 'unknown' CHECK(location IN ('home','office','unknown')),
    hours_worked REAL,
    notes        TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, date)
  );
`);

// ── Seed helpers ─────────────────────────────────────────────────────────────

function seedUsers(db: Database.Database): void {
  const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (count > 0) return;

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
  const row = db
    .prepare(
      `SELECT id, username, email, full_name, role, department, phone, active, created_at, updated_at
       FROM users WHERE id = ?`
    )
    .get(id) as User | undefined;
  return row;
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
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO users (username, email, full_name, role, department, phone, password_hash)
       VALUES (@username, @email, @full_name, @role, @department, @phone, @password_hash)
       RETURNING id, username, email, full_name, role, department, phone, active, created_at, updated_at`
    )
    .get(data) as User;
  return result;
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

// ── Schedule helpers ──────────────────────────────────────────────────────────

export function getScheduleForMonth(userId: number, year: number, month: number): ScheduleEntry[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return db
    .prepare(
      `SELECT * FROM schedule_entries
       WHERE user_id = ? AND date LIKE ?
       ORDER BY date`
    )
    .all(userId, `${prefix}%`) as ScheduleEntry[];
}

export function getAllScheduleForMonth(year: number, month: number): ScheduleEntry[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return db
    .prepare(
      `SELECT se.*, u.full_name, u.department
       FROM schedule_entries se
       JOIN users u ON u.id = se.user_id
       WHERE se.date LIKE ?
       ORDER BY se.date, u.full_name`
    )
    .all(`${prefix}%`) as ScheduleEntry[];
}

export function upsertScheduleEntry(entry: Omit<ScheduleEntry, 'id' | 'created_at'>): ScheduleEntry {
  return db
    .prepare(
      `INSERT INTO schedule_entries (user_id, date, schedule_type, notes, approved_by)
       VALUES (@user_id, @date, @schedule_type, @notes, @approved_by)
       ON CONFLICT(user_id, date) DO UPDATE SET
         schedule_type = excluded.schedule_type,
         notes         = excluded.notes,
         approved_by   = excluded.approved_by
       RETURNING *`
    )
    .get(entry) as ScheduleEntry;
}

export function deleteScheduleEntry(userId: number, date: string): void {
  db.prepare(`DELETE FROM schedule_entries WHERE user_id = ? AND date = ?`).run(userId, date);
}

export function bulkInsertSchedule(entries: Omit<ScheduleEntry, 'id' | 'created_at'>[]): void {
  const insert = db.prepare(`
    INSERT INTO schedule_entries (user_id, date, schedule_type, notes, approved_by)
    VALUES (@user_id, @date, @schedule_type, @notes, @approved_by)
    ON CONFLICT(user_id, date) DO UPDATE SET
      schedule_type = excluded.schedule_type,
      notes         = excluded.notes
  `);
  const insertAll = db.transaction((rows: typeof entries) => {
    for (const row of rows) {
      insert.run(row);
    }
  });
  insertAll(entries);
}

// ── Constraints helpers ───────────────────────────────────────────────────────

export function getConstraints(userId: number, year: number, month: number): ConstraintRecord | undefined {
  return db
    .prepare(`SELECT * FROM constraints WHERE user_id = ? AND year = ? AND month = ?`)
    .get(userId, year, month) as ConstraintRecord | undefined;
}

export function upsertConstraints(
  data: Omit<ConstraintRecord, 'id' | 'created_at'>
): ConstraintRecord {
  return db
    .prepare(
      `INSERT INTO constraints (user_id, year, month, preference, max_office_days, max_home_days, unavailable_dates, notes)
       VALUES (@user_id, @year, @month, @preference, @max_office_days, @max_home_days, @unavailable_dates, @notes)
       ON CONFLICT(user_id, year, month) DO UPDATE SET
         preference        = excluded.preference,
         max_office_days   = excluded.max_office_days,
         max_home_days     = excluded.max_home_days,
         unavailable_dates = excluded.unavailable_dates,
         notes             = excluded.notes
       RETURNING *`
    )
    .get(data) as ConstraintRecord;
}

// ── Duty helpers ──────────────────────────────────────────────────────────────

export function getDutyAssignmentsForMonth(year: number, month: number): DutyAssignment[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return db
    .prepare(`SELECT * FROM duty_assignments WHERE date LIKE ? ORDER BY date`)
    .all(`${prefix}%`) as DutyAssignment[];
}

export function upsertDutyAssignment(
  data: Omit<DutyAssignment, 'id' | 'created_at'>
): DutyAssignment {
  return db
    .prepare(
      `INSERT INTO duty_assignments (user_id, date, duty_type, notes)
       VALUES (@user_id, @date, @duty_type, @notes)
       ON CONFLICT(user_id, date, duty_type) DO UPDATE SET notes = excluded.notes
       RETURNING *`
    )
    .get(data) as DutyAssignment;
}

// ── Attendance helpers ────────────────────────────────────────────────────────

export function getAttendanceForMonth(userId: number, year: number, month: number): AttendanceRecord[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return db
    .prepare(`SELECT * FROM attendance WHERE user_id = ? AND date LIKE ? ORDER BY date`)
    .all(userId, `${prefix}%`) as AttendanceRecord[];
}

export function upsertAttendance(
  data: Omit<AttendanceRecord, 'id' | 'created_at'>
): AttendanceRecord {
  return db
    .prepare(
      `INSERT INTO attendance (user_id, date, check_in, check_out, location, hours_worked, notes)
       VALUES (@user_id, @date, @check_in, @check_out, @location, @hours_worked, @notes)
       ON CONFLICT(user_id, date) DO UPDATE SET
         check_in     = excluded.check_in,
         check_out    = excluded.check_out,
         location     = excluded.location,
         hours_worked = excluded.hours_worked,
         notes        = excluded.notes
       RETURNING *`
    )
    .get(data) as AttendanceRecord;
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
