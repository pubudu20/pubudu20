/**
 * Date helpers for The Builder's Wall.
 *
 * Two ideas drive everything here:
 *
 * 1. A "day key" is a plain string like "2026-11-03". All history is stored
 *    against day keys, never against timestamps, so there is no time-zone
 *    maths when we read data back.
 *
 * 2. Pubu's day ends at 3 am, not midnight. A tick at 00:45 on 5 Nov belongs
 *    to 4 Nov. `logicalDayKey()` applies that rule using the phone's local
 *    time (Asia/Colombo for Pubu).
 *
 * Day-key arithmetic is done in UTC so that adding days is always exact.
 */

export type DayKey = string; // "YYYY-MM-DD"

/** Hour (local time) at which a new day starts. 3 = 3:00 am. */
export const DAY_CUTOFF_HOUR = 3;

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export function makeDayKey(year: number, month: number, day: number): DayKey {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Splits "2026-11-03" into numbers. */
export function parseDayKey(key: DayKey): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

export function isValidDayKey(key: unknown): key is DayKey {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const { y, m, d } = parseDayKey(key);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function toUtcMs(key: DayKey): number {
  const { y, m, d } = parseDayKey(key);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): DayKey {
  const dt = new Date(ms);
  return makeDayKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The day key that `now` belongs to, using the 3 am cut-off. */
export function logicalDayKey(now: Date, cutoffHour: number = DAY_CUTOFF_HOUR): DayKey {
  // Read the local calendar date/time, then step back one calendar day if the
  // clock is before the cut-off. Using the local fields (not raw ms) keeps this
  // correct even on phones in zones with daylight saving.
  const key = makeDayKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return now.getHours() < cutoffHour ? addDays(key, -1) : key;
}

export function addDays(key: DayKey, n: number): DayKey {
  return fromUtcMs(toUtcMs(key) + n * DAY_MS);
}

/** Whole days from `a` to `b` (b − a). diffDays("2026-11-03","2026-11-04") = 1 */
export function diffDays(a: DayKey, b: DayKey): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday (same as JavaScript's getDay). */
export function weekday(key: DayKey): number {
  return new Date(toUtcMs(key)).getUTCDay();
}

/** The Monday on or before `key` (weeks run Monday → Sunday). */
export function mondayOf(key: DayKey): DayKey {
  const wd = weekday(key);
  return addDays(key, wd === 0 ? -6 : 1 - wd);
}

/** Inclusive list of day keys from `start` to `end`. Empty if end < start. */
export function dayRange(start: DayKey, end: DayKey): DayKey[] {
  const out: DayKey[] = [];
  const n = diffDays(start, end);
  for (let i = 0; i <= n; i++) out.push(addDays(start, i));
  return out;
}

export function minDay(a: DayKey, b: DayKey): DayKey {
  return a < b ? a : b;
}
export function maxDay(a: DayKey, b: DayKey): DayKey {
  return a > b ? a : b;
}

/** "HH:MM" → { h, m }, or null when invalid. */
export function parseTime(t: string | null | undefined): { h: number; m: number } | null {
  if (!t) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return { h, m };
}

export function formatTime(h: number, m: number): string {
  return `${pad(h)}:${pad(m)}`;
}

/**
 * The real local Date/time at which "HH:MM" happens during a logical day.
 * Because the day runs 3:00 am → 2:59 am, a time like "00:30" belongs to the
 * *next* calendar date.
 */
export function logicalDateTime(key: DayKey, time: string, cutoffHour = DAY_CUTOFF_HOUR): Date | null {
  const t = parseTime(time);
  if (!t) return null;
  const calendarKey = t.h < cutoffHour ? addDays(key, 1) : key;
  const { y, m, d } = parseDayKey(calendarKey);
  return new Date(y, m - 1, d, t.h, t.m, 0, 0);
}

/** "3 pm", "10:30 am", "11:15 pm" — friendly 12-hour label. */
export function friendlyTime(time: string | null | undefined): string {
  const t = parseTime(time);
  if (!t) return '';
  const suffix = t.h < 12 ? 'am' : 'pm';
  const h12 = t.h % 12 === 0 ? 12 : t.h % 12;
  return t.m === 0 ? `${h12} ${suffix}` : `${h12}:${pad(t.m)} ${suffix}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Tue 3 Nov" */
export function prettyDay(key: DayKey): string {
  const { m, d } = parseDayKey(key);
  return `${WEEKDAY_SHORT[weekday(key)]} ${d} ${MONTHS[m - 1]}`;
}

/** "3 Nov 2026" */
export function prettyDate(key: DayKey): string {
  const { y, m, d } = parseDayKey(key);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
