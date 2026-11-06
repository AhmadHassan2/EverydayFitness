import type { ISODate } from "@/lib/domain/types";
import type {
  FoodEntryInput,
  GoalsInput,
  ProfilePatch,
  SavedFoodInput,
  SavedMealInput,
  WorkoutInput,
} from "@/lib/domain/validation";
import * as actions from "@/app/actions/data";
import type { ActionResult } from "@/app/actions/data";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { RepositoryError, type Repository } from "../repository";
import {
  ENTRY_COLUMNS,
  GOAL_COLUMNS,
  MEAL_COLUMNS,
  SAVED_FOOD_COLUMNS,
  WORKOUT_COLUMNS,
  escapeLike,
  mapEntry,
  mapGoal,
  mapProfile,
  mapSavedFood,
  mapSavedMeal,
  mapWorkout,
} from "./mappers";

/*
 * Reads go straight to Supabase from the browser with the user's session (RLS
 * limits every query to their rows) so they can run in parallel. Writes go
 * through server actions, which validate input on the server.
 */

function unwrap<T>(res: ActionResult<T>): T {
  if (!res.ok) throw new RepositoryError(res.error, res.code as RepositoryError["code"]);
  return res.data;
}

async function call<T>(p: Promise<ActionResult<T>>): Promise<T> {
  try {
    return unwrap(await p);
  } catch (err) {
    if (err instanceof RepositoryError) throw err;
    throw new RepositoryError("Couldn't reach the server. Check your connection and try again.", "network");
  }
}

function read<T>(res: { data: T | null; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new RepositoryError("Couldn't load your data. Check your connection and try again.", "network");
  return res.data as NonNullable<T>;
}

export class SupabaseRepository implements Repository {
  readonly mode = "supabase" as const;
  private db = getBrowserSupabase();

  async getProfile() {
    const { data: auth } = await this.db.auth.getUser();
    if (!auth.user) throw new RepositoryError("Your session has ended. Sign in again.", "unauthorized");
    const row = read(
      await this.db.from("profiles").select("display_name, timezone, energy_unit, onboarded_at").eq("id", auth.user.id).single(),
    );
    return mapProfile(row, auth.user.email ?? null);
  }

  updateProfile(patch: ProfilePatch) {
    return call(actions.updateProfileAction(patch));
  }

  async getGoalHistory() {
    return read(await this.db.from("goal_history").select(GOAL_COLUMNS).order("effective_date")).map(mapGoal);
  }

  setGoals(goals: GoalsInput, effectiveDate: ISODate) {
    return call(actions.setGoalsAction(goals, effectiveDate));
  }

  async listEntries(from: ISODate, to: ISODate) {
    // Up to ~90 days × many entries; page through so nothing is silently cut off.
    const pageSize = 1000;
    const out = [];
    for (let offset = 0; ; offset += pageSize) {
      const rows = read(
        await this.db
          .from("food_entries")
          .select(ENTRY_COLUMNS)
          .gte("entry_date", from)
          .lte("entry_date", to)
          .order("logged_at")
          .order("id")
          .range(offset, offset + pageSize - 1),
      );
      out.push(...rows.map(mapEntry));
      if (rows.length < pageSize) break;
    }
    return out;
  }

  async listRecentEntries(limit: number) {
    return read(
      await this.db.from("food_entries").select(ENTRY_COLUMNS).order("logged_at", { ascending: false }).limit(limit),
    ).map(mapEntry);
  }

  async searchEntries(query: string, limit: number) {
    const words = query.trim().split(/\s+/).filter(Boolean).slice(0, 5);
    let q = this.db.from("food_entries").select(ENTRY_COLUMNS);
    for (const w of words) q = q.ilike("name", `%${escapeLike(w)}%`);
    return read(await q.order("logged_at", { ascending: false }).limit(limit)).map(mapEntry);
  }

  addEntries(inputs: FoodEntryInput[]) {
    return call(actions.addEntriesAction(inputs));
  }

  updateEntry(id: string, input: FoodEntryInput) {
    return call(actions.updateEntryAction(id, input));
  }

  async deleteEntry(id: string) {
    await call(actions.deleteEntryAction(id));
  }

  async listSavedFoods() {
    return read(await this.db.from("saved_foods").select(SAVED_FOOD_COLUMNS).order("name")).map(mapSavedFood);
  }

  saveFood(input: SavedFoodInput) {
    return call(actions.saveFoodAction(input));
  }

  updateSavedFood(id: string, input: SavedFoodInput) {
    return call(actions.updateSavedFoodAction(id, input));
  }

  async deleteSavedFood(id: string) {
    await call(actions.deleteSavedFoodAction(id));
  }

  async listSavedMeals() {
    return read(await this.db.from("saved_meals").select(MEAL_COLUMNS).order("name")).map(mapSavedMeal);
  }

  createSavedMeal(input: SavedMealInput) {
    return call(actions.createSavedMealAction(input));
  }

  updateSavedMeal(id: string, input: SavedMealInput) {
    return call(actions.updateSavedMealAction(id, input));
  }

  async deleteSavedMeal(id: string) {
    await call(actions.deleteSavedMealAction(id));
  }

  async listWorkouts(from: ISODate, to: ISODate) {
    return read(
      await this.db.from("workout_logs").select(WORKOUT_COLUMNS).gte("log_date", from).lte("log_date", to).order("log_date"),
    ).map(mapWorkout);
  }

  setWorkout(date: ISODate, input: WorkoutInput | null) {
    return call(actions.setWorkoutAction(date, input));
  }
}
