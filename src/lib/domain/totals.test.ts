import { describe, expect, it } from "vitest";
import type { FoodEntry } from "./types";
import { caloriesFromMacros, dayProgress, groupByMeal, progress, round1, sumNutrition } from "./totals";

function entry(partial: Partial<FoodEntry>): FoodEntry {
  return {
    id: Math.random().toString(36).slice(2),
    date: "2026-10-24",
    loggedAt: "2026-10-24T12:00:00.000Z",
    meal: "lunch",
    name: "Food",
    serving: null,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    savedFoodId: null,
    source: "manual",
    externalRef: null,
    createdAt: "2026-10-24T12:00:00.000Z",
    ...partial,
  };
}

describe("sumNutrition", () => {
  it("sums without floating point drift", () => {
    const items = Array.from({ length: 10 }, () => ({ calories: 0.1, protein: 0.1, carbs: 0.2, fat: 0.3 }));
    expect(sumNutrition(items)).toEqual({ calories: 1, protein: 1, carbs: 2, fat: 3 });
  });

  it("returns zeros for an empty list", () => {
    expect(sumNutrition([])).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it("adds realistic entries", () => {
    const t = sumNutrition([
      { calories: 410, protein: 32.5, carbs: 41, fat: 12.4 },
      { calories: 95, protein: 0.5, carbs: 25.1, fat: 0.3 },
    ]);
    expect(t).toEqual({ calories: 505, protein: 33, carbs: 66.1, fat: 12.7 });
  });
});

describe("progress", () => {
  it("reports remaining under target", () => {
    const p = progress(1500, 2200);
    expect(p.remaining).toBe(700);
    expect(p.isOver).toBe(false);
    expect(p.over).toBe(0);
    expect(p.ratio).toBeCloseTo(0.6818, 3);
  });

  it("reports overage separately and clamps remaining", () => {
    const p = progress(2350, 2200);
    expect(p.remaining).toBe(0);
    expect(p.over).toBe(150);
    expect(p.isOver).toBe(true);
    expect(p.ratio).toBeGreaterThan(1);
  });

  it("exactly on target is not over", () => {
    expect(progress(2200, 2200).isOver).toBe(false);
  });

  it("handles a zero target", () => {
    expect(progress(10, 0)).toMatchObject({ ratio: 0, isOver: false });
  });
});

describe("dayProgress", () => {
  it("combines totals with goals", () => {
    const d = dayProgress(
      [entry({ calories: 600, protein: 40, carbs: 60, fat: 20 }), entry({ calories: 400, protein: 30, carbs: 30, fat: 15 })],
      { calories: 2000, protein: 150, carbs: 200, fat: 60 },
    );
    expect(d.totals).toEqual({ calories: 1000, protein: 70, carbs: 90, fat: 35 });
    expect(d.calories.remaining).toBe(1000);
    expect(d.macros.protein.remaining).toBe(80);
  });
});

describe("groupByMeal", () => {
  it("orders meals and entries, skipping empty meals", () => {
    const groups = groupByMeal([
      entry({ id: "d", meal: "dinner", loggedAt: "2026-10-24T19:00:00Z", calories: 700 }),
      entry({ id: "b2", meal: "breakfast", loggedAt: "2026-10-24T08:30:00Z", calories: 100 }),
      entry({ id: "b1", meal: "breakfast", loggedAt: "2026-10-24T08:00:00Z", calories: 300 }),
    ]);
    expect(groups.map((g) => g.meal)).toEqual(["breakfast", "dinner"]);
    expect(groups[0].entries.map((e) => e.id)).toEqual(["b1", "b2"]);
    expect(groups[0].totals.calories).toBe(400);
  });
});

describe("helpers", () => {
  it("rounds to one decimal", () => {
    expect(round1(0.1 + 0.2)).toBe(0.3);
    expect(round1(1.25)).toBe(1.3);
  });

  it("computes Atwater calories", () => {
    expect(caloriesFromMacros({ protein: 150, carbs: 230, fat: 70 })).toBe(2150);
  });
});
