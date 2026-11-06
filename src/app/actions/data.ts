"use server";

import { z } from "zod";
import type { FoodEntry, GoalRecord, ISODate, Profile, SavedFood, SavedMeal, WorkoutLog } from "@/lib/domain/types";
import { normalizeName } from "@/lib/domain/foods";
import {
  foodEntryInputSchema,
  goalsInputSchema,
  idSchema,
  isoDateSchema,
  profilePatchSchema,
  savedFoodInputSchema,
  savedMealInputSchema,
  workoutInputSchema,
} from "@/lib/domain/validation";
import {
  ENTRY_COLUMNS,
  GOAL_COLUMNS,
  MEAL_COLUMNS,
  SAVED_FOOD_COLUMNS,
  WORKOUT_COLUMNS,
  entryToRow,
  escapeLike,
  mapEntry,
  mapGoal,
  mapProfile,
  mapSavedFood,
  mapSavedMeal,
  mapWorkout,
  savedFoodToRow,
} from "@/lib/data/supabase/mappers";
import { getServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/*
 * Every write goes through here: the input is re-validated with the shared Zod
 * schemas, the user is re-read from the session cookie, and the query runs as
 * that user so RLS applies. No service-role key is involved.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; code: string };

type Supabase = Awaited<ReturnType<typeof getServerSupabase>>;

class ActionError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

async function run<T>(fn: (ctx: { supabase: Supabase; userId: string; email: string | null }) => Promise<T>): Promise<ActionResult<T>> {
  try {
    if (!isSupabaseConfigured) throw new ActionError("Supabase is not configured.", "unconfigured");
    const supabase = await getServerSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new ActionError("Your session has ended. Sign in again.", "unauthorized");
    return { ok: true, data: await fn({ supabase, userId: data.user.id, email: data.user.email ?? null }) };
  } catch (err) {
    if (err instanceof ActionError) return { ok: false, error: err.message, code: err.code };
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues[0]?.message ?? "Some values are invalid.", code: "invalid" };
    }
    console.error("[action]", err);
    return { ok: false, error: "Something went wrong on our side. Try again.", code: "unknown" };
  }
}

function check<T>(res: { data: T; error: { code?: string; message: string } | null }): NonNullable<T> {
  if (res.error) {
    if (res.error.code === "23505") throw new ActionError("That already exists.", "conflict");
    if (res.error.code === "23514" || res.error.code === "22P02") throw new ActionError("Some values are out of range.", "invalid");
    if (res.error.code === "PGRST116") throw new ActionError("That item no longer exists.", "not_found");
    throw new Error(res.error.message);
  }
  return res.data as NonNullable<T>;
}

// ---------------------------------------------------------------------------
// Profile & goals
// ---------------------------------------------------------------------------

export async function updateProfileAction(patch: unknown): Promise<ActionResult<Profile>> {
  return run(async ({ supabase, userId, email }) => {
    const p = profilePatchSchema.parse(patch);
    const row = check(
      await supabase
        .from("profiles")
        .update({
          ...(p.displayName !== undefined ? { display_name: p.displayName } : {}),
          ...(p.timezone ? { timezone: p.timezone } : {}),
          ...(p.energyUnit ? { energy_unit: p.energyUnit } : {}),
          ...(p.onboarded ? { onboarded_at: new Date().toISOString() } : {}),
        })
        .eq("id", userId)
        .select("display_name, timezone, energy_unit, onboarded_at")
        .single(),
    );
    return mapProfile(row, email);
  });
}

export async function setGoalsAction(goals: unknown, effectiveDate: unknown): Promise<ActionResult<GoalRecord[]>> {
  return run(async ({ supabase, userId }) => {
    const g = goalsInputSchema.parse(goals);
    const date = isoDateSchema.parse(effectiveDate);
    check(
      await supabase.from("goal_history").upsert(
        { user_id: userId, effective_date: date, calories: g.calories, protein_g: g.protein, carbs_g: g.carbs, fat_g: g.fat },
        { onConflict: "user_id,effective_date" },
      ),
    );
    const rows = check(await supabase.from("goal_history").select(GOAL_COLUMNS).order("effective_date"));
    return rows.map(mapGoal);
  });
}

// ---------------------------------------------------------------------------
// Food entries
// ---------------------------------------------------------------------------

async function bumpSavedFoods(supabase: Supabase, ids: string[]) {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  if (counts.size === 0) return;
  const rows = check(await supabase.from("saved_foods").select("id, use_count").in("id", [...counts.keys()]));
  const now = new Date().toISOString();
  await Promise.all(
    rows.map((r) =>
      supabase
        .from("saved_foods")
        .update({ use_count: r.use_count + (counts.get(r.id) ?? 0), last_used_at: now })
        .eq("id", r.id),
    ),
  );
}

export async function addEntriesAction(inputs: unknown): Promise<ActionResult<FoodEntry[]>> {
  return run(async ({ supabase, userId }) => {
    const list = z.array(foodEntryInputSchema).min(1).max(50).parse(inputs);
    const rows = check(
      await supabase
        .from("food_entries")
        .insert(list.map((i) => ({ ...entryToRow(i), user_id: userId })))
        .select(ENTRY_COLUMNS),
    );
    await bumpSavedFoods(
      supabase,
      list.flatMap((i) => (i.savedFoodId ? [i.savedFoodId] : [])),
    );
    return rows.map(mapEntry);
  });
}

export async function updateEntryAction(id: unknown, input: unknown): Promise<ActionResult<FoodEntry>> {
  return run(async ({ supabase }) => {
    const entryId = idSchema.parse(id);
    const i = foodEntryInputSchema.parse(input);
    const row = check(await supabase.from("food_entries").update(entryToRow(i)).eq("id", entryId).select(ENTRY_COLUMNS).single());
    return mapEntry(row);
  });
}

export async function deleteEntryAction(id: unknown): Promise<ActionResult<null>> {
  return run(async ({ supabase }) => {
    check(await supabase.from("food_entries").delete().eq("id", idSchema.parse(id)));
    return null;
  });
}

// ---------------------------------------------------------------------------
// Saved foods
// ---------------------------------------------------------------------------

export async function saveFoodAction(input: unknown): Promise<ActionResult<SavedFood>> {
  return run(async ({ supabase, userId }) => {
    const f = savedFoodInputSchema.parse(input);
    const existing = check(
      await supabase.from("saved_foods").select("id, name").ilike("name", escapeLike(f.name)).limit(5),
    ).find((r) => normalizeName(r.name) === normalizeName(f.name));
    const row = existing
      ? check(await supabase.from("saved_foods").update(savedFoodToRow(f)).eq("id", existing.id).select(SAVED_FOOD_COLUMNS).single())
      : check(await supabase.from("saved_foods").insert({ ...savedFoodToRow(f), user_id: userId }).select(SAVED_FOOD_COLUMNS).single());
    return mapSavedFood(row);
  });
}

export async function updateSavedFoodAction(id: unknown, input: unknown): Promise<ActionResult<SavedFood>> {
  return run(async ({ supabase }) => {
    const f = savedFoodInputSchema.parse(input);
    const row = check(
      await supabase.from("saved_foods").update(savedFoodToRow(f)).eq("id", idSchema.parse(id)).select(SAVED_FOOD_COLUMNS).single(),
    );
    return mapSavedFood(row);
  });
}

export async function deleteSavedFoodAction(id: unknown): Promise<ActionResult<null>> {
  return run(async ({ supabase }) => {
    check(await supabase.from("saved_foods").delete().eq("id", idSchema.parse(id)));
    return null;
  });
}

// ---------------------------------------------------------------------------
// Saved meals
// ---------------------------------------------------------------------------

async function readMeal(supabase: Supabase, id: string): Promise<SavedMeal> {
  return mapSavedMeal(check(await supabase.from("saved_meals").select(MEAL_COLUMNS).eq("id", id).single()));
}

export async function createSavedMealAction(input: unknown): Promise<ActionResult<SavedMeal>> {
  return run(async ({ supabase, userId }) => {
    const m = savedMealInputSchema.parse(input);
    const meal = check(await supabase.from("saved_meals").insert({ name: m.name, user_id: userId }).select("id").single());
    const items = await supabase.rpc("replace_saved_meal_items", { p_meal_id: meal.id, p_items: m.items });
    if (items.error) {
      await supabase.from("saved_meals").delete().eq("id", meal.id);
      check(items);
    }
    return readMeal(supabase, meal.id);
  });
}

export async function updateSavedMealAction(id: unknown, input: unknown): Promise<ActionResult<SavedMeal>> {
  return run(async ({ supabase }) => {
    const mealId = idSchema.parse(id);
    const m = savedMealInputSchema.parse(input);
    check(await supabase.from("saved_meals").update({ name: m.name }).eq("id", mealId).select("id").single());
    check(await supabase.rpc("replace_saved_meal_items", { p_meal_id: mealId, p_items: m.items }));
    return readMeal(supabase, mealId);
  });
}

export async function deleteSavedMealAction(id: unknown): Promise<ActionResult<null>> {
  return run(async ({ supabase }) => {
    check(await supabase.from("saved_meals").delete().eq("id", idSchema.parse(id)));
    return null;
  });
}

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------

export async function setWorkoutAction(date: unknown, input: unknown): Promise<ActionResult<WorkoutLog | null>> {
  return run(async ({ supabase, userId }) => {
    const day: ISODate = isoDateSchema.parse(date);
    if (input === null) {
      check(await supabase.from("workout_logs").delete().eq("log_date", day));
      return null;
    }
    const w = workoutInputSchema.parse(input);
    const row = check(
      await supabase
        .from("workout_logs")
        .upsert(
          {
            user_id: userId,
            log_date: day,
            status: w.status,
            workout_type: w.workoutType,
            duration_min: w.durationMin,
            notes: w.notes,
          },
          { onConflict: "user_id,log_date" },
        )
        .select(WORKOUT_COLUMNS)
        .single(),
    );
    return mapWorkout(row);
  });
}
