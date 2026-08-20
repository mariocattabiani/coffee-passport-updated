"use server";

import { createClient } from "@/lib/supabase/server";

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
}

/** Plain owner-scoped read, RLS already covers this, no RPC needed. */
export async function getEarnedAchievements(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("passport_achievements").select("achievement_key, earned_at");

  const map = new Map<string, string>();
  ((data ?? []) as EarnedRow[]).forEach((row) => {
    map.set(row.achievement_key, row.earned_at);
  });
  return map;
}
