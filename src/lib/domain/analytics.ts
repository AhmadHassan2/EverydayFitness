import type { DayStatus, FoodEntry, GoalRecord, Goals, ISODate, MacroKey, Nutrition, WorkoutLog } from "./types";
import { monthKey, startOfWeek } from "./dates";
import { goalForDate } from "./goals";
import { round1, sumNutrition } from "./totals";

/*
 * Definitions (also shown in the UI and README):
 * - A day is *logged* when it has at least one food entry. A logged day whose
 *   entries add up to 0 kcal is a real zero. A day with no entries is *missing*
 *   and is never counted as zero intake.
 * - Nutrition averages are taken over logged days only.
 * - Calorie adherence: a logged day whose intake is within ±10% of that day's
 *   own target (targets come from goal history, not today's goals).
 * - Training counts come from days explicitly marked "trained".
 */

export const ADHERENCE_TOLERANCE = 0.1;

export interface DaySummary {
  date: ISODate;
  logged: boolean;
  entryCount: number;
  totals: Nutrition;
  goal: Goals | null;
  workout: DayStatus;
}

export function buildDaySummaries(
  dates: readonly ISODate[],
  entries: readonly FoodEntry[],
  goalHistory: readonly GoalRecord[],
  workouts: readonly WorkoutLog[],
): DaySummary[] {
  const byDate = new Map<ISODate, FoodEntry[]>();
  for (const e of entries) {
    const list = byDate.get(e.date);
    if (list) list.push(e);
    else byDate.set(e.date, [e]);
  }
  const workoutByDate = new Map(workouts.map((w) => [w.date, w.status] as const));
  return dates.map((date) => {
    const list = byDate.get(date) ?? [];
    return {
      date,
      logged: list.length > 0,
      entryCount: list.length,
      totals: sumNutrition(list),
      goal: goalForDate(goalHistory, date),
      workout: workoutByDate.get(date) ?? "none",
    };
  });
}

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function isWithinTarget(calories: number, target: number, tolerance = ADHERENCE_TOLERANCE): boolean {
  if (target <= 0) return false;
  return Math.abs(calories - target) <= target * tolerance;
}

export interface Ratio {
  count: number;
  of: number;
  /** count / of, or null when there is nothing to measure. */
  ratio: number | null;
}

function ratio(count: number, of: number): Ratio {
  return { count, of, ratio: of > 0 ? count / of : null };
}

export interface RangeSummary {
  days: number;
  loggedDays: number;
  avgCalories: number | null;
  avgProtein: number | null;
  avgCarbs: number | null;
  avgFat: number | null;
  /** Average of each logged day's own calorie target. */
  avgCalorieTarget: number | null;
  avgProteinTarget: number | null;
  proteinGoalMet: Ratio;
  calorieAdherence: Ratio;
  /** Share of energy from each macro across logged days (sums to 1), or null. */
  macroSplit: Record<MacroKey, number> | null;
  trainedDays: number;
  restDays: number;
  unmarkedDays: number;
  /** Trained days normalised to a 7-day week. */
  trainingPerWeek: number;
}

export function summarizeRange(days: readonly DaySummary[]): RangeSummary {
  const logged = days.filter((d) => d.logged);
  const withGoal = logged.filter((d): d is DaySummary & { goal: Goals } => d.goal !== null);

  const totals = sumNutrition(logged.map((d) => d.totals));
  const macroKcal = { protein: totals.protein * 4, carbs: totals.carbs * 4, fat: totals.fat * 9 };
  const macroTotal = macroKcal.protein + macroKcal.carbs + macroKcal.fat;

  let trainedDays = 0,
    restDays = 0;
  for (const d of days) {
    if (d.workout === "trained") trainedDays++;
    else if (d.workout === "rest") restDays++;
  }

  return {
    days: days.length,
    loggedDays: logged.length,
    avgCalories: mean(logged.map((d) => d.totals.calories)),
    avgProtein: mean(logged.map((d) => d.totals.protein)),
    avgCarbs: mean(logged.map((d) => d.totals.carbs)),
    avgFat: mean(logged.map((d) => d.totals.fat)),
    avgCalorieTarget: mean(withGoal.map((d) => d.goal.calories)),
    avgProteinTarget: mean(withGoal.map((d) => d.goal.protein)),
    proteinGoalMet: ratio(
      withGoal.filter((d) => d.goal.protein > 0 && d.totals.protein >= d.goal.protein).length,
      withGoal.filter((d) => d.goal.protein > 0).length,
    ),
    calorieAdherence: ratio(
      withGoal.filter((d) => isWithinTarget(d.totals.calories, d.goal.calories)).length,
      withGoal.filter((d) => d.goal.calories > 0).length,
    ),
    macroSplit:
      macroTotal > 0
        ? {
            protein: macroKcal.protein / macroTotal,
            carbs: macroKcal.carbs / macroTotal,
            fat: macroKcal.fat / macroTotal,
          }
        : null,
    trainedDays,
    restDays,
    unmarkedDays: days.length - trainedDays - restDays,
    trainingPerWeek: days.length > 0 ? round1((trainedDays / days.length) * 7) : 0,
  };
}

export interface DailyPoint {
  date: ISODate;
  /** null = not logged (a gap, not a zero). */
  calories: number | null;
  calorieTarget: number | null;
  protein: number | null;
  proteinTarget: number | null;
  workout: DayStatus;
}

export function dailySeries(days: readonly DaySummary[]): DailyPoint[] {
  return days.map((d) => ({
    date: d.date,
    calories: d.logged ? d.totals.calories : null,
    calorieTarget: d.goal?.calories ?? null,
    protein: d.logged ? d.totals.protein : null,
    proteinTarget: d.goal?.protein ?? null,
    workout: d.workout,
  }));
}

export interface WeekBucket {
  weekStart: ISODate;
  /** Days of this week that fall inside the selected range. */
  daysInRange: number;
  loggedDays: number;
  avgCalories: number | null;
  avgProtein: number | null;
  trainedDays: number;
  restDays: number;
}

/** Monday-start weeks. Partial weeks at the range edges report `daysInRange`. */
export function weeklyBuckets(days: readonly DaySummary[]): WeekBucket[] {
  const groups = new Map<ISODate, DaySummary[]>();
  for (const d of days) {
    const key = startOfWeek(d.date);
    const list = groups.get(key);
    if (list) list.push(d);
    else groups.set(key, [d]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, list]) => {
      const logged = list.filter((d) => d.logged);
      return {
        weekStart,
        daysInRange: list.length,
        loggedDays: logged.length,
        avgCalories: mean(logged.map((d) => d.totals.calories)),
        avgProtein: mean(logged.map((d) => d.totals.protein)),
        trainedDays: list.filter((d) => d.workout === "trained").length,
        restDays: list.filter((d) => d.workout === "rest").length,
      };
    });
}

export interface MonthConsistency {
  month: string;
  /** Days of the month inside the range (elapsed days for the current month). */
  days: number;
  trainedDays: number;
  restDays: number;
  /** trainedDays / days */
  ratio: number;
}

export function monthlyConsistency(days: readonly DaySummary[]): MonthConsistency[] {
  const groups = new Map<string, DaySummary[]>();
  for (const d of days) {
    const key = monthKey(d.date);
    const list = groups.get(key);
    if (list) list.push(d);
    else groups.set(key, [d]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, list]) => {
      const trained = list.filter((d) => d.workout === "trained").length;
      return {
        month,
        days: list.length,
        trainedDays: trained,
        restDays: list.filter((d) => d.workout === "rest").length,
        ratio: list.length > 0 ? trained / list.length : 0,
      };
    });
}
