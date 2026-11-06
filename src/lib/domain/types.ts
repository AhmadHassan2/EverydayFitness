/** A local calendar date in the user's timezone, formatted `YYYY-MM-DD`. */
export type ISODate = string;

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export interface Nutrition {
  /** kcal */
  calories: number;
  /** grams */
  protein: number;
  /** grams */
  carbs: number;
  /** grams */
  fat: number;
}

export type MacroKey = "protein" | "carbs" | "fat";
export const MACRO_KEYS: readonly MacroKey[] = ["protein", "carbs", "fat"];
export const MACRO_LABELS: Record<MacroKey, string> = {
  protein: "Protein",
  carbs: "Carbs",
  fat: "Fat",
};

/**
 * Where a food entry's numbers came from. `manual` today; a nutrition database
 * or barcode scanner adds its own source and fills `externalRef`.
 */
export type FoodSource = "manual" | "saved_food" | "saved_meal" | "copied" | "database" | "barcode";

export interface FoodEntry extends Nutrition {
  id: string;
  /** Local calendar day the entry counts toward. */
  date: ISODate;
  /** Absolute instant the food was eaten (UTC ISO string). */
  loggedAt: string;
  meal: MealType;
  name: string;
  serving: string | null;
  savedFoodId: string | null;
  source: FoodSource;
  externalRef: string | null;
  createdAt: string;
}

export interface SavedFood extends Nutrition {
  id: string;
  name: string;
  serving: string | null;
  useCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface SavedMealItem extends Nutrition {
  id: string;
  name: string;
  serving: string | null;
  position: number;
}

export interface SavedMeal {
  id: string;
  name: string;
  items: SavedMealItem[];
  createdAt: string;
}

/** A food the user can log again in one tap (from history or favourites). */
export interface FoodSuggestion extends Nutrition {
  key: string;
  name: string;
  serving: string | null;
  savedFoodId: string | null;
  lastUsedAt: string | null;
  /** Meal it was most recently logged under, used as a default. */
  lastMeal: MealType | null;
}

/**
 * Pluggable food lookup. Personal history implements it today; a nutrition
 * database or barcode lookup can implement the same interface later and be
 * merged into quick-pick results.
 */
export interface FoodSearchProvider {
  id: string;
  search(query: string, limit: number): Promise<FoodSuggestion[]>;
}

export const WORKOUT_STATUSES = ["trained", "rest"] as const;
export type WorkoutStatus = (typeof WORKOUT_STATUSES)[number];
/** `none` = the day has not been marked (no record). */
export type DayStatus = WorkoutStatus | "none";

export const WORKOUT_TYPES = [
  "push",
  "pull",
  "legs",
  "upper",
  "lower",
  "cardio",
  "full_body",
  "other",
] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  upper: "Upper",
  lower: "Lower",
  cardio: "Cardio",
  full_body: "Full body",
  other: "Other",
};

export interface WorkoutLog {
  id: string;
  date: ISODate;
  status: WorkoutStatus;
  workoutType: WorkoutType | null;
  durationMin: number | null;
  notes: string | null;
  updatedAt: string;
}

export interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** A goal set that applies from `effectiveDate` until the next record. */
export interface GoalRecord extends Goals {
  effectiveDate: ISODate;
}

export type EnergyUnit = "kcal" | "kj";

export interface Profile {
  displayName: string | null;
  email: string | null;
  timezone: string;
  energyUnit: EnergyUnit;
  onboarded: boolean;
}
