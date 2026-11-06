/*
 * Database types for supabase-js, matching supabase/migrations.
 * Regenerate with: supabase gen types typescript --local > src/lib/supabase/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type WorkoutStatus = "trained" | "rest";
type WorkoutType = "push" | "pull" | "legs" | "upper" | "lower" | "cardio" | "full_body" | "other";
type EnergyUnit = "kcal" | "kj";
type FoodSource = "manual" | "saved_food" | "saved_meal" | "copied" | "database" | "barcode";

type NutritionRow = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type ProfileRow = {
  id: string;
  display_name: string | null;
  timezone: string;
  energy_unit: EnergyUnit;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

export type GoalHistoryRow = NutritionRow & {
  id: string;
  user_id: string;
  effective_date: string;
  created_at: string;
  updated_at: string;
}

export type SavedFoodRow = NutritionRow & {
  id: string;
  user_id: string;
  name: string;
  serving: string | null;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SavedMealRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export type SavedMealItemRow = NutritionRow & {
  id: string;
  meal_id: string;
  user_id: string;
  position: number;
  name: string;
  serving: string | null;
}

export type FoodEntryRow = NutritionRow & {
  id: string;
  user_id: string;
  entry_date: string;
  logged_at: string;
  meal: MealType;
  name: string;
  serving: string | null;
  saved_food_id: string | null;
  source: FoodSource;
  external_ref: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkoutLogRow = {
  id: string;
  user_id: string;
  log_date: string;
  status: WorkoutStatus;
  workout_type: WorkoutType | null;
  duration_min: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type Table<Row, Insert, Relationships extends unknown[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: Relationships;
};

type Generated = "id" | "user_id" | "created_at" | "updated_at";

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      profiles: Table<ProfileRow, Optional<ProfileRow, "display_name" | "timezone" | "energy_unit" | "onboarded_at" | "created_at" | "updated_at">>;
      goal_history: Table<GoalHistoryRow, Optional<GoalHistoryRow, Generated>>;
      saved_foods: Table<SavedFoodRow, Optional<SavedFoodRow, Generated | "serving" | "use_count" | "last_used_at">>;
      saved_meals: Table<SavedMealRow, Optional<SavedMealRow, Generated>>;
      saved_meal_items: Table<
        SavedMealItemRow,
        Optional<SavedMealItemRow, "id" | "user_id" | "serving">,
        [
          {
            foreignKeyName: "saved_meal_items_meal_id_fkey";
            columns: ["meal_id"];
            isOneToOne: false;
            referencedRelation: "saved_meals";
            referencedColumns: ["id"];
          },
        ]
      >;
      food_entries: Table<FoodEntryRow, Optional<FoodEntryRow, Generated | "serving" | "saved_food_id" | "source" | "external_ref">>;
      workout_logs: Table<WorkoutLogRow, Optional<WorkoutLogRow, Generated | "workout_type" | "duration_min" | "notes">>;
    };
    Views: { [_ in never]: never };
    Functions: {
      replace_saved_meal_items: { Args: { p_meal_id: string; p_items: Json }; Returns: undefined };
    };
    Enums: {
      meal_type: MealType;
      workout_status: WorkoutStatus;
      workout_type: WorkoutType;
      energy_unit: EnergyUnit;
      food_source: FoodSource;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
