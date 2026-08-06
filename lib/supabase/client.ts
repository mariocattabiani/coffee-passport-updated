import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a fresh Supabase client for use inside Client Components
 * (anything with "use client" at the top). Call this once per component
 * that needs it — it's cheap to create.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
