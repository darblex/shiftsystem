// ============================================================
// types/index.ts — Shared TypeScript types for ShiftSystem
// ============================================================

export type Role = 'admin' | 'manager' | 'employee';

export type ScheduleType = 'home' | 'office' | 'holiday' | 'weekend_duty' | 'vacation' | 'sick';

export type ConstraintPreference = 'prefer_home' | 'prefer_office' | 'no_preference' | 'fixed_home' | 'fixed_office';

// -------------------------------------------------------
// User
// -------------------------------------------------------
export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: Role;
  department?: string;
  phone?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  // password_hash intentionally omitted from the public shape
}

export interface UserWithHash extends User {
  password_hash: string;
}

// -------------------------------------------------------
// Schedule entry
// -------------------------------------------------------
export interface ScheduleEntry {
  id: number;
  user_id: number;
  date: string; // ISO yyyy-MM-dd
  schedule_type: ScheduleType;
  notes?: string;
  approved_by?: number;
  created_at: string;
}

// -------------------------------------------------------
// Constraints (per-employee monthly / weekly preferences)
// -------------------------------------------------------
export interface ConstraintRecord {
  id: number;
  user_id: number;
  year: number;
  month: number; // 1-12
  preference: ConstraintPreference;
  max_office_days?: number;
  max_home_days?: number;
  unavailable_dates?: string; // JSON array of "yyyy-MM-dd"
  notes?: string;
  created_at: string;
}

// -------------------------------------------------------
// Holiday
// -------------------------------------------------------
export interface Holiday {
  id?: number;
  date: string; // ISO yyyy-MM-dd
  name_he: string;
  name_en: string;
  type: 'public' | 'eve' | 'memorial';
  year?: number;
}

// -------------------------------------------------------
// Duty Assignment (weekend / on-call)
// -------------------------------------------------------
export interface DutyAssignment {
  id: number;
  user_id: number;
  date: string; // ISO yyyy-MM-dd — Saturday of the duty weekend
  duty_type: 'weekend' | 'oncall';
  notes?: string;
  created_at: string;
}

// -------------------------------------------------------
// Attendance
// -------------------------------------------------------
export interface AttendanceRecord {
  id: number;
  user_id: number;
  date: string; // ISO yyyy-MM-dd
  check_in?: string; // HH:mm
  check_out?: string; // HH:mm
  location: 'home' | 'office' | 'unknown';
  hours_worked?: number;
  notes?: string;
  created_at: string;
}

// -------------------------------------------------------
// Helpers for schedule generation
// -------------------------------------------------------
export interface MonthSchedule {
  userId: number;
  year: number;
  month: number;
  entries: ScheduleEntry[];
  officeDays: number;
  homeDays: number;
  dutyWeekend?: string;
}

export interface GenerateMonthOptions {
  year: number;
  month: number; // 1-12
  userIds?: number[];
  overwrite?: boolean;
}
