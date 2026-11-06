import type {
  FoodEntryRow,
  GoalHistoryRow,
  ProfileRow,
  SavedFoodRow,
  SavedMealItemRow,
  SavedMealRow,
  WorkoutLogRow,
} from "@/lib/supabase/database.types";
import type { FoodEntry, GoalRecord, Profile, SavedFood, SavedMeal, WorkoutLog } from "@/lib/domain/types";
import type { FoodEntryInput, SavedFoodInput } from "@/lib/domain/validation";

// PostgREST returns numeric columns as JSON numbers, but be defensive.
const num = (v: number | string | null | undefined) => (v === null || v === undefined ? 0 : Number(v));

export const ENTRY_COLUMNS =
  "id, entry_date, logged_at, meal, name, serving, calories, protein_g, carbs_g, fat_g, saved_food_id, source, external_ref, created_at";
export const SAVED_FOOD_COLUMNS = "id, name, serving, calories, protein_g, carbs_g, fat_g, use_count, last_used_at, created_at";
export const WORKOUT_COLUMNS = "id, log_date, status, workout_type, duration_min, notes, updated_at";
export const GOAL_COLUMNS = "effective_date, calories, protein_g, carbs_g, fat_g";
export const MEAL_COLUMNS =
  "id, name, created_at, saved_meal_items (id, position, name, serving, calories, protein_g, carbs_g, fat_g)";

type Pick2<T, K extends keyof T> = Pick<T, K>;

export function mapEntry(
  r: Pick2<
    FoodEntryRow,
    | "id"
    | "entry_date"
    | "logged_at"
    | "meal"
    | "name"
    | "serving"
    | "calories"
    | "protein_g"
    | "carbs_g"
    | "fat_g"
    | "saved_food_id"
    | "source"
    | "external_ref"
    | "created_at"
  >,
): FoodEntry {
  return {
    id: r.id,
    date: r.entry_date,
    loggedAt: new Date(r.logged_at).toISOString(),
    meal: r.meal,
    name: r.name,
    serving: r.serving,
    calories: num(r.calories),
    protein: num(r.protein_g),
    carbs: num(r.carbs_g),
    fat: num(r.fat_g),
    savedFoodId: r.saved_food_id,
    source: r.source,
    externalRef: r.external_ref,
    createdAt: r.created_at,
  };
}

export function entryToRow(input: FoodEntryInput) {
  return {
    entry_date: input.date,
    logged_at: input.loggedAt,
    meal: input.meal,
    name: input.name,
    serving: input.serving,
    calories: input.calories,
    protein_g: input.protein,
    carbs_g: input.carbs,
    fat_g: input.fat,
    saved_food_id: input.savedFoodId,
    source: input.source,
  };
}

export function mapSavedFood(
  r: Pick2<SavedFoodRow, "id" | "name" | "serving" | "calories" | "protein_g" | "carbs_g" | "fat_g" | "use_count" | "last_used_at" | "created_at">,
): SavedFood {
  return {
    id: r.id,
    name: r.name,
    serving: r.serving,
    calories: num(r.calories),
    protein: num(r.protein_g),
    carbs: num(r.carbs_g),
    fat: num(r.fat_g),
    useCount: r.use_count,
    lastUsedAt: r.last_used_at,
    createdAt: r.created_at,
  };
}

export function savedFoodToRow(input: SavedFoodInput) {
  return {
    name: input.name,
    serving: input.serving,
    calories: input.calories,
    protein_g: input.protein,
    carbs_g: input.carbs,
    fat_g: input.fat,
  };
}

export function mapSavedMeal(
  r: Pick2<SavedMealRow, "id" | "name" | "created_at"> & {
    saved_meal_items: Pick2<SavedMealItemRow, "id" | "position" | "name" | "serving" | "calories" | "protein_g" | "carbs_g" | "fat_g">[];
  },
): SavedMeal {
  return {
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
    items: [...(r.saved_meal_items ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        id: i.id,
        position: i.position,
        name: i.name,
        serving: i.serving,
        calories: num(i.calories),
        protein: num(i.protein_g),
        carbs: num(i.carbs_g),
        fat: num(i.fat_g),
      })),
  };
}

export function mapWorkout(
  r: Pick2<WorkoutLogRow, "id" | "log_date" | "status" | "workout_type" | "duration_min" | "notes" | "updated_at">,
): WorkoutLog {
  return {
    id: r.id,
    date: r.log_date,
    status: r.status,
    workoutType: r.workout_type,
    durationMin: r.duration_min,
    notes: r.notes,
    updatedAt: r.updated_at,
  };
}

export function mapGoal(r: Pick2<GoalHistoryRow, "effective_date" | "calories" | "protein_g" | "carbs_g" | "fat_g">): GoalRecord {
  return {
    effectiveDate: r.effective_date,
    calories: num(r.calories),
    protein: num(r.protein_g),
    carbs: num(r.carbs_g),
    fat: num(r.fat_g),
  };
}

export function mapProfile(
  r: Pick2<ProfileRow, "display_name" | "timezone" | "energy_unit" | "onboarded_at">,
  email: string | null,
): Profile {
  return {
    displayName: r.display_name,
    email,
    timezone: r.timezone,
    energyUnit: r.energy_unit,
    onboarded: r.onboarded_at !== null,
  };
}

/** Escapes LIKE wildcards so user text matches literally. */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}
