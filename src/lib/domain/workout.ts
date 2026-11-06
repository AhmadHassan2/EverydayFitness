import type { DayStatus, ISODate, WorkoutLog, WorkoutStatus } from "./types";
import { compareDates } from "./dates";

export function indexByDate<T extends { date: ISODate }>(items: readonly T[]): Map<ISODate, T> {
  const map = new Map<ISODate, T>();
  for (const it of items) map.set(it.date, it);
  return map;
}

export function statusForDate(logs: ReadonlyMap<ISODate, WorkoutLog>, date: ISODate): DayStatus {
  return logs.get(date)?.status ?? "none";
}

/**
 * Result of tapping a status button. Tapping the active status clears the day
 * back to "not logged" so the control doubles as an undo.
 */
export function nextStatusOnTap(current: DayStatus, tapped: WorkoutStatus): DayStatus {
  return current === tapped ? "none" : tapped;
}

export interface WeekStripDay {
  date: ISODate;
  status: DayStatus;
  isToday: boolean;
  isFuture: boolean;
}

export function buildWeekStrip(
  dates: readonly ISODate[],
  logs: ReadonlyMap<ISODate, WorkoutLog>,
  today: ISODate,
): WeekStripDay[] {
  return dates.map((date) => {
    const isFuture = compareDates(date, today) > 0;
    return {
      date,
      // Future days can't have been trained; ignore any stray record.
      status: isFuture ? "none" : statusForDate(logs, date),
      isToday: date === today,
      isFuture,
    };
  });
}

export function countStatuses(days: readonly { status: DayStatus }[]): Record<DayStatus, number> {
  const out: Record<DayStatus, number> = { trained: 0, rest: 0, none: 0 };
  for (const d of days) out[d.status] += 1;
  return out;
}

export function formatDuration(min: number | null): string | null {
  if (!min) return null;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
