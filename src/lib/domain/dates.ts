import type { ISODate, MealType } from "./types";

/*
 * Calendar math works on `YYYY-MM-DD` strings. Day arithmetic goes through
 * Date.UTC so it never crosses a DST boundary; the user's timezone only matters
 * when converting an instant ("now", a timestamp) into a local calendar date.
 */

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isISODate(value: string): value is ISODate {
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function parseISODate(date: ISODate): { year: number; month: number; day: number } {
  const m = ISO_RE.exec(date);
  if (!m) throw new Error(`Invalid date: ${date}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

export function toISODate(year: number, month: number, day: number): ISODate {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

function toUTCDate(date: ISODate): Date {
  const { year, month, day } = parseISODate(date);
  return new Date(Date.UTC(year, month - 1, day));
}

function fromUTCDate(dt: Date): ISODate {
  return toISODate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function addDays(date: ISODate, days: number): ISODate {
  const dt = toUTCDate(date);
  dt.setUTCDate(dt.getUTCDate() + days);
  return fromUTCDate(dt);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTCDate(b).getTime() - toUTCDate(a).getTime()) / 86_400_000);
}

export function compareDates(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Monday = 0 … Sunday = 6. */
export function weekdayIndex(date: ISODate): number {
  return (toUTCDate(date).getUTCDay() + 6) % 7;
}

export function startOfWeek(date: ISODate): ISODate {
  return addDays(date, -weekdayIndex(date));
}

/** Monday through Sunday of the week containing `date`. */
export function weekDates(date: ISODate): ISODate[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Inclusive list of dates from `from` to `to`. */
export function datesBetween(from: ISODate, to: ISODate): ISODate[] {
  const n = diffDays(from, to);
  if (n < 0) return [];
  return Array.from({ length: n + 1 }, (_, i) => addDays(from, i));
}

/** The `days` calendar days ending on (and including) `end`. */
export function rangeEnding(end: ISODate, days: number): { from: ISODate; to: ISODate; dates: ISODate[] } {
  const from = addDays(end, -(days - 1));
  return { from, to: end, dates: datesBetween(from, end) };
}

export function monthKey(date: ISODate): string {
  return date.slice(0, 7);
}

export function startOfMonth(date: ISODate): ISODate {
  return `${date.slice(0, 7)}-01`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addMonths(date: ISODate, months: number): ISODate {
  const { year, month, day } = parseISODate(date);
  const total = year * 12 + (month - 1) + months;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return toISODate(y, m, Math.min(day, daysInMonth(y, m)));
}

export interface MonthGridCell {
  date: ISODate;
  inMonth: boolean;
}

/** Monday-first weeks covering the month of `date` (4–6 rows). */
export function monthGrid(date: ISODate): MonthGridCell[][] {
  const first = startOfMonth(date);
  const { year, month } = parseISODate(first);
  const last = toISODate(year, month, daysInMonth(year, month));
  const gridStart = startOfWeek(first);
  const gridEnd = addDays(startOfWeek(last), 6);
  const cells = datesBetween(gridStart, gridEnd).map((d) => ({ date: d, inMonth: monthKey(d) === monthKey(first) }));
  const weeks: MonthGridCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// ---------------------------------------------------------------------------
// Timezone conversions
// ---------------------------------------------------------------------------

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsFormatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatterCache.set(timeZone, f);
  }
  return f;
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const out: Record<string, number> = {};
  for (const p of partsFormatter(timeZone).formatToParts(instant)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour === 24 ? 0 : out.hour,
    minute: out.minute,
    second: out.second,
  };
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** The local calendar date of `instant` in `timeZone`. */
export function dateInZone(instant: Date, timeZone: string): ISODate {
  const p = zonedParts(instant, timeZone);
  return toISODate(p.year, p.month, p.day);
}

export function todayIn(timeZone: string, now: Date = new Date()): ISODate {
  return dateInZone(now, timeZone);
}

/** Local wall-clock time `HH:mm` of `instant` in `timeZone`. */
export function timeInZone(instant: Date, timeZone: string): string {
  const p = zonedParts(instant, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUTC - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Converts a local date + wall-clock time in `timeZone` into a UTC instant.
 * For times skipped by a DST jump the result lands just after the gap.
 */
export function zonedToUtc(date: ISODate, time: string, timeZone: string): Date {
  const { year, month, day } = parseISODate(date);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(year, month - 1, day, hh, mm);
  let guess = wall - zoneOffsetMs(new Date(wall), timeZone);
  // Second pass corrects guesses that straddle an offset change.
  guess = wall - zoneOffsetMs(new Date(guess), timeZone);
  return new Date(guess);
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

function formatUTC(date: ISODate, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(toUTCDate(date));
}

/** "Today", "Yesterday", "Tomorrow", or e.g. "Tue, Oct 22" (adds year if different). */
export function relativeDayLabel(date: ISODate, today: ISODate): string {
  const diff = diffDays(today, date);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return longDayLabel(date, today);
}

export function longDayLabel(date: ISODate, today?: ISODate): string {
  const sameYear = !today || date.slice(0, 4) === today.slice(0, 4);
  return formatUTC(date, { weekday: "short", month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

export function fullDayLabel(date: ISODate): string {
  return formatUTC(date, { weekday: "long", month: "long", day: "numeric" });
}

export function shortDateLabel(date: ISODate): string {
  return formatUTC(date, { month: "short", day: "numeric" });
}

export function weekdayShort(date: ISODate): string {
  return formatUTC(date, { weekday: "narrow" });
}

export function monthLabel(date: ISODate): string {
  return formatUTC(date, { month: "long", year: "numeric" });
}

export function monthShortLabel(date: ISODate): string {
  return formatUTC(date, { month: "short" });
}

/** "8:05 AM" from a `HH:mm` string. */
export function formatClock(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

/** Default meal for a local hour of day. */
export function mealForHour(hour: number): MealType {
  if (hour >= 4 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 17 && hour < 22) return "dinner";
  return "snack";
}
