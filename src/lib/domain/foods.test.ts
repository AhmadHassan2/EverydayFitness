import { describe, expect, it } from "vitest";
import type { FoodEntry } from "./types";
import { matchesQuery, rankByQuery, recentFoods } from "./foods";

function e(name: string, loggedAt: string, calories = 100): FoodEntry {
  return {
    id: name + loggedAt,
    date: loggedAt.slice(0, 10),
    loggedAt,
    meal: "snack",
    name,
    serving: null,
    calories,
    protein: 1,
    carbs: 1,
    fat: 1,
    savedFoodId: null,
    source: "manual",
    externalRef: null,
    createdAt: loggedAt,
  };
}

describe("recentFoods", () => {
  it("dedupes by name and nutrition, newest first", () => {
    const list = recentFoods(
      [e("Apple", "2026-10-20T10:00:00Z"), e("apple ", "2026-10-22T10:00:00Z"), e("Oats", "2026-10-21T08:00:00Z"), e("Apple", "2026-10-19T10:00:00Z", 80)],
      10,
    );
    expect(list.map((s) => [s.name, s.calories])).toEqual([
      ["apple ", 100],
      ["Oats", 100],
      ["Apple", 80],
    ]);
  });

  it("respects the limit", () => {
    expect(recentFoods([e("A", "2026-10-20T10:00:00Z"), e("B", "2026-10-21T10:00:00Z")], 1)).toHaveLength(1);
  });
});

describe("search", () => {
  it("matches every word, case-insensitively", () => {
    expect(matchesQuery("Greek yogurt with honey", "yog hon")).toBe(true);
    expect(matchesQuery("Greek yogurt", "oats")).toBe(false);
  });

  it("ranks exact and prefix matches first", () => {
    const ranked = rankByQuery([{ name: "Chicken rice bowl" }, { name: "Rice" }, { name: "Rice cakes" }], "rice");
    expect(ranked.map((r) => r.name)).toEqual(["Rice", "Rice cakes", "Chicken rice bowl"]);
  });
});
