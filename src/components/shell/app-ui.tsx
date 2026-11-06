"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { FoodEntry, ISODate, MealType, SavedMeal } from "@/lib/domain/types";
import type { SavedMealInput } from "@/lib/domain/validation";

/*
 * Sheets live once in the shell rather than inside each page: routes stay
 * mounted (hidden) between navigations, and one shared instance avoids stale
 * open sheets on hidden pages.
 */

export type FoodSheetState =
  | { open: false }
  | { open: true; mode: "add"; date: ISODate; meal?: MealType }
  | { open: true; mode: "edit"; entry: FoodEntry };

export type MealBuilderState = { open: false } | { open: true; meal?: SavedMeal; prefill?: SavedMealInput };

interface AppUI {
  /** Day shown on the Today screen (null = follow today). */
  viewDate: ISODate | null;
  setViewDate: (d: ISODate | null) => void;
  foodSheet: FoodSheetState;
  openAddFood: (date: ISODate, meal?: MealType) => void;
  openEditEntry: (entry: FoodEntry) => void;
  closeFoodSheet: () => void;
  workoutSheet: ISODate | null;
  openWorkout: (date: ISODate) => void;
  closeWorkout: () => void;
  mealBuilder: MealBuilderState;
  openMealBuilder: (opts?: { meal?: SavedMeal; prefill?: SavedMealInput }) => void;
  closeMealBuilder: () => void;
}

const Ctx = createContext<AppUI | null>(null);

export function AppUIProvider({ children }: { children: ReactNode }) {
  const [viewDate, setViewDate] = useState<ISODate | null>(null);
  const [foodSheet, setFoodSheet] = useState<FoodSheetState>({ open: false });
  const [workoutSheet, setWorkoutSheet] = useState<ISODate | null>(null);
  const [mealBuilder, setMealBuilder] = useState<MealBuilderState>({ open: false });

  const openAddFood = useCallback((date: ISODate, meal?: MealType) => setFoodSheet({ open: true, mode: "add", date, meal }), []);
  const openEditEntry = useCallback((entry: FoodEntry) => setFoodSheet({ open: true, mode: "edit", entry }), []);
  const closeFoodSheet = useCallback(() => setFoodSheet({ open: false }), []);
  const openWorkout = useCallback((d: ISODate) => setWorkoutSheet(d), []);
  const closeWorkout = useCallback(() => setWorkoutSheet(null), []);
  const openMealBuilder = useCallback(
    (opts?: { meal?: SavedMeal; prefill?: SavedMealInput }) => setMealBuilder({ open: true, ...opts }),
    [],
  );
  const closeMealBuilder = useCallback(() => setMealBuilder({ open: false }), []);

  const value = useMemo(
    () => ({
      viewDate,
      setViewDate,
      foodSheet,
      openAddFood,
      openEditEntry,
      closeFoodSheet,
      workoutSheet,
      openWorkout,
      closeWorkout,
      mealBuilder,
      openMealBuilder,
      closeMealBuilder,
    }),
    [viewDate, foodSheet, workoutSheet, mealBuilder, openAddFood, openEditEntry, closeFoodSheet, openWorkout, closeWorkout, openMealBuilder, closeMealBuilder],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppUI(): AppUI {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppUI must be used inside AppUIProvider");
  return v;
}
