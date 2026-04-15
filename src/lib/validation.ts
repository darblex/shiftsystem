// ============================================================
// lib/validation.ts — shared request validation helpers
// ============================================================

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseJsonObject(body: unknown): Record<string, unknown> | null {
  return isPlainObject(body) ? body : null;
}

export function parsePositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export function parseYear(value: unknown): number | null {
  const year = parsePositiveInt(value);
  return year && year >= 1900 && year <= 2100 ? year : null;
}

export function parseMonth(value: unknown): number | null {
  const month = parsePositiveInt(value);
  return month && month >= 1 && month <= 12 ? month : null;
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE_RE.test(value) && isRealDate(value);
}

export function parseIsoDate(value: unknown): string | null {
  return isIsoDate(value) ? value : null;
}

export function normalizeText(value: unknown, maxLength = 500): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

export function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  if (typeof value === 'number') return value !== 0;
  return false;
}

function isRealDate(iso: string): boolean {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const roundTrip = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return roundTrip === iso;
}
