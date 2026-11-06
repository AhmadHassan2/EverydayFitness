"use client";

import { DEMO_COOKIE, isSupabaseConfigured } from "@/lib/supabase/env";
import { getBrowserSupabase } from "@/lib/supabase/client";

/*
 * Mode switches use full page loads so no cached query data, preserved route
 * state, or repository instance survives into the other mode.
 */

export function enterDemo() {
  document.cookie = `${DEMO_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.location.assign("/");
}

export function leaveDemo() {
  document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0; samesite=lax`;
  window.location.assign(isSupabaseConfigured ? "/login" : "/");
}

export async function signOut() {
  if (isSupabaseConfigured) await getBrowserSupabase().auth.signOut();
  window.location.assign("/login");
}
