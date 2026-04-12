// ============================================================
// lib/holidays.ts — Israeli holidays 2025 & 2026
// ============================================================

import type { Holiday } from '@/types';

/**
 * Comprehensive list of Israeli public holidays and eves for 2025-2026.
 * "eve" entries mark the night-before (erev) which is a half-day in Israel.
 * "memorial" entries mark Yom HaZikaron / Yom HaShoah.
 */
export const ISRAELI_HOLIDAYS: Holiday[] = [
  // ── 2025 ──────────────────────────────────────────────────────────────

  // Purim
  { date: '2025-03-13', name_he: 'תענית אסתר', name_en: "Ta'anit Esther", type: 'eve', year: 2025 },
  { date: '2025-03-13', name_he: 'פורים', name_en: 'Purim', type: 'public', year: 2025 },

  // Pesach
  { date: '2025-04-12', name_he: 'ערב פסח', name_en: 'Erev Pesach', type: 'eve', year: 2025 },
  { date: '2025-04-13', name_he: 'פסח - יום א', name_en: 'Pesach Day 1', type: 'public', year: 2025 },
  { date: '2025-04-14', name_he: 'פסח - יום ב', name_en: 'Pesach Day 2', type: 'public', year: 2025 },
  { date: '2025-04-15', name_he: 'חול המועד פסח', name_en: 'Chol HaMoed Pesach', type: 'public', year: 2025 },
  { date: '2025-04-16', name_he: 'חול המועד פסח', name_en: 'Chol HaMoed Pesach', type: 'public', year: 2025 },
  { date: '2025-04-17', name_he: 'חול המועד פסח', name_en: 'Chol HaMoed Pesach', type: 'public', year: 2025 },
  { date: '2025-04-18', name_he: 'חול המועד פסח', name_en: 'Chol HaMoed Pesach', type: 'public', year: 2025 },
  { date: '2025-04-19', name_he: 'שביעי של פסח', name_en: 'Pesach Day 7', type: 'public', year: 2025 },
  { date: '2025-04-20', name_he: 'אחרון של פסח', name_en: 'Pesach Day 8', type: 'public', year: 2025 },

  // Yom HaShoah
  { date: '2025-05-01', name_he: 'יום הזיכרון לשואה', name_en: 'Yom HaShoah', type: 'memorial', year: 2025 },

  // Yom HaZikaron & Yom HaAtzmaut
  { date: '2025-05-05', name_he: 'יום הזיכרון', name_en: 'Yom HaZikaron', type: 'memorial', year: 2025 },
  { date: '2025-05-06', name_he: 'יום העצמאות', name_en: 'Yom HaAtzmaut', type: 'public', year: 2025 },

  // Lag BaOmer
  { date: '2025-05-16', name_he: "ל''ג בעומר", name_en: "Lag Ba'Omer", type: 'public', year: 2025 },

  // Shavuot
  { date: '2025-06-01', name_he: 'ערב שבועות', name_en: 'Erev Shavuot', type: 'eve', year: 2025 },
  { date: '2025-06-02', name_he: 'שבועות - יום א', name_en: 'Shavuot Day 1', type: 'public', year: 2025 },
  { date: '2025-06-03', name_he: 'שבועות - יום ב', name_en: 'Shavuot Day 2', type: 'public', year: 2025 },

  // Tisha BeAv
  { date: '2025-08-12', name_he: "תשעה באב", name_en: "Tisha B'Av", type: 'memorial', year: 2025 },

  // Rosh Hashana 5786
  { date: '2025-09-22', name_he: 'ערב ראש השנה', name_en: 'Erev Rosh Hashana', type: 'eve', year: 2025 },
  { date: '2025-09-23', name_he: 'ראש השנה - יום א', name_en: 'Rosh Hashana Day 1', type: 'public', year: 2025 },
  { date: '2025-09-24', name_he: 'ראש השנה - יום ב', name_en: 'Rosh Hashana Day 2', type: 'public', year: 2025 },

  // Yom Kippur
  { date: '2025-10-01', name_he: 'ערב יום כיפור', name_en: 'Erev Yom Kippur', type: 'eve', year: 2025 },
  { date: '2025-10-02', name_he: 'יום כיפור', name_en: 'Yom Kippur', type: 'public', year: 2025 },

  // Sukkot
  { date: '2025-10-06', name_he: 'ערב סוכות', name_en: 'Erev Sukkot', type: 'eve', year: 2025 },
  { date: '2025-10-07', name_he: 'סוכות - יום א', name_en: 'Sukkot Day 1', type: 'public', year: 2025 },
  { date: '2025-10-08', name_he: 'סוכות - יום ב', name_en: 'Sukkot Day 2', type: 'public', year: 2025 },
  { date: '2025-10-09', name_he: 'חול המועד סוכות', name_en: 'Chol HaMoed Sukkot', type: 'public', year: 2025 },
  { date: '2025-10-10', name_he: 'חול המועד סוכות', name_en: 'Chol HaMoed Sukkot', type: 'public', year: 2025 },
  { date: '2025-10-11', name_he: 'חול המועד סוכות', name_en: 'Chol HaMoed Sukkot', type: 'public', year: 2025 },
  { date: '2025-10-12', name_he: 'חול המועד סוכות', name_en: 'Chol HaMoed Sukkot', type: 'public', year: 2025 },
  { date: '2025-10-13', name_he: 'הושענא רבה', name_en: 'Hoshana Raba', type: 'public', year: 2025 },
  { date: '2025-10-14', name_he: 'שמיני עצרת / שמחת תורה', name_en: 'Shmini Atzeret / Simchat Torah', type: 'public', year: 2025 },

  // Hanukkah
  { date: '2025-12-15', name_he: 'חנוכה - יום א', name_en: 'Hanukkah Day 1', type: 'public', year: 2025 },
  { date: '2025-12-16', name_he: 'חנוכה - יום ב', name_en: 'Hanukkah Day 2', type: 'public', year: 2025 },
  { date: '2025-12-17', name_he: 'חנוכה - יום ג', name_en: 'Hanukkah Day 3', type: 'public', year: 2025 },
  { date: '2025-12-18', name_he: 'חנוכה - יום ד', name_en: 'Hanukkah Day 4', type: 'public', year: 2025 },
  { date: '2025-12-19', name_he: 'חנוכה - יום ה', name_en: 'Hanukkah Day 5', type: 'public', year: 2025 },
  { date: '2025-12-20', name_he: 'חנוכה - יום ו', name_en: 'Hanukkah Day 6', type: 'public', year: 2025 },
  { date: '2025-12-21', name_he: 'חנוכה - יום ז', name_en: 'Hanukkah Day 7', type: 'public', year: 2025 },
  { date: '2025-12-22', name_he: 'חנוכה - יום ח', name_en: 'Hanukkah Day 8', type: 'public', year: 2025 },

  // ── 2026 ──────────────────────────────────────────────────────────────

  // Tu BiShvat
  { date: '2026-02-01', name_he: 'ט"ו בשבט', name_en: "Tu BiShvat", type: 'public', year: 2026 },

  // Purim
  { date: '2026-03-02', name_he: 'תענית אסתר', name_en: "Ta'anit Esther", type: 'eve', year: 2026 },
  { date: '2026-03-03', name_he: 'פורים', name_en: 'Purim', type: 'public', year: 2026 },

  // Pesach
  { date: '2026-04-01', name_he: 'ערב פסח', name_en: 'Erev Pesach', type: 'eve', year: 2026 },
  { date: '2026-04-02', name_he: 'פסח - יום א', name_en: 'Pesach Day 1', type: 'public', year: 2026 },
  { date: '2026-04-03', name_he: 'פסח - יום ב', name_en: 'Pesach Day 2', type: 'public', year: 2026 },
  { date: '2026-04-04', name_he: 'חול המועד פסח', name_en: 'Chol HaMoed Pesach', type: 'public', year: 2026 },
  { date: '2026-04-05', name_he: 'חול המועד פסח', name_en: 'Chol HaMoed Pesach', type: 'public', year: 2026 },
  { date: '2026-04-06', name_he: 'חול המועד פסח', name_en: 'Chol HaMoed Pesach', type: 'public', year: 2026 },
  { date: '2026-04-07', name_he: 'חול המועד פסח', name_en: 'Chol HaMoed Pesach', type: 'public', year: 2026 },
  { date: '2026-04-08', name_he: 'שביעי של פסח', name_en: 'Pesach Day 7', type: 'public', year: 2026 },
  { date: '2026-04-09', name_he: 'אחרון של פסח', name_en: 'Pesach Day 8', type: 'public', year: 2026 },

  // Yom HaShoah
  { date: '2026-04-20', name_he: 'יום הזיכרון לשואה', name_en: 'Yom HaShoah', type: 'memorial', year: 2026 },

  // Yom HaZikaron & Yom HaAtzmaut
  { date: '2026-04-28', name_he: 'יום הזיכרון', name_en: 'Yom HaZikaron', type: 'memorial', year: 2026 },
  { date: '2026-04-29', name_he: 'יום העצמאות', name_en: 'Yom HaAtzmaut', type: 'public', year: 2026 },

  // Lag BaOmer
  { date: '2026-05-06', name_he: "ל''ג בעומר", name_en: "Lag Ba'Omer", type: 'public', year: 2026 },

  // Shavuot
  { date: '2026-05-21', name_he: 'ערב שבועות', name_en: 'Erev Shavuot', type: 'eve', year: 2026 },
  { date: '2026-05-22', name_he: 'שבועות - יום א', name_en: 'Shavuot Day 1', type: 'public', year: 2026 },
  { date: '2026-05-23', name_he: 'שבועות - יום ב', name_en: 'Shavuot Day 2', type: 'public', year: 2026 },

  // Tisha BeAv
  { date: '2026-08-02', name_he: "תשעה באב", name_en: "Tisha B'Av", type: 'memorial', year: 2026 },

  // Rosh Hashana 5787
  { date: '2026-09-10', name_he: 'ערב ראש השנה', name_en: 'Erev Rosh Hashana', type: 'eve', year: 2026 },
  { date: '2026-09-11', name_he: 'ראש השנה - יום א', name_en: 'Rosh Hashana Day 1', type: 'public', year: 2026 },
  { date: '2026-09-12', name_he: 'ראש השנה - יום ב', name_en: 'Rosh Hashana Day 2', type: 'public', year: 2026 },

  // Yom Kippur
  { date: '2026-09-19', name_he: 'ערב יום כיפור', name_en: 'Erev Yom Kippur', type: 'eve', year: 2026 },
  { date: '2026-09-20', name_he: 'יום כיפור', name_en: 'Yom Kippur', type: 'public', year: 2026 },

  // Sukkot
  { date: '2026-09-24', name_he: 'ערב סוכות', name_en: 'Erev Sukkot', type: 'eve', year: 2026 },
  { date: '2026-09-25', name_he: 'סוכות - יום א', name_en: 'Sukkot Day 1', type: 'public', year: 2026 },
  { date: '2026-09-26', name_he: 'סוכות - יום ב', name_en: 'Sukkot Day 2', type: 'public', year: 2026 },
  { date: '2026-09-27', name_he: 'חול המועד סוכות', name_en: 'Chol HaMoed Sukkot', type: 'public', year: 2026 },
  { date: '2026-09-28', name_he: 'חול המועד סוכות', name_en: 'Chol HaMoed Sukkot', type: 'public', year: 2026 },
  { date: '2026-09-29', name_he: 'חול המועד סוכות', name_en: 'Chol HaMoed Sukkot', type: 'public', year: 2026 },
  { date: '2026-09-30', name_he: 'חול המועד סוכות', name_en: 'Chol HaMoed Sukkot', type: 'public', year: 2026 },
  { date: '2026-10-01', name_he: 'הושענא רבה', name_en: 'Hoshana Raba', type: 'public', year: 2026 },
  { date: '2026-10-02', name_he: 'שמיני עצרת / שמחת תורה', name_en: 'Shmini Atzeret / Simchat Torah', type: 'public', year: 2026 },

  // Hanukkah
  { date: '2026-12-05', name_he: 'חנוכה - יום א', name_en: 'Hanukkah Day 1', type: 'public', year: 2026 },
  { date: '2026-12-06', name_he: 'חנוכה - יום ב', name_en: 'Hanukkah Day 2', type: 'public', year: 2026 },
  { date: '2026-12-07', name_he: 'חנוכה - יום ג', name_en: 'Hanukkah Day 3', type: 'public', year: 2026 },
  { date: '2026-12-08', name_he: 'חנוכה - יום ד', name_en: 'Hanukkah Day 4', type: 'public', year: 2026 },
  { date: '2026-12-09', name_he: 'חנוכה - יום ה', name_en: 'Hanukkah Day 5', type: 'public', year: 2026 },
  { date: '2026-12-10', name_he: 'חנוכה - יום ו', name_en: 'Hanukkah Day 6', type: 'public', year: 2026 },
  { date: '2026-12-11', name_he: 'חנוכה - יום ז', name_en: 'Hanukkah Day 7', type: 'public', year: 2026 },
  { date: '2026-12-12', name_he: 'חנוכה - יום ח', name_en: 'Hanukkah Day 8', type: 'public', year: 2026 },
];

/** Fast lookup Set — populated once. */
const _holidaySet = new Set<string>(
  ISRAELI_HOLIDAYS.filter((h) => h.type === 'public' || h.type === 'memorial').map((h) => h.date)
);

/**
 * Returns true if the given Date (or ISO yyyy-MM-dd string) is an Israeli
 * public holiday or memorial day.
 */
export function isHoliday(date: Date | string): boolean {
  const iso =
    typeof date === 'string'
      ? date.slice(0, 10)
      : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
          date.getDate()
        ).padStart(2, '0')}`;
  return _holidaySet.has(iso);
}

/**
 * Returns holiday info for a given date, or undefined if it's not a holiday.
 */
export function getHoliday(date: Date | string): Holiday | undefined {
  const iso =
    typeof date === 'string'
      ? date.slice(0, 10)
      : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
          date.getDate()
        ).padStart(2, '0')}`;
  return ISRAELI_HOLIDAYS.find((h) => h.date === iso);
}

/**
 * Returns all holidays in a given year/month.
 */
export function getHolidaysForMonth(year: number, month: number): Holiday[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return ISRAELI_HOLIDAYS.filter((h) => h.date.startsWith(prefix));
}
