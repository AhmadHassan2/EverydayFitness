import { describe, expect, it } from "vitest";
import type { FoodEntry, GoalRecord, WorkoutLog } from "./types";
import { buildDaySummaries, dailySeries, isWithinTarget, monthlyConsistency, summarizeRange, weeklyBuckets } from "./analytics";
import { datesBetween } from "./dates";

let n = 0;
function food(date: string, calories: number, protein = 0, carbs = 0, fat = 0): FoodEntry {
  n++;
  return {
    id: `e${n}`,
    date,
    loggedAt: `${date}T12:00:00.000Z`,
    meal: "lunch",
    name: "x",
    serving: null,
    calories,
    protein,
    carbs,
    fat,
    savedFoodId: null,
    source: "manual",
    externalRef: null,
    createdAt: `${date}T12:00:00.000Z`,
  };
}
function workout(date: string, status: WorkoutLog["status"]): WorkoutLog {
  return { id: date, date, status, workoutType: null, durationMin: null, notes: null, updatedAt: "" };
}

const goals: GoalRecord[] = [
  { effectiveDate: "2026-10-01", calories: 2000, protein: 150, carbs: 200, fat: 60 },
  { effectiveDate: "2026-10-04", calories: 2500, protein: 180, carbs: 250, fat: 80 },
];

// Oct 1–7 (Thu–Wed): Oct 2 and Oct 6 are missing, Oct 5 is a logged zero.
const dates = datesBetween("2026-10-01", "2026-10-07");
const entries = [
  food("2026-10-01", 1000, 100, 100, 20),
  food("2026-10-01", 1000, 60, 100, 20),
  food("2026-10-03", 2500, 120, 300, 80),
  food("2026-10-04", 2400, 190, 240, 70),
  food("2026-10-05", 0),
  food("2026-10-07", 3000, 200, 300, 100),
];
const workouts = [workout("2026-10-01", "trained"), workout("2026-10-02", "rest"), workout("2026-10-04", "trained"), workout("2026-10-07", "trained")];

const days = buildDaySummaries(dates, entries, goals, workouts);

describe("buildDaySummaries", () => {
  it("separates missing days from logged zeros", () => {
    const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
    expect(byDate["2026-10-02"].logged).toBe(false);
    expect(byDate["2026-10-05"]).toMatchObject({ logged: true, entryCount: 1 });
    expect(byDate["2026-10-05"].totals.calories).toBe(0);
  });

  it("attaches each day's own historical target", () => {
    expect(days[0].goal?.calories).toBe(2000);
    expect(days[3].goal?.calories).toBe(2500);
  });
});

describe("summarizeRange", () => {
  const s = summarizeRange(days);

  it("averages over logged days only", () => {
    expect(s.days).toBe(7);
    expect(s.loggedDays).toBe(5);
    // (2000 + 2500 + 2400 + 0 + 3000) / 5
    expect(s.avgCalories).toBe(1980);
    expect(s.avgProtein).toBe((160 + 120 + 190 + 0 + 200) / 5);
  });

  it("measures adherence against each day's own target", () => {
    // Oct 1: 2000 vs 2000 ✓  Oct 3: 2500 vs 2000 ✗  Oct 4: 2400 vs 2500 ✓  Oct 5: 0 ✗  Oct 7: 3000 vs 2500 ✗
    expect(s.calorieAdherence).toEqual({ count: 2, of: 5, ratio: 0.4 });
  });

  it("counts protein goal days", () => {
    // Oct 1: 160 ≥ 150 ✓  Oct 3: 120 < 150  Oct 4: 190 ≥ 180 ✓  Oct 5: 0  Oct 7: 200 ≥ 180 ✓
    expect(s.proteinGoalMet).toEqual({ count: 3, of: 5, ratio: 0.6 });
  });

  it("computes macro energy split", () => {
    const split = s.macroSplit!;
    expect(split.protein + split.carbs + split.fat).toBeCloseTo(1, 10);
    const p = 670 * 4, c = 1040 * 4, f = 290 * 9;
    expect(split.protein).toBeCloseTo(p / (p + c + f), 10);
  });

  it("counts training", () => {
    expect(s.trainedDays).toBe(3);
    expect(s.restDays).toBe(1);
    expect(s.unmarkedDays).toBe(3);
    expect(s.trainingPerWeek).toBe(3);
  });

  it("returns nulls rather than zeros with no logged days", () => {
    const empty = summarizeRange(buildDaySummaries(dates, [], goals, []));
    expect(empty.avgCalories).toBeNull();
    expect(empty.macroSplit).toBeNull();
    expect(empty.calorieAdherence.ratio).toBeNull();
    expect(empty.trainingPerWeek).toBe(0);
  });
});

describe("series and buckets", () => {
  it("emits gaps (null) for missing days", () => {
    const series = dailySeries(days);
    expect(series[1].calories).toBeNull();
    expect(series[4].calories).toBe(0);
    expect(series[3].calorieTarget).toBe(2500);
  });

  it("groups into Monday weeks with partial edges", () => {
    const weeks = weeklyBuckets(days);
    expect(weeks.map((w) => w.weekStart)).toEqual(["2026-09-28", "2026-10-05"]);
    expect(weeks[0]).toMatchObject({ daysInRange: 4, loggedDays: 3, trainedDays: 2 });
    expect(weeks[0].avgCalories).toBe((2000 + 2500 + 2400) / 3);
    expect(weeks[1]).toMatchObject({ daysInRange: 3, loggedDays: 2, trainedDays: 1, avgCalories: 1500 });
  });

  it("computes monthly consistency over days in range", () => {
    const m = monthlyConsistency(buildDaySummaries(datesBetween("2026-09-29", "2026-10-07"), entries, goals, workouts));
    expect(m).toEqual([
      { month: "2026-09", days: 2, trainedDays: 0, restDays: 0, ratio: 0 },
      { month: "2026-10", days: 7, trainedDays: 3, restDays: 1, ratio: 3 / 7 },
    ]);
  });

  it("applies the ±10% tolerance inclusively", () => {
    expect(isWithinTarget(2200, 2000)).toBe(true);
    expect(isWithinTarget(1800, 2000)).toBe(true);
    expect(isWithinTarget(2201, 2000)).toBe(false);
    expect(isWithinTarget(100, 0)).toBe(false);
  });
});
