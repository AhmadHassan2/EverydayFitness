import { describe, expect, it } from "vitest";
import type { WorkoutLog } from "./types";
import { buildWeekStrip, countStatuses, formatDuration, indexByDate, nextStatusOnTap, statusForDate } from "./workout";
import { weekDates } from "./dates";
import { workoutInputSchema } from "./validation";

function log(date: string, status: WorkoutLog["status"]): WorkoutLog {
  return { id: date, date, status, workoutType: null, durationMin: null, notes: null, updatedAt: "" };
}

describe("workout status", () => {
  const logs = indexByDate([log("2026-10-19", "trained"), log("2026-10-20", "rest"), log("2026-10-26", "trained")]);

  it("reads status, defaulting to not logged", () => {
    expect(statusForDate(logs, "2026-10-19")).toBe("trained");
    expect(statusForDate(logs, "2026-10-21")).toBe("none");
  });

  it("toggles off when the active status is tapped again", () => {
    expect(nextStatusOnTap("none", "trained")).toBe("trained");
    expect(nextStatusOnTap("trained", "trained")).toBe("none");
    expect(nextStatusOnTap("trained", "rest")).toBe("rest");
    expect(nextStatusOnTap("rest", "rest")).toBe("none");
  });

  it("builds a Mon–Sun strip that ignores future days", () => {
    const strip = buildWeekStrip(weekDates("2026-10-24"), logs, "2026-10-24");
    expect(strip).toHaveLength(7);
    expect(strip[0]).toMatchObject({ status: "trained", isToday: false, isFuture: false });
    expect(strip[1].status).toBe("rest");
    expect(strip[5]).toMatchObject({ date: "2026-10-24", isToday: true });
    expect(strip[6]).toMatchObject({ isFuture: true, status: "none" });
    expect(countStatuses(strip)).toEqual({ trained: 1, rest: 1, none: 5 });
  });

  it("formats durations", () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(95)).toBe("1 h 35 min");
  });
});

describe("workout validation", () => {
  it("strips workout details from rest days", () => {
    const parsed = workoutInputSchema.parse({ status: "rest", workoutType: "push", durationMin: 50, notes: " Sore " });
    expect(parsed).toEqual({ status: "rest", workoutType: null, durationMin: null, notes: "Sore" });
  });

  it("rejects out-of-range durations", () => {
    expect(workoutInputSchema.safeParse({ status: "trained", workoutType: "legs", durationMin: 0, notes: null }).success).toBe(false);
    expect(workoutInputSchema.safeParse({ status: "trained", workoutType: "legs", durationMin: 601, notes: null }).success).toBe(false);
    expect(workoutInputSchema.safeParse({ status: "trained", workoutType: null, durationMin: null, notes: null }).success).toBe(true);
  });
});
