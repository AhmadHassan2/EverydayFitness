"use client";

import { DEFAULT_GOALS } from "@/lib/domain/goals";
import { deviceTimeZone, todayIn } from "@/lib/domain/dates";
import { normalizeName } from "@/lib/domain/foods";
import type { FoodEntry, GoalRecord, ISODate, Profile, SavedFood, SavedMeal, WorkoutLog } from "@/lib/domain/types";
import type { FoodEntryInput, GoalsInput, ProfilePatch, SavedFoodInput, SavedMealInput, WorkoutInput } from "@/lib/domain/validation";
import type { Repository } from "./repository";

const STORAGE_KEY = "everyday-fitness:v1";

interface LocalState {
  profile: Profile;
  goals: GoalRecord[];
  entries: FoodEntry[];
  savedFoods: SavedFood[];
  savedMeals: SavedMeal[];
  workouts: WorkoutLog[];
}

const clone = <T,>(value: T): T => structuredClone(value);
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const now = () => new Date().toISOString();

function initialState(): LocalState {
  const timezone = deviceTimeZone();
  return {
    profile: { displayName: null, email: null, timezone, energyUnit: "kcal", onboarded: true },
    goals: [{ ...DEFAULT_GOALS, effectiveDate: todayIn(timezone) }],
    entries: [],
    savedFoods: [],
    savedMeals: [],
    workouts: [],
  };
}

function read(): LocalState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as LocalState;
  } catch {
    // A fresh state is safer than preventing the tracker from opening.
  }
  const state = initialState();
  write(state);
  return state;
}

function write(state: LocalState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function update<T>(fn: (state: LocalState) => T): T {
  const state = read();
  const result = fn(state);
  write(state);
  return clone(result);
}

export class LocalRepository implements Repository {
  async getProfile() { return clone(read().profile); }
  async updateProfile(patch: ProfilePatch) { return update((s) => Object.assign(s.profile, patch)); }

  async getGoalHistory() { return clone(read().goals); }
  async setGoals(goals: GoalsInput, effectiveDate: ISODate) {
    return update((s) => {
      s.goals = [...s.goals.filter((g) => g.effectiveDate !== effectiveDate), { ...goals, effectiveDate }].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
      return s.goals;
    });
  }

  async listEntries(from: ISODate, to: ISODate) { return clone(read().entries.filter((e) => e.date >= from && e.date <= to)); }
  async listRecentEntries(limit: number) { return clone([...read().entries].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)).slice(0, limit)); }
  async searchEntries(query: string, limit: number) {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return clone(read().entries.filter((e) => terms.every((term) => e.name.toLowerCase().includes(term))).sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)).slice(0, limit));
  }
  async addEntries(inputs: FoodEntryInput[]) {
    return update((s) => inputs.map((input) => {
      const entry: FoodEntry = { ...input, id: id("entry"), loggedAt: new Date(input.loggedAt).toISOString(), externalRef: null, createdAt: now() };
      s.entries.push(entry);
      if (input.savedFoodId) {
        const saved = s.savedFoods.find((food) => food.id === input.savedFoodId);
        if (saved) { saved.useCount += 1; saved.lastUsedAt = entry.loggedAt; }
      }
      return entry;
    }));
  }
  async updateEntry(entryId: string, input: FoodEntryInput) {
    return update((s) => {
      const entry = s.entries.find((item) => item.id === entryId);
      if (!entry) throw new Error("That food entry no longer exists.");
      Object.assign(entry, input, { loggedAt: new Date(input.loggedAt).toISOString(), externalRef: null });
      return entry;
    });
  }
  async deleteEntry(entryId: string) { update((s) => { s.entries = s.entries.filter((entry) => entry.id !== entryId); }); }

  async listSavedFoods() { return clone([...read().savedFoods].sort((a, b) => a.name.localeCompare(b.name))); }
  async saveFood(input: SavedFoodInput) {
    return update((s) => {
      const existing = s.savedFoods.find((food) => normalizeName(food.name) === normalizeName(input.name));
      if (existing) { Object.assign(existing, input); return existing; }
      const food: SavedFood = { ...input, id: id("food"), useCount: 0, lastUsedAt: null, createdAt: now() };
      s.savedFoods.push(food); return food;
    });
  }
  async updateSavedFood(foodId: string, input: SavedFoodInput) {
    return update((s) => { const food = s.savedFoods.find((item) => item.id === foodId); if (!food) throw new Error("That favourite no longer exists."); Object.assign(food, input); return food; });
  }
  async deleteSavedFood(foodId: string) { update((s) => { s.savedFoods = s.savedFoods.filter((food) => food.id !== foodId); s.entries.forEach((entry) => { if (entry.savedFoodId === foodId) entry.savedFoodId = null; }); }); }

  async listSavedMeals() { return clone([...read().savedMeals].sort((a, b) => a.name.localeCompare(b.name))); }
  async createSavedMeal(input: SavedMealInput) {
    return update((s) => { const meal: SavedMeal = { id: id("meal"), name: input.name, createdAt: now(), items: input.items.map((item, position) => ({ ...item, id: id("meal-item"), position })) }; s.savedMeals.push(meal); return meal; });
  }
  async updateSavedMeal(mealId: string, input: SavedMealInput) {
    return update((s) => { const meal = s.savedMeals.find((item) => item.id === mealId); if (!meal) throw new Error("That saved meal no longer exists."); meal.name = input.name; meal.items = input.items.map((item, position) => ({ ...item, id: id("meal-item"), position })); return meal; });
  }
  async deleteSavedMeal(mealId: string) { update((s) => { s.savedMeals = s.savedMeals.filter((meal) => meal.id !== mealId); }); }

  async listWorkouts(from: ISODate, to: ISODate) { return clone(read().workouts.filter((workout) => workout.date >= from && workout.date <= to)); }
  async setWorkout(date: ISODate, input: WorkoutInput | null) {
    return update((s) => {
      s.workouts = s.workouts.filter((workout) => workout.date !== date);
      if (!input) return null;
      const workout: WorkoutLog = { id: id("workout"), date, status: input.status, workoutType: input.workoutType, durationMin: input.durationMin, notes: input.notes, updatedAt: now() };
      s.workouts.push(workout); return workout;
    });
  }
}
