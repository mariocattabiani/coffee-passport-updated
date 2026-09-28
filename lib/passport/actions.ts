"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { EarnedAchievement } from "@/lib/passport/achievements";

interface EvaluateRow {
  newly_awarded_key: string;
}

/**
 * Calls evaluate_passport_achievements(), which independently
 * determines qualification itself server-side, this never sends an
 * achievement key to the database, there's nothing here for a caller
 * to manipulate.
 *
 * SUCCESS vs FAILURE, deliberately distinguished: an RPC error is
 * thrown, not swallowed into an empty array. The two outcomes look
 * identical to a caller that only checks "did I get []" — a genuine
 * "ran fine, nothing new to award" and a "the database call itself
 * failed" are not the same thing, and this is the only function in
 * the codebase that ever calls this RPC, so nothing downstream can
 * mistake a real failure for an uneventful success. The only current
 * caller — evaluateAchievementsBestEffort() in
 * lib/drink-logs/actions.ts — exists specifically to catch this,
 * log it, and let a successful log create/update still succeed
 * despite it. See that function's own comment for the recovery story:
 * because this RPC re-scans the user's full current history every
 * time, any later successful create or achievement-relevant edit
 * naturally catches whatever a failed evaluation here missed, via the
 * same ON CONFLICT DO NOTHING idempotency every award already relies
 * on — no retry queue needed for this to self-heal.
 */
export async function evaluatePassportAchievements(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("evaluate_passport_achievements");
  if (error) {
    throw new Error(`evaluate_passport_achievements RPC failed: ${error.message}`);
  }
  const rows = (data ?? []) as EvaluateRow[];
  return rows.map((r) => r.newly_awarded_key).filter(Boolean);
}

interface EarnedRow {
  achievement_key: string;
  earned_at: string;
  seen_at: string | null;
}

/** Plain owner-scoped read, RLS already covers this, no RPC needed. */
export async function getEarnedAchievements(): Promise<Map<string, EarnedAchievement>> {
  const supabase = await createClient();
  const { data } = await supabase.from("passport_achievements").select("achievement_key, earned_at, seen_at");

  const map = new Map<string, EarnedAchievement>();
  ((data ?? []) as EarnedRow[]).forEach((row) => {
    map.set(row.achievement_key, { earnedAt: row.earned_at, seenAt: row.seen_at });
  });
  return map;
}

/** Marks only the signed-in user's currently unseen stamps. The
 * collection calls this after it has actually mounted, so route
 * prefetching cannot clear NEW before the person views the page. */
export async function markPassportAchievementsSeen(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_passport_achievements_seen");
  if (error) throw new Error("Couldn't update your stamps.");
  revalidatePath("/passport");
  revalidatePath("/passport/stamps");
}
