import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for use on the server — in Server Components,
 * Server Actions, and Route Handlers. It reads the user's session from
 * cookies, so `supabase.auth.getUser()` returns the signed-in user.
 *
 * Next.js 15 made `cookies()` asynchronous, so this function is now
 * async too. Every caller needs `await createClient()` instead of
 * `createClient()`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Setting cookies from a Server Component (not a Server Action
            // or Route Handler) throws — safe to ignore because the
            // middleware refreshes the session on every request anyway.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // See note above.
          }
        },
      },
    }
  );
}
