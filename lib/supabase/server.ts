import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for use on the server: Server Components,
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
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: CookieOptions;
          }[]
        ) {
          try {
            // All cookies in the batch are written together. This
            // matters for something like signOut(), which needs to
            // clear every piece of a (possibly chunked) session cookie
            // in one pass, not one at a time.
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Setting cookies from a Server Component (not a Server
            // Action or Route Handler) throws, safe to ignore because
            // the middleware refreshes the session on every request
            // anyway.
          }
        },
      },
    }
  );
}
