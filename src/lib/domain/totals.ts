import type { FoodEntry, Goals, MacroKey, MealType, Nutrition } from "./types";
import { MEAL_TYPES } from "./types";

/*
 * Rounding policy: sums use the stored values (kcal to 0.1, grams to 0.1), and
 * only presentation rounds. Summing pre-rounded display values would drift.
 */

export const ZERO_NUTRITION: Nutrition = Object.freeze({ calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0, potassium: 0 });

/** Round to one decimal without binary-float artefacts (0.1 + 0.2 → 0.3). */
export function round1(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

export function sumNutrition(items: readonly Nutrition[]): Nutrition {
  // Accumulate in tenths as integers so long lists don't build float error.
  let c = 0,
    p = 0,
    cb = 0,
    f = 0,
    s = 0,
    k = 0;
  for (const it of items) {
    c += Math.round(it.calories * 10);
    p += Math.round(it.protein * 10);
    cb += Math.round(it.carbs * 10);
    f += Math.round(it.fat * 10);
    s += Math.round((it.sodium ?? 0) * 10);
    k += Math.round((it.potassium ?? 0) * 10);
  }
  return { calories: c / 10, protein: p / 10, carbs: cb / 10, fat: f / 10, sodium: s / 10, potassium: k / 10 };
}

export function scaleNutrition(n: Nutrition, factor: number): Nutrition {
  return {
    calories: round1(n.calories * factor),
    protein: round1(n.protein * factor),
    carbs: round1(n.carbs * factor),
    fat: round1(n.fat * factor),
    sodium: round1((n.sodium ?? 0) * factor),
    potassium: round1((n.potassium ?? 0) * factor),
  };
}

export interface Progress {
  consumed: number;
  target: number;
  /** target − consumed, never negative. */
  remaining: number;
  /** consumed − target when over, else 0. */
  over: number;
  isOver: boolean;
  /** consumed / target, unclamped (1 = 100%). 0 when there is no target. */
  ratio: number;
}

export function progress(consumed: number, target: number): Progress {
  const diff = round1(target - consumed);
  return {
    consumed,
    target,
    remaining: Math.max(0, diff),
    over: Math.max(0, -diff),
    isOver: target > 0 && consumed > target,
    ratio: target > 0 ? consumed / target : 0,
  };
}

export interface DayProgress {
  totals: Nutrition;
  calories: Progress;
  macros: Record<MacroKey, number>;
}

export function dayProgress(entries: readonly Nutrition[], goals: Goals): DayProgress {
  const totals = sumNutrition(entries);
  return {
    totals,
    calories: progress(totals.calories, goals.calories),
    macros: {
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
    },
  };
}

export interface MealGroup {
  meal: MealType;
  entries: FoodEntry[];
  totals: Nutrition;
}

/** Groups entries by meal in a fixed order, entries sorted by time eaten. */
export function groupByMeal(entries: readonly FoodEntry[]): MealGroup[] {
  return MEAL_TYPES.map((meal) => {
    const list = entries
      .filter((e) => e.meal === meal)
      .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt) || a.createdAt.localeCompare(b.createdAt));
    return { meal, entries: list, totals: sumNutrition(list) };
  }).filter((g) => g.entries.length > 0);
}

/** kcal implied by macros (Atwater 4/4/9). */
export function caloriesFromMacros(m: Pick<Nutrition, "protein" | "carbs" | "fat">): number {
  return m.protein * 4 + m.carbs * 4 + m.fat * 9;
}
