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
 */
export async function evaluatePassportAchievements(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("evaluate_passport_achievements");
  if (error) return [];
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
