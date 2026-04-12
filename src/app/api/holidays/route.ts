// ============================================================
// app/api/holidays/route.ts — Holiday CRUD
// ============================================================

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db, getHolidaysFromDB } from '@/lib/db';
import { getHoliday, getHolidaysForMonth } from '@/lib/holidays';
import type { Holiday } from '@/types';

// GET /api/holidays — list holidays
export const GET = requireAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : null;
  const month = searchParams.get('month') ? Number(searchParams.get('month')) : null;
  const date = searchParams.get('date');

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
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }

    const { date, name_he, name_en, type } = body ?? {};

    if (!date || !name_he || !name_en) {
      return NextResponse.json(
        { error: 'נא למלא תאריך, שם חג בעברית ושם חג באנגלית' },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return NextResponse.json({ error: 'פורמט תאריך לא תקין. נדרש YYYY-MM-DD' }, { status: 400 });
    }

    const validTypes: Holiday['type'][] = ['public', 'eve', 'memorial'];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `סוג חג לא תקין. אפשרויות: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const year = Number(String(date).slice(0, 4));
    const existing = db.prepare('SELECT id FROM holidays WHERE date = ? AND name_en = ?').get(date, name_en);
    if (existing) {
      return NextResponse.json({ error: 'חג זה כבר קיים במערכת' }, { status: 409 });
    }

    const holiday = db
      .prepare(
        `INSERT INTO holidays (date, name_he, name_en, type, year)
         VALUES (?, ?, ?, ?, ?)
         RETURNING *`
      )
      .get(String(date), String(name_he).trim(), String(name_en).trim(), type ?? 'public', year);

    return NextResponse.json({ holiday }, { status: 201 });
  },
  ['admin']
);

// PATCH /api/holidays — update holiday (admin only)
export const PATCH = requireAuth(
  async (req) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }

    const { id, date, name_he, name_en, type } = body ?? {};
    if (!id) return NextResponse.json({ error: 'נא לציין מזהה חג' }, { status: 400 });

    const existing = db.prepare('SELECT * FROM holidays WHERE id = ?').get(Number(id));
    if (!existing) return NextResponse.json({ error: 'חג לא נמצא' }, { status: 404 });

    const updates: string[] = [];
    const values: any[] = [];

    if (date !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
        return NextResponse.json({ error: 'פורמט תאריך לא תקין. נדרש YYYY-MM-DD' }, { status: 400 });
      }
      updates.push('date = ?');
      values.push(String(date));
      updates.push('year = ?');
      values.push(Number(String(date).slice(0, 4)));
    }
    if (name_he !== undefined) {
      updates.push('name_he = ?');
      values.push(String(name_he).trim());
    }
    if (name_en !== undefined) {
      updates.push('name_en = ?');
      values.push(String(name_en).trim());
    }
    if (type !== undefined) {
      const validTypes: Holiday['type'][] = ['public', 'eve', 'memorial'];
      if (!validTypes.includes(type)) {
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
      .get(...values, Number(id));

    return NextResponse.json({ holiday: updated });
  },
  ['admin']
);

// DELETE /api/holidays — remove holiday (admin only)
export const DELETE = requireAuth(
  async (req) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const date = searchParams.get('date');

    if (!id && !date) {
      return NextResponse.json({ error: 'נא לציין id או date' }, { status: 400 });
    }

    if (id) {
      const existing = db.prepare('SELECT id FROM holidays WHERE id = ?').get(Number(id));
      if (!existing) return NextResponse.json({ error: 'חג לא נמצא' }, { status: 404 });
      db.prepare('DELETE FROM holidays WHERE id = ?').run(Number(id));
      return NextResponse.json({ success: true, message: 'החג נמחק' });
    }

    const result = db.prepare('DELETE FROM holidays WHERE date = ?').run(String(date));
    return NextResponse.json({ success: true, deleted: result.changes, message: 'החגים נמחקו' });
  },
  ['admin']
);
