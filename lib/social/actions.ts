"use server";

import { createClient } from "@/lib/supabase/server";

export interface ToggleLikeResult {
  liked: boolean;
  likeCount: number;
}

interface ToggleLikeRow {
  liked: boolean;
  like_count: number;
}

/**
 * Toggles the current user's like on a public log. Auth and public-log
 * eligibility are both enforced inside toggle_like itself (SECURITY
 * DEFINER, derives the user from auth.uid(), never trusts a client-
 * supplied user id) — this function only shapes the result and turns a
 * real RPC failure into a clean, sanitized error rather than silently
 * defaulting to "not liked."
 */
export async function toggleLike(logId: string): Promise<ToggleLikeResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_like", { target_log_id: logId });

  if (error) {
    console.error("toggle_like failed:", error.message);
    throw new Error("Couldn't update your like. Please try again.");
  }

  const rows = (data ?? []) as ToggleLikeRow[];
  const row = rows[0];
  if (!row) {
    console.error("toggle_like returned no row");
    throw new Error("Couldn't update your like. Please try again.");
  }

  return { liked: row.liked, likeCount: row.like_count };
}

export interface ToggleSaveResult {
  saved: boolean;
}

interface ToggleSaveRow {
  saved: boolean;
  save_id: string;
}

/**
 * Toggles the current user's saved "want to try" intent for a
 * drink/café pair, optionally recording which public log it was
 * discovered through as provenance only — the save's own identity is
 * (user, shop, drink), never the source log. drinkId is nullable to
 * support a café-only save/unsave (no specific drink), including
 * removing one from the Saved list, which never needs a source log.
 */
export async function toggleSave(
  shopId: string,
  drinkId: string | null,
  sourceLogId: string | null
): Promise<ToggleSaveResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_save", {
    target_shop_id: shopId,
    target_drink_id: drinkId,
    target_source_log_id: sourceLogId,
  });

  if (error) {
    console.error("toggle_save failed:", error.message);
    throw new Error("Couldn't update your save. Please try again.");
  }

  const rows = (data ?? []) as ToggleSaveRow[];
  const row = rows[0];
  if (!row) {
    console.error("toggle_save returned no row");
    throw new Error("Couldn't update your save. Please try again.");
  }

  return { saved: row.saved };
}
