"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { Repository } from "./repository";
import { LocalRepository } from "./local-repository";

/*
 * The local repository is created in the browser. During SSR and hydration it is
 * `null`, so data UI renders its loading state on both sides and nothing mismatches.
 */

let repo: Repository | null = null;

function getRepository(): Repository | null {
  repo ??= new LocalRepository();
  return repo;
}

/** Drops the cached repository after authentication changes. */
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
