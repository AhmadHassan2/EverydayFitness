"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseAnonKey, supabaseUrl } from "./env";

let client: SupabaseClient<Database> | undefined;

export function getBrowserSupabase(): SupabaseClient<Database> {
  client ??= createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return client;
}
