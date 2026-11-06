"use client";

import { useSyncExternalStore } from "react";

/** Matches a media query; `false` during SSR so phone layout is the baseline. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Tailwind `md` and up: tablet / desktop web layout. */
export const DESKTOP_QUERY = "(min-width: 768px)";
