export const dynamic = 'force-dynamic';
// ============================================================
// app/api/holidays/route.ts — Holiday CRUD
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db, getHolidaysFromDB } from '@/lib/db';
import { getHoliday, getHolidaysForMonth } from '@/lib/holidays';
import { normalizeText, parseIsoDate, parseJsonObject, parseMonth, parsePositiveInt, parseYear } from '@/lib/validation';
import type { Holiday } from '@/types';

const VALID_TYPES: Holiday['type'][] = ['public', 'eve', 'memorial'];

// GET /api/holidays — list holidays
export const GET = requireAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get('year');
  const monthParam = searchParams.get('month');
  const dateParam = searchParams.get('date');
  const year = yearParam ? parseYear(yearParam) : null;
  const month = monthParam ? parseMonth(monthParam) : null;
  const date = dateParam ? parseIsoDate(dateParam) : null;

  if ((yearParam && !year) || (monthParam && (!month || !year)) || (dateParam && !date)) {
    return NextResponse.json({ error: 'פרמטרי תאריך לא תקינים' }, { status: 400 });
  }

  if (date) {
    const holiday = db.prepare('SELECT * FROM holidays WHERE date = ? ORDER BY name_en').all(date);
    if ((holiday as any[]).length > 0) {
      return NextResponse.json({ holidays: holiday });
    }
    const fallback = getHoliday(date);
    return NextResponse.json({ holidays: fallback ? [fallback] : [] });
  }

  if (year && month) {
    const holidays = getHolidaysFromDB(year, month);
    return NextResponse.json({ holidays: holidays.length ? holidays : getHolidaysForMonth(year, month) });
  }

  if (year) {
    const holidays = getHolidaysFromDB(year);
    return NextResponse.json({ holidays });
  }

  const holidays = db.prepare('SELECT * FROM holidays ORDER BY date, name_en').all() as Holiday[];
  return NextResponse.json({ holidays });
});

// POST /api/holidays — add holiday (admin only)
export const POST = requireAuth(
  async (req) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }

    const payload = parseJsonObject(body);
    if (!payload) return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    const date = parseIsoDate(payload.date);
    const nameHe = normalizeText(payload.name_he, 120);
    const nameEn = normalizeText(payload.name_en, 120);
    const type = normalizeText(payload.type, 20) ?? 'public';

    if (!date || !nameHe || !nameEn) {
      return NextResponse.json(
        { error: 'נא למלא תאריך, שם חג בעברית ושם חג באנגלית' },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(type as Holiday['type'])) {
      return NextResponse.json(
        { error: `סוג חג לא תקין. אפשרויות: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const year = Number(date.slice(0, 4));
    const existing = db.prepare('SELECT id FROM holidays WHERE date = ? AND name_en = ?').get(date, nameEn);
    if (existing) {
      return NextResponse.json({ error: 'חג זה כבר קיים במערכת' }, { status: 409 });
    }

    const holiday = db
      .prepare(
        `INSERT INTO holidays (date, name_he, name_en, type, year)
         VALUES (?, ?, ?, ?, ?)
         RETURNING *`
      )
      .get(date, nameHe, nameEn, type, year);

    return NextResponse.json({ holiday }, { status: 201 });
  },
  ['admin']
);

// PATCH /api/holidays — update holiday (admin only)
export const PATCH = requireAuth(
  async (req) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }

    const payload = parseJsonObject(body);
    if (!payload) return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    const id = parsePositiveInt(payload.id);
    if (!id) return NextResponse.json({ error: 'נא לציין מזהה חג תקין' }, { status: 400 });

    const existing = db.prepare('SELECT * FROM holidays WHERE id = ?').get(id);
    if (!existing) return NextResponse.json({ error: 'חג לא נמצא' }, { status: 404 });

    const updates: string[] = [];
    const values: Array<string | number> = [];

    if (payload.date !== undefined) {
      const date = parseIsoDate(payload.date);
      if (!date) {
        return NextResponse.json({ error: 'פורמט תאריך לא תקין. נדרש YYYY-MM-DD' }, { status: 400 });
      }
      updates.push('date = ?');
      values.push(date);
      updates.push('year = ?');
      values.push(Number(date.slice(0, 4)));
    }
    if (payload.name_he !== undefined) {
      const nameHe = normalizeText(payload.name_he, 120);
      if (!nameHe) return NextResponse.json({ error: 'שם חג בעברית לא תקין' }, { status: 400 });
      updates.push('name_he = ?');
      values.push(nameHe);
    }
    if (payload.name_en !== undefined) {
      const nameEn = normalizeText(payload.name_en, 120);
      if (!nameEn) return NextResponse.json({ error: 'שם חג באנגלית לא תקין' }, { status: 400 });
      updates.push('name_en = ?');
      values.push(nameEn);
    }
    if (payload.type !== undefined) {
      const type = normalizeText(payload.type, 20);
      if (!type || !VALID_TYPES.includes(type as Holiday['type'])) {
        return NextResponse.json({ error: 'סוג חג לא תקין' }, { status: 400 });
      }
      updates.push('type = ?');
      values.push(type);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'לא צוינו שדות לעדכון' }, { status: 400 });
    }

    const updated = db
      .prepare(`UPDATE holidays SET ${updates.join(', ')} WHERE id = ? RETURNING *`)
      .get(...values, id);

    return NextResponse.json({ holiday: updated });
  },
  ['admin']
);

// DELETE /api/holidays — remove holiday (admin only)
export const DELETE = requireAuth(
  async (req) => {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');
    const dateParam = searchParams.get('date');

    if (!idParam && !dateParam) {
      return NextResponse.json({ error: 'נא לציין id או date' }, { status: 400 });
    }

    if (idParam) {
      const id = parsePositiveInt(idParam);
      if (!id) return NextResponse.json({ error: 'מזהה חג לא תקין' }, { status: 400 });
      const existing = db.prepare('SELECT id FROM holidays WHERE id = ?').get(id);
      if (!existing) return NextResponse.json({ error: 'חג לא נמצא' }, { status: 404 });
      db.prepare('DELETE FROM holidays WHERE id = ?').run(id);
      return NextResponse.json({ success: true, message: 'החג נמחק' });
    }

    const date = parseIsoDate(dateParam);
    if (!date) return NextResponse.json({ error: 'תאריך לא תקין' }, { status: 400 });
    const result = db.prepare('DELETE FROM holidays WHERE date = ?').run(date);
    return NextResponse.json({ success: true, deleted: result.changes, message: 'החגים נמחקו' });
  },
  ['admin']
);
