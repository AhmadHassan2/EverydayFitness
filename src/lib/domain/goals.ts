import type { GoalRecord, Goals, ISODate } from "./types";

/** Starting point offered during onboarding. Users edit these before saving. */
export const DEFAULT_GOALS: Goals = { calories: 2200, protein: 150, carbs: 230, fat: 70 };

export function sortGoalHistory(history: readonly GoalRecord[]): GoalRecord[] {
  return [...history].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
}

/**
 * Targets in force on `date`: the latest record effective on or before it.
 * Days before the first record use the first record, so a user's earliest
 * logs are measured against their first goals rather than nothing.
 */
export function goalForDate(history: readonly GoalRecord[], date: ISODate): Goals | null {
  if (history.length === 0) return null;
  const sorted = sortGoalHistory(history);
  let match: GoalRecord = sorted[0];
  for (const rec of sorted) {
    if (rec.effectiveDate <= date) match = rec;
    else break;
  }
  return pickGoals(match);
}

export function currentGoals(history: readonly GoalRecord[], today: ISODate): Goals | null {
  return goalForDate(history, today);
}

/**
 * Applies a goal change effective `date`. Editing goals twice on one day
 * replaces that day's record; earlier records are never touched, which is what
 * keeps past-day progress honest.
 */
export function upsertGoalRecord(history: readonly GoalRecord[], goals: Goals, date: ISODate): GoalRecord[] {
  const next = history.filter((r) => r.effectiveDate !== date);
  next.push({ ...pickGoals(goals), effectiveDate: date });
  return sortGoalHistory(next);
}

function pickGoals(g: Goals): Goals {
  return { calories: g.calories, protein: g.protein, carbs: g.carbs, fat: g.fat };
}
