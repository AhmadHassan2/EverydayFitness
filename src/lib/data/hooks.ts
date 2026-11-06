"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import type { FoodEntry, FoodSuggestion, GoalRecord, Goals, ISODate, SavedFood, SavedMeal, WorkoutLog } from "@/lib/domain/types";
import { deviceTimeZone, todayIn } from "@/lib/domain/dates";
import { currentGoals } from "@/lib/domain/goals";
import { mergeSuggestions, rankByQuery, recentFoods, suggestionFromSaved } from "@/lib/domain/foods";
import type {
  FoodEntryInput,
  GoalsInput,
  ProfilePatch,
  SavedFoodInput,
  SavedMealInput,
  WorkoutInput,
} from "@/lib/domain/validation";
import { useRepository } from "./provider";
import type { Repository } from "./repository";

export const qk = {
  profile: ["profile"] as const,
  goals: ["goals"] as const,
  entries: (from: ISODate, to: ISODate) => ["entries", from, to] as const,
  recent: ["recent"] as const,
  search: (q: string) => ["search", q] as const,
  savedFoods: ["savedFoods"] as const,
  savedMeals: ["savedMeals"] as const,
  workouts: (from: ISODate, to: ISODate) => ["workouts", from, to] as const,
};

interface RepoQueryOptions {
  enabled?: boolean;
  /** Keep showing the previous range while a new one loads (no skeleton flash). */
  keepPrevious?: boolean;
}

function useRepoQuery<T>(key: QueryKey, fn: (repo: Repository) => Promise<T>, opts: RepoQueryOptions = {}) {
  const repo = useRepository();
  return useQuery({
    queryKey: [repo?.mode ?? "pending", ...key],
    queryFn: () => fn(repo!),
    enabled: repo !== null && (opts.enabled ?? true),
    placeholderData: opts.keepPrevious ? keepPreviousData : undefined,
  });
}

function requireRepo(repo: Repository | null): Repository {
  if (!repo) throw new Error("Data is still loading.");
  return repo;
}

// ---------------------------------------------------------------------------
// Profile, time, goals
// ---------------------------------------------------------------------------

export function useProfile() {
  return useRepoQuery(qk.profile, (r) => r.getProfile());
}

export function useTimeZone(): string {
  const { data } = useProfile();
  return data?.timezone ?? deviceTimeZone();
}

// A shared minute ticker so "today" rolls over at local midnight while open.
const minuteListeners = new Set<() => void>();
let minuteTimer: ReturnType<typeof setInterval> | null = null;
let minuteStamp = Math.floor(Date.now() / 60_000);

function subscribeMinute(cb: () => void) {
  minuteListeners.add(cb);
  const tick = () => {
    minuteStamp = Math.floor(Date.now() / 60_000);
    minuteListeners.forEach((l) => l());
  };
  if (!minuteTimer) {
    minuteTimer = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
  }
  return () => {
    minuteListeners.delete(cb);
    if (minuteListeners.size === 0 && minuteTimer) {
      clearInterval(minuteTimer);
      minuteTimer = null;
      document.removeEventListener("visibilitychange", tick);
    }
  };
}

/** Today's date in the user's timezone; `null` during SSR/hydration. */
export function useToday(): ISODate | null {
  const tz = useTimeZone();
  const stamp = useSyncExternalStore(
    subscribeMinute,
    () => minuteStamp,
    () => null,
  );
  return useMemo(() => (stamp === null ? null : todayIn(tz, new Date(stamp * 60_000))), [stamp, tz]);
}

export function useGoalHistory() {
  return useRepoQuery(qk.goals, (r) => r.getGoalHistory());
}

export function useCurrentGoals(today: ISODate | null): Goals | null {
  const { data } = useGoalHistory();
  return data && today ? currentGoals(data, today) : null;
}

export function useUpdateProfile() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => requireRepo(repo).updateProfile(patch),
    onSuccess: (profile) => qc.setQueryData([repo?.mode, ...qk.profile], profile),
  });
}

export function useSetGoals() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goals, effectiveDate }: { goals: GoalsInput; effectiveDate: ISODate }) =>
      requireRepo(repo).setGoals(goals, effectiveDate),
    onSuccess: (history: GoalRecord[]) => qc.setQueryData([repo?.mode, ...qk.goals], history),
  });
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

export function useEntries(from: ISODate | null, to: ISODate | null, opts: RepoQueryOptions = {}) {
  return useRepoQuery(qk.entries(from ?? "", to ?? ""), (r) => r.listEntries(from!, to!), { enabled: Boolean(from && to), ...opts });
}

/** Applies `fn` to every cached entries range that could contain `dates`. */
function patchEntryCaches(qc: QueryClient, fn: (list: FoodEntry[], range: { from: string; to: string }) => FoodEntry[]) {
  for (const [key, data] of qc.getQueriesData<FoodEntry[]>({ predicate: (q) => q.queryKey[1] === "entries" })) {
    if (!data) continue;
    const [, , from, to] = key as [string, string, string, string];
    qc.setQueryData(key, fn(data, { from, to }));
  }
}

function snapshotEntries(qc: QueryClient) {
  return qc.getQueriesData<FoodEntry[]>({ predicate: (q) => q.queryKey[1] === "entries" });
}

function restore(qc: QueryClient, snapshot: [QueryKey, unknown][]) {
  for (const [key, data] of snapshot) qc.setQueryData(key, data);
}

function invalidateFood(qc: QueryClient) {
  return qc.invalidateQueries({
    predicate: (q) => ["entries", "recent", "search", "savedFoods"].includes(String(q.queryKey[1])),
  });
}

function optimisticEntry(input: FoodEntryInput, id: string): FoodEntry {
  const now = new Date().toISOString();
  return { ...input, id, loggedAt: new Date(input.loggedAt).toISOString(), externalRef: null, createdAt: now };
}

export function useAddEntries() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inputs: FoodEntryInput[]) => requireRepo(repo).addEntries(inputs),
    onMutate: async (inputs) => {
      await qc.cancelQueries({ predicate: (q) => q.queryKey[1] === "entries" });
      const snapshot = snapshotEntries(qc);
      const temps = inputs.map((i, n) => optimisticEntry(i, `optimistic-${Date.now()}-${n}`));
      patchEntryCaches(qc, (list, { from, to }) => [...list, ...temps.filter((t) => t.date >= from && t.date <= to)]);
      return { snapshot };
    },
    onError: (_e, _v, ctx) => ctx && restore(qc, ctx.snapshot),
    onSettled: () => invalidateFood(qc),
  });
}

export function useUpdateEntry() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FoodEntryInput }) => requireRepo(repo).updateEntry(id, input),
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ predicate: (q) => q.queryKey[1] === "entries" });
      const snapshot = snapshotEntries(qc);
      patchEntryCaches(qc, (list, { from, to }) => {
        const prev = list.find((e) => e.id === id);
        const rest = list.filter((e) => e.id !== id);
        if (input.date < from || input.date > to) return rest;
        return [...rest, { ...optimisticEntry(input, id), createdAt: prev?.createdAt ?? new Date().toISOString() }];
      });
      return { snapshot };
    },
    onError: (_e, _v, ctx) => ctx && restore(qc, ctx.snapshot),
    onSettled: () => invalidateFood(qc),
  });
}

export function useDeleteEntry() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entry: FoodEntry) => requireRepo(repo).deleteEntry(entry.id),
    onMutate: async (entry) => {
      await qc.cancelQueries({ predicate: (q) => q.queryKey[1] === "entries" });
      const snapshot = snapshotEntries(qc);
      patchEntryCaches(qc, (list) => list.filter((e) => e.id !== entry.id));
      return { snapshot };
    },
    onError: (_e, _v, ctx) => ctx && restore(qc, ctx.snapshot),
    onSettled: () => invalidateFood(qc),
  });
}

/** Turns an existing entry back into input (to duplicate, copy, or undo a delete). */
export function entryToInput(e: FoodEntry, overrides: Partial<FoodEntryInput> = {}): FoodEntryInput {
  return {
    date: e.date,
    loggedAt: e.loggedAt,
    meal: e.meal,
    name: e.name,
    serving: e.serving,
    calories: e.calories,
    protein: e.protein,
    carbs: e.carbs,
    fat: e.fat,
    savedFoodId: e.savedFoodId,
    source: e.source,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Quick pick: recent foods, favourites, search
// ---------------------------------------------------------------------------

export function useRecentFoods(limit = 12) {
  const q = useRepoQuery(qk.recent, (r) => r.listRecentEntries(300));
  return { ...q, data: q.data ? recentFoods(q.data, limit) : undefined };
}

export function useDebounced<T>(value: T, ms = 180): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Searches favourites and history. Favourites rank first. */
export function useFoodSearch(query: string) {
  const term = useDebounced(query.trim());
  const saved = useSavedFoods();
  const history = useRepoQuery(qk.search(term), (r) => r.searchEntries(term, 60), { enabled: term.length > 0 });
  const data = useMemo<FoodSuggestion[] | undefined>(() => {
    if (!term) return undefined;
    const fromSaved = rankByQuery((saved.data ?? []).map(suggestionFromSaved), term);
    const fromHistory = history.data ? rankByQuery(recentFoods(history.data, 60), term) : [];
    return mergeSuggestions(fromSaved, fromHistory).slice(0, 30);
  }, [term, saved.data, history.data]);
  return { data, isLoading: term.length > 0 && history.isLoading, term };
}

export function useSavedFoods() {
  return useRepoQuery(qk.savedFoods, (r) => r.listSavedFoods());
}

export function useSaveFood() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SavedFoodInput) => requireRepo(repo).saveFood(input),
    onSettled: () => qc.invalidateQueries({ predicate: (q) => q.queryKey[1] === "savedFoods" }),
  });
}

export function useUpdateSavedFood() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SavedFoodInput }) => requireRepo(repo).updateSavedFood(id, input),
    onSettled: () => qc.invalidateQueries({ predicate: (q) => q.queryKey[1] === "savedFoods" }),
  });
}

export function useDeleteSavedFood() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (food: SavedFood) => requireRepo(repo).deleteSavedFood(food.id),
    onMutate: async (food) => {
      const key = [repo?.mode, ...qk.savedFoods];
      const prev = qc.getQueryData<SavedFood[]>(key);
      qc.setQueryData<SavedFood[]>(key, (list) => list?.filter((f) => f.id !== food.id));
      return { prev, key };
    },
    onError: (_e, _v, ctx) => ctx && qc.setQueryData(ctx.key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ predicate: (q) => ["savedFoods", "entries", "recent"].includes(String(q.queryKey[1])) }),
  });
}

export function useSavedMeals() {
  return useRepoQuery(qk.savedMeals, (r) => r.listSavedMeals());
}

export function useSaveMeal() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: SavedMealInput }) =>
      id ? requireRepo(repo).updateSavedMeal(id, input) : requireRepo(repo).createSavedMeal(input),
    onSettled: () => qc.invalidateQueries({ predicate: (q) => q.queryKey[1] === "savedMeals" }),
  });
}

export function useDeleteSavedMeal() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (meal: SavedMeal) => requireRepo(repo).deleteSavedMeal(meal.id),
    onMutate: async (meal) => {
      const key = [repo?.mode, ...qk.savedMeals];
      const prev = qc.getQueryData<SavedMeal[]>(key);
      qc.setQueryData<SavedMeal[]>(key, (list) => list?.filter((m) => m.id !== meal.id));
      return { prev, key };
    },
    onError: (_e, _v, ctx) => ctx && qc.setQueryData(ctx.key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ predicate: (q) => q.queryKey[1] === "savedMeals" }),
  });
}

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------

export function useWorkouts(from: ISODate | null, to: ISODate | null, opts: RepoQueryOptions = {}) {
  return useRepoQuery(qk.workouts(from ?? "", to ?? ""), (r) => r.listWorkouts(from!, to!), { enabled: Boolean(from && to), ...opts });
}

export function useSetWorkout() {
  const repo = useRepository();
  const qc = useQueryClient();
  const isWorkouts = (q: { queryKey: QueryKey }) => q.queryKey[1] === "workouts";
  return useMutation({
    mutationFn: ({ date, input }: { date: ISODate; input: WorkoutInput | null }) => requireRepo(repo).setWorkout(date, input),
    onMutate: async ({ date, input }) => {
      await qc.cancelQueries({ predicate: isWorkouts });
      const snapshot = qc.getQueriesData<WorkoutLog[]>({ predicate: isWorkouts });
      for (const [key, data] of snapshot) {
        if (!data) continue;
        const [, , from, to] = key as [string, string, string, string];
        if (date < from || date > to) continue;
        const rest = data.filter((w) => w.date !== date);
        const next: WorkoutLog | null = input
          ? {
              id: `optimistic-${date}`,
              date,
              status: input.status,
              workoutType: input.status === "trained" ? input.workoutType : null,
              durationMin: input.status === "trained" ? input.durationMin : null,
              notes: input.notes,
              updatedAt: new Date().toISOString(),
            }
          : null;
        qc.setQueryData(key, next ? [...rest, next] : rest);
      }
      return { snapshot };
    },
    onError: (_e, _v, ctx) => ctx && restore(qc, ctx.snapshot),
    onSettled: () => qc.invalidateQueries({ predicate: isWorkouts }),
  });
}

export type { FoodEntry, SavedFood, SavedMeal };
