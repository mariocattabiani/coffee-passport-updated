import { createClient } from "@/lib/supabase/server";
import { cardPathFor } from "@/lib/storage/photo-variants";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const DRINK_PHOTOS_BUCKET = "drink-photos";

/**
 * Batches every photo path into ONE signed-URL request instead of one
 * per photo. Extracted verbatim from a pattern that was previously
 * duplicated across app/dashboard/page.tsx, app/passport/page.tsx,
 * both signed-URL blocks in app/shops/[id]/page.tsx (the viewer's own
 * logs and the public community-activity photos), and lib/discover/
 * actions.ts's own local signPhotoPaths(). Same bucket, same null/
 * empty-array short-circuit, same "signedUrl present and no error"
 * guard, same `s.path ?? ""` fallback key, same Map<string, string>
 * return shape every call site already built by hand.
 *
 * ttlSeconds is the one thing that already varied by caller (3600 for
 * a viewer's own logs; 300 for public/community photos, deliberately
 * short-lived — see the comments at each of those call sites for why)
 * and still does. This helper doesn't decide a TTL for you; it's
 * still every caller's own choice, made explicit at the call site.
 *
 * Server-only (calls supabase.storage), so this isn't reusable
 * as-is from a React Native client the way the pure lib/passport and
 * lib/shops modules are — kept here anyway as shared server
 * infrastructure, per the sprint's own allowance for that.
 */
export async function signDrinkPhotoPaths(
  supabase: SupabaseServerClient,
  paths: (string | null | undefined)[],
  ttlSeconds: number
): Promise<Map<string, string>> {
  const photoPaths = paths.filter((p): p is string => !!p);
  const signedUrlByPath = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(DRINK_PHOTOS_BUCKET)
      .createSignedUrls(photoPaths, ttlSeconds);
    signed?.forEach((s) => {
      if (s.signedUrl && !s.error) signedUrlByPath.set(s.path ?? "", s.signedUrl);
    });
  }
  return signedUrlByPath;
}

/**
 * Same contract as signDrinkPhotoPaths (Map keyed by the ORIGINAL path,
 * same TTL choice left to the caller), but each URL points at the
 * lighter "card" copy when one exists, else at the full original.
 *
 * One createSignedUrls request covers both: Supabase returns a per-item
 * error for a card copy that doesn't exist (older photos, or a card
 * upload that failed), and that photo falls back to its original. Access
 * is decided by the same Storage policies for both variants.
 *
 * Use for card-sized surfaces only (feeds, grids, café pages, Explore).
 * The full-screen viewer upgrades to the original on its own.
 */
export async function signDrinkPhotoCardPaths(
  supabase: SupabaseServerClient,
  paths: (string | null | undefined)[],
  ttlSeconds: number
): Promise<Map<string, string>> {
  const photoPaths = [...new Set(paths.filter((p): p is string => !!p))];
  const urlByPath = new Map<string, string>();
  if (photoPaths.length === 0) return urlByPath;

  const cardByFull = new Map(photoPaths.map((p) => [p, cardPathFor(p)] as const));
  const toSign = [...new Set([...photoPaths, ...cardByFull.values()])];

  const { data: signed } = await supabase.storage
    .from(DRINK_PHOTOS_BUCKET)
    .createSignedUrls(toSign, ttlSeconds);

  const signedByPath = new Map<string, string>();
  signed?.forEach((s) => {
    if (s.signedUrl && !s.error && s.path) signedByPath.set(s.path, s.signedUrl);
  });

  for (const full of photoPaths) {
    const url = signedByPath.get(cardByFull.get(full)!) ?? signedByPath.get(full);
    if (url) urlByPath.set(full, url);
  }
  return urlByPath;
}
