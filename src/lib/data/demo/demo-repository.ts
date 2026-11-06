import type { FoodEntry, ISODate, SavedFood, SavedMeal, WorkoutLog } from "@/lib/domain/types";
import { matchesQuery, normalizeName, rankByQuery } from "@/lib/domain/foods";
import { upsertGoalRecord } from "@/lib/domain/goals";
import {
  foodEntryInputSchema,
  goalsInputSchema,
  profilePatchSchema,
  savedFoodInputSchema,
  savedMealInputSchema,
  workoutInputSchema,
  type FoodEntryInput,
  type GoalsInput,
  type ProfilePatch,
  type SavedFoodInput,
  type SavedMealInput,
  type WorkoutInput,
} from "@/lib/domain/validation";
import { RepositoryError, type Repository } from "../repository";
import { loadDemoState, resetDemoState, updateDemoState } from "./store";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const clone = <T,>(v: T): T => structuredClone(v);

function toEntry(input: FoodEntryInput, id: string, createdAt: string): FoodEntry {
  return {
    id,
    date: input.date,
    loggedAt: new Date(input.loggedAt).toISOString(),
    meal: input.meal,
    name: input.name,
    serving: input.serving,
    calories: input.calories,
    protein: input.protein,
    carbs: input.carbs,
    fat: input.fat,
    savedFoodId: input.savedFoodId,
    source: input.source,
    externalRef: null,
    createdAt,
  };
}

/** Local, browser-only implementation used in demo mode. */
export class DemoRepository implements Repository {
  readonly mode = "demo" as const;

  async getProfile() {
    return clone(loadDemoState().profile);
  }

  async updateProfile(patch: ProfilePatch) {
    const p = profilePatchSchema.parse(patch);
    return updateDemoState((s) => {
      if (p.displayName !== undefined) s.profile.displayName = p.displayName;
      if (p.timezone) s.profile.timezone = p.timezone;
      if (p.energyUnit) s.profile.energyUnit = p.energyUnit;
      if (p.onboarded) s.profile.onboarded = true;
      return clone(s.profile);
    });
  }

  async getGoalHistory() {
    return clone(loadDemoState().goals);
  }

  async setGoals(goals: GoalsInput, effectiveDate: ISODate) {
    const g = goalsInputSchema.parse(goals);
    return updateDemoState((s) => {
      s.goals = upsertGoalRecord(s.goals, g, effectiveDate);
      return clone(s.goals);
    });
  }

  async listEntries(from: ISODate, to: ISODate) {
    return clone(loadDemoState().entries.filter((e) => e.date >= from && e.date <= to));
  }

  async listRecentEntries(limit: number) {
    const sorted = [...loadDemoState().entries].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
    return clone(sorted.slice(0, limit));
  }

  async searchEntries(query: string, limit: number) {
    const matches = loadDemoState()
      .entries.filter((e) => matchesQuery(e.name, query))
      .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
    return clone(rankByQuery(matches, query).slice(0, limit));
  }

  async addEntries(inputs: FoodEntryInput[]) {
    const parsed = inputs.map((i) => foodEntryInputSchema.parse(i));
    const now = new Date().toISOString();
    return updateDemoState((s) => {
      const created = parsed.map((p) => toEntry(p, uid(), now));
      s.entries.push(...created);
      for (const e of created) {
        const food = e.savedFoodId ? s.savedFoods.find((f) => f.id === e.savedFoodId) : undefined;
        if (food) {
          food.useCount += 1;
          food.lastUsedAt = now;
        }
      }
      return clone(created);
    });
  }

  async updateEntry(id: string, input: FoodEntryInput) {
    const p = foodEntryInputSchema.parse(input);
    return updateDemoState((s) => {
      const idx = s.entries.findIndex((e) => e.id === id);
      if (idx < 0) throw new RepositoryError("That entry no longer exists.", "not_found");
      const prev = s.entries[idx];
      s.entries[idx] = { ...toEntry(p, id, prev.createdAt), externalRef: prev.externalRef };
      return clone(s.entries[idx]);
    });
  }

  async deleteEntry(id: string) {
    updateDemoState((s) => {
      s.entries = s.entries.filter((e) => e.id !== id);
    });
  }

  async listSavedFoods() {
    return clone([...loadDemoState().savedFoods].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async saveFood(input: SavedFoodInput) {
    const p = savedFoodInputSchema.parse(input);
    return updateDemoState((s) => {
      const existing = s.savedFoods.find((f) => normalizeName(f.name) === normalizeName(p.name));
      if (existing) {
        Object.assign(existing, p);
        return clone(existing);
      }
      const food: SavedFood = { id: uid(), ...p, useCount: 0, lastUsedAt: null, createdAt: new Date().toISOString() };
      s.savedFoods.push(food);
      return clone(food);
    });
  }

  async updateSavedFood(id: string, input: SavedFoodInput) {
    const p = savedFoodInputSchema.parse(input);
    return updateDemoState((s) => {
      const food = s.savedFoods.find((f) => f.id === id);
      if (!food) throw new RepositoryError("That food no longer exists.", "not_found");
      const clash = s.savedFoods.find((f) => f.id !== id && normalizeName(f.name) === normalizeName(p.name));
      if (clash) throw new RepositoryError("You already have a saved food with that name.", "conflict");
      Object.assign(food, p);
      return clone(food);
    });
  }

  async deleteSavedFood(id: string) {
    updateDemoState((s) => {
      s.savedFoods = s.savedFoods.filter((f) => f.id !== id);
      for (const e of s.entries) if (e.savedFoodId === id) e.savedFoodId = null;
    });
  }

  async listSavedMeals() {
    return clone([...loadDemoState().savedMeals].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async createSavedMeal(input: SavedMealInput) {
    const p = savedMealInputSchema.parse(input);
    return updateDemoState((s) => {
      const meal: SavedMeal = {
        id: uid(),
        name: p.name,
        createdAt: new Date().toISOString(),
        items: p.items.map((it, position) => ({ id: uid(), position, ...it })),
      };
      s.savedMeals.push(meal);
      return clone(meal);
    });
  }

  async updateSavedMeal(id: string, input: SavedMealInput) {
    const p = savedMealInputSchema.parse(input);
    return updateDemoState((s) => {
      const meal = s.savedMeals.find((m) => m.id === id);
      if (!meal) throw new RepositoryError("That meal no longer exists.", "not_found");
      meal.name = p.name;
      meal.items = p.items.map((it, position) => ({ id: uid(), position, ...it }));
      return clone(meal);
    });
  }

  async deleteSavedMeal(id: string) {
    updateDemoState((s) => {
      s.savedMeals = s.savedMeals.filter((m) => m.id !== id);
    });
  }

  async listWorkouts(from: ISODate, to: ISODate) {
    return clone(loadDemoState().workouts.filter((w) => w.date >= from && w.date <= to));
  }

  async setWorkout(date: ISODate, input: WorkoutInput | null) {
    const p = input ? workoutInputSchema.parse(input) : null;
    return updateDemoState((s) => {
      // One record per day: replace whatever was there.
      s.workouts = s.workouts.filter((w) => w.date !== date);
      if (!p) return null;
      const log: WorkoutLog = { id: uid(), date, ...p, updatedAt: new Date().toISOString() };
      s.workouts.push(log);
      return clone(log);
    });
  }

  reset() {
    resetDemoState();
  }
}
