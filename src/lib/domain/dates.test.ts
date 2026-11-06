import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  dateInZone,
  datesBetween,
  diffDays,
  isISODate,
  mealForHour,
  monthGrid,
  rangeEnding,
  relativeDayLabel,
  startOfWeek,
  timeInZone,
  todayIn,
  weekDates,
  weekdayIndex,
  zonedToUtc,
} from "./dates";

describe("ISO date helpers", () => {
  it("validates real calendar dates only", () => {
    expect(isISODate("2026-02-28")).toBe(true);
    expect(isISODate("2028-02-29")).toBe(true);
    expect(isISODate("2026-02-29")).toBe(false);
    expect(isISODate("2026-13-01")).toBe(false);
    expect(isISODate("2026-1-01")).toBe(false);
  });

  it("adds days across month, year and DST boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    // US DST starts 2026-03-08; calendar math must not skip or repeat a day.
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(diffDays("2026-03-01", "2026-04-01")).toBe(31);
  });

  it("builds Monday-first weeks", () => {
    expect(weekdayIndex("2026-10-19")).toBe(0); // Monday
    expect(weekdayIndex("2026-10-25")).toBe(6); // Sunday
    expect(startOfWeek("2026-10-25")).toBe("2026-10-19");
    expect(weekDates("2026-10-22")).toEqual([
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
  });

  it("returns inclusive ranges", () => {
    expect(datesBetween("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(datesBetween("2026-11-02", "2026-10-30")).toEqual([]);
    const r = rangeEnding("2026-10-24", 7);
    expect(r.from).toBe("2026-10-18");
    expect(r.dates).toHaveLength(7);
  });

  it("clamps month arithmetic to month length", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
    expect(addMonths("2026-11-30", 14)).toBe("2028-01-30");
  });

  it("produces a full month grid", () => {
    const grid = monthGrid("2026-02-10"); // Feb 2026 starts on Sunday
    expect(grid[0][0].date).toBe("2026-01-26");
    expect(grid[0][6]).toEqual({ date: "2026-02-01", inMonth: true });
    expect(grid.flat().filter((c) => c.inMonth)).toHaveLength(28);
    expect(grid.every((w) => w.length === 7)).toBe(true);
  });
});

describe("timezone conversion", () => {
  const instant = new Date("2026-10-24T03:30:00Z");

  it("resolves the local calendar day per timezone", () => {
    expect(dateInZone(instant, "UTC")).toBe("2026-10-24");
    expect(dateInZone(instant, "America/Los_Angeles")).toBe("2026-10-23");
    expect(dateInZone(instant, "Asia/Tokyo")).toBe("2026-10-24");
    expect(todayIn("Pacific/Kiritimati", new Date("2026-10-24T11:00:00Z"))).toBe("2026-10-25");
  });

  it("formats local wall-clock time", () => {
    expect(timeInZone(instant, "America/New_York")).toBe("23:30");
    expect(timeInZone(new Date("2026-10-24T00:00:00Z"), "UTC")).toBe("00:00");
  });

  it("converts local date + time to UTC, including around DST", () => {
    expect(zonedToUtc("2026-10-24", "08:15", "America/New_York").toISOString()).toBe("2026-10-24T12:15:00.000Z");
    expect(zonedToUtc("2026-01-15", "08:15", "America/New_York").toISOString()).toBe("2026-01-15T13:15:00.000Z");
    expect(zonedToUtc("2026-03-29", "12:00", "Europe/London").toISOString()).toBe("2026-03-29T11:00:00.000Z");
    expect(zonedToUtc("2026-10-24", "23:59", "Asia/Kolkata").toISOString()).toBe("2026-10-24T18:29:00.000Z");
  });

  it("round-trips back to the same local date", () => {
    for (const tz of ["America/Los_Angeles", "Australia/Sydney", "Asia/Kathmandu", "UTC"]) {
      const utc = zonedToUtc("2026-11-01", "00:30", tz);
      expect(dateInZone(utc, tz)).toBe("2026-11-01");
    }
  });
});

describe("labels and defaults", () => {
  it("labels days relative to today", () => {
    expect(relativeDayLabel("2026-10-24", "2026-10-24")).toBe("Today");
    expect(relativeDayLabel("2026-10-23", "2026-10-24")).toBe("Yesterday");
    expect(relativeDayLabel("2026-10-20", "2026-10-24")).toBe("Tue, Oct 20");
    expect(relativeDayLabel("2025-10-20", "2026-10-24")).toBe("Mon, Oct 20, 2025");
  });

  it("picks a meal from the hour", () => {
    expect(mealForHour(7)).toBe("breakfast");
    expect(mealForHour(12)).toBe("lunch");
    expect(mealForHour(16)).toBe("snack");
    expect(mealForHour(19)).toBe("dinner");
    expect(mealForHour(23)).toBe("snack");
  });
});
