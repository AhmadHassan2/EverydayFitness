"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { DEMO_COOKIE, isSupabaseConfigured } from "@/lib/supabase/env";
import type { Repository } from "./repository";
import { DemoRepository } from "./demo/demo-repository";
import { SupabaseRepository } from "./supabase/supabase-repository";

/*
 * The repository is chosen in the browser: Supabase when it is configured and
 * the visitor hasn't opted into the demo, otherwise the local demo store.
 * During SSR and hydration it is `null`, so data UI renders its loading state
 * on both sides and nothing mismatches.
 */

let repo: Repository | null = null;

function readDemoCookie(): boolean {
  return document.cookie.split("; ").some((c) => c === `${DEMO_COOKIE}=1`);
}

export function isDemoSession(): boolean {
  return !isSupabaseConfigured || readDemoCookie();
}

function getRepository(): Repository {
  repo ??= isDemoSession() ? new DemoRepository() : new SupabaseRepository();
  return repo;
}

/** Drops the cached repository (after sign-in/out or leaving demo mode). */
export function resetRepository() {
  repo = null;
}

const noopSubscribe = () => () => {};

const RepositoryContext = createContext<Repository | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const value = useSyncExternalStore(noopSubscribe, getRepository, () => null);
  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
}

export function useRepository(): Repository | null {
  return useContext(RepositoryContext);
}
