import type {
  FoodEntry,
  GoalRecord,
  ISODate,
  Profile,
  SavedFood,
  SavedMeal,
  WorkoutLog,
} from "@/lib/domain/types";
import type {
  FoodEntryInput,
  GoalsInput,
  ProfilePatch,
  SavedFoodInput,
  SavedMealInput,
  WorkoutInput,
} from "@/lib/domain/validation";

/** Everything the UI can read or change. UI code depends only on this interface. */
export interface Repository {
  getProfile(): Promise<Profile>;
  updateProfile(patch: ProfilePatch): Promise<Profile>;

  getGoalHistory(): Promise<GoalRecord[]>;
  /** Records goals effective from `effectiveDate`; earlier records stay as-is. */
  setGoals(goals: GoalsInput, effectiveDate: ISODate): Promise<GoalRecord[]>;

  /** Entries with `from <= date <= to`. */
  listEntries(from: ISODate, to: ISODate): Promise<FoodEntry[]>;
  /** Most recently eaten entries, newest first. */
  listRecentEntries(limit: number): Promise<FoodEntry[]>;
  searchEntries(query: string, limit: number): Promise<FoodEntry[]>;
  addEntries(inputs: FoodEntryInput[]): Promise<FoodEntry[]>;
  updateEntry(id: string, input: FoodEntryInput): Promise<FoodEntry>;
  deleteEntry(id: string): Promise<void>;

  listSavedFoods(): Promise<SavedFood[]>;
  /** Creates a favourite, or updates the existing one with the same name. */
  saveFood(input: SavedFoodInput): Promise<SavedFood>;
  updateSavedFood(id: string, input: SavedFoodInput): Promise<SavedFood>;
  deleteSavedFood(id: string): Promise<void>;

  listSavedMeals(): Promise<SavedMeal[]>;
  createSavedMeal(input: SavedMealInput): Promise<SavedMeal>;
  updateSavedMeal(id: string, input: SavedMealInput): Promise<SavedMeal>;
  deleteSavedMeal(id: string): Promise<void>;

  listWorkouts(from: ISODate, to: ISODate): Promise<WorkoutLog[]>;
  /** `null` clears the day back to "not logged". */
  setWorkout(date: ISODate, input: WorkoutInput | null): Promise<WorkoutLog | null>;
}

export class RepositoryError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "unauthorized" | "invalid" | "conflict" | "network" | "unknown" = "unknown",
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}
