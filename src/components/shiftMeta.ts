import type { ShiftType } from '@/types';

export const SHIFT_ABBREV: Record<ShiftType, string> = {
  morning: 'ב',
  afternoon: 'צ',
  night: 'ל',
  day_off: '—',
  duty: 'ת',
  weekend_duty: 'ס',
  holiday: 'ח',
  sick: 'מ',
  vacation: 'ח׳',
};

export const SHIFT_CLASS: Record<ShiftType, string> = {
  morning: 'shift-office',
  afternoon: 'shift-home',
  night: 'shift-night',
  day_off: 'shift-off',
  duty: 'shift-duty',
  weekend_duty: 'shift-weekend_duty',
  holiday: 'shift-holiday',
  sick: 'shift-sick',
  vacation: 'shift-vacation',
};

export const SHIFT_LABEL: Record<ShiftType, string> = {
  morning: 'בוקר',
  afternoon: 'צהריים',
  night: 'לילה',
  day_off: 'יום חופש',
  duty: 'תורנות',
  weekend_duty: 'תורנות סופ״ש',
  holiday: 'חג',
  sick: 'מחלה',
  vacation: 'חופשה',
};

export const SHIFT_TIME_RANGE: Partial<Record<ShiftType, string>> = {
  morning: '06:00–14:00',
  afternoon: '14:00–22:00',
  night: '22:00–06:00',
  duty: '24 שעות',
  weekend_duty: 'סופ״ש',
  holiday: 'כל היום',
};

export const SHIFT_EDIT_ORDER: ShiftType[] = [
  'morning',
  'afternoon',
  'night',
  'duty',
  'weekend_duty',
  'holiday',
  'sick',
  'vacation',
  'day_off',
];

export const WORK_SHIFT_TYPES: ShiftType[] = ['morning', 'afternoon', 'night'];
export const VISIBLE_WEEK_SHIFT_TYPES: ShiftType[] = ['morning', 'afternoon', 'night', 'duty', 'weekend_duty'];

export function isWorkShift(shiftType: ShiftType) {
  return WORK_SHIFT_TYPES.includes(shiftType);
}

export function getRoleLabel(role: 'admin' | 'manager' | 'employee' | string) {
  switch (role) {
    case 'admin':
      return 'מנהל מערכת';
    case 'manager':
      return 'מנהל';
    default:
      return 'עובד';
  }
}
