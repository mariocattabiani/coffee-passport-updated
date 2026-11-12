"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Re-issues ONE short-lived signed URL for a drink photo whose earlier
 * URL has expired (most often: a lazy-loaded image the viewer scrolled
 * to more than five minutes after the page rendered).
 *
 * Privacy model is unchanged: this runs under the VIEWER's own session,
 * so the existing storage.objects SELECT policies decide exactly as they
 * do for every other signing call. If the post has since gone private,
 * been deleted, or never belonged to something this viewer may see,
 * Supabase refuses to sign and this returns null. Nothing is cached
 * here, and the lifetime matches the public surfaces (5 minutes).
 */
const RESIGN_TTL_SECONDS = 5 * 60;

// Storage paths in this bucket are "<user uuid>/<file>.jpg".
const DRINK_PHOTO_PATH = /^[0-9a-f-]{36}\/[A-Za-z0-9._-]+\.jpg$/i;

export async function resignDrinkPhoto(path: string): Promise<string | null> {
  if (typeof path !== "string" || !DRINK_PHOTO_PATH.test(path) || path.includes("..")) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.storage
    .from("drink-photos")
    .createSignedUrl(path, RESIGN_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
