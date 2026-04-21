// ============================================================
// types/index.ts — Shared TypeScript types for ShiftSystem
// ============================================================

export type Role = 'admin' | 'manager' | 'employee';

export type ShiftType =
  | 'morning'       // בוקר 06:00-14:00
  | 'afternoon'     // צהריים 14:00-22:00
  | 'night'         // לילה 22:00-06:00
  | 'day_off'       // חופש
  | 'holiday'       // חג
  | 'duty'          // תורנות רגילה
  | 'weekend_duty'  // תורנות סופ"ש
  | 'sick'          // מחלה
  | 'vacation';     // חופשה

export type ConstraintPreference =
  | 'prefer_morning'
  | 'prefer_afternoon'
  | 'prefer_night'
  | 'no_preference'
  | 'fixed_morning'
  | 'fixed_afternoon';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: Role;
  department?: string;
  phone?: string;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface UserWithHash extends User {
  password_hash: string;
}

export interface ShiftEntry {
  id: number;
  user_id: number;
  date: string;          // YYYY-MM-DD
  shift_type: ShiftType;
  notes?: string;
  approved_by?: number;
  created_at: string;
}

export interface DutyAssignment {
  id: number;
  date: string;          // YYYY-MM-DD
  employee_id: number;
  employee_name?: string;
  duty_type: 'regular' | 'weekend' | 'holiday';
  notes?: string;
}

export interface Holiday {
  id?: number;
  date: string;
  name_he: string;
  name_en: string;
  type: 'public' | 'eve' | 'memorial';
  year?: number;
}

export interface ConstraintRecord {
  id?: number;
  user_id: number;
  year: number;
  month: number;
  preference: ConstraintPreference;
  notes?: string;
  created_at?: string;
}

export interface ShiftRequest {
  id: number;
  requester_id: number;
  requester_name?: string;
  target_date: string;
  current_shift: ShiftType;
  requested_shift: ShiftType;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  admin_note?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: number;
  user_id: number;
  full_name?: string;
  date: string;          // YYYY-MM-DD
  clock_in: string;      // ISO timestamp
  clock_out?: string;    // ISO timestamp, null if still clocked in
  duration_minutes?: number;
  notes?: string;
  created_at: string;
}

export interface GenerateMonthOptions {
  year: number;
  month: number;
  overwrite?: boolean;
}

export interface MonthSchedule {
  [userId: string]: {
    [date: string]: ShiftEntry;
  };
}

export interface JwtPayload {
  userId: number;
  username: string;
  role: Role;
  iat?: number;
  exp?: number;
}
