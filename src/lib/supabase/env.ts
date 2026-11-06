/**
 * Public Supabase settings. When either is missing the app runs in demo mode.
 * Only the anon (publishable) key is ever used; it is safe in the browser
 * because every table is protected by row level security.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Cookie set when a visitor chooses to explore the demo instead of signing in. */
export const DEMO_COOKIE = "ef-demo";
