import type { FoodEntry, GoalRecord, Profile, SavedFood, SavedMeal, WorkoutLog } from "@/lib/domain/types";
import { deviceTimeZone, todayIn } from "@/lib/domain/dates";
import { buildDemoState } from "./seed";

/*
 * Demo data lives only in this browser, under its own key. It is never sent
 * to Supabase and never mixed with a signed-in user's records.
 */

export const DEMO_STORAGE_KEY = "ef:demo:v2";

export interface DemoState {
  version: 1;
  profile: Profile;
  goals: GoalRecord[];
  entries: FoodEntry[];
  savedFoods: SavedFood[];
  savedMeals: SavedMeal[];
  workouts: WorkoutLog[];
}

let memory: DemoState | null = null;

function freshState(): DemoState {
  const tz = deviceTimeZone();
  return buildDemoState(todayIn(tz), tz, new Date().toISOString());
}

function readStorage(): DemoState | null {
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoState;
    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function writeStorage(state: DemoState): void {
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked (private mode): keep working from memory.
  }
}

export function loadDemoState(): DemoState {
  if (memory) return memory;
  memory = readStorage();
  if (!memory) {
    memory = freshState();
    writeStorage(memory);
  }
  return memory;
}

/** Applies a change and persists it. */
export function updateDemoState<T>(fn: (draft: DemoState) => T): T {
  const state = loadDemoState();
  const result = fn(state);
  writeStorage(state);
  return result;
}

export function resetDemoState(): void {
  memory = freshState();
  writeStorage(memory);
}
