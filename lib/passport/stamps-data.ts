"use server";

import { createClient } from "@/lib/supabase/server";
import { evaluatePassportAchievements, getEarnedAchievements } from "@/lib/passport/actions";
import {
  computeAchievementProgress,
  toStampDisplayItems,
  type StampDisplayItem,
} from "@/lib/passport/achievements";

interface StampStatsLogRow {
  beverage_category: "coffee" | "tea";
  shop_id: string;
  shop: { city: string | null; state: string | null } | null;
}

/**
 * Deliberately its own lean query, not a reuse of Passport's full
 * drink_logs select: this page only ever renders stamps, so it only
 * ever fetches the columns computeAchievementProgress actually needs
 * (beverage category, shop id, shop city/state) — never photo_url,
 * caption, price, size, or either rating, all of which Passport's own
 * page needs for its other sections (map, favorites, history) but
 * this one has no use for. Same lean-query principle already
 * established for /passport/been.
 */
export async function getMyStampItems(): Promise<StampDisplayItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows, error } = await supabase
    .from("drink_logs")
    .select("beverage_category, shop_id, shop:shops(city,state)")
    .eq("user_id", user.id)
    .returns<StampStatsLogRow[]>();

  if (error) {
    console.error("get my stamp items query:", error.message);
    throw new Error("Unable to load your stamps.");
  }

  const logs = rows ?? [];

  // Same idempotent, server-derived evaluation Passport's own page
  // already runs on every visit — never trusts anything from the
  // client, re-derives qualification from drink_logs itself.
  if (logs.length > 0) {
    await evaluatePassportAchievements();
  }
  const earnedAchievements = await getEarnedAchievements();

  const coffeeLogs = logs.filter((l) => l.beverage_category === "coffee").length;
  const teaLogs = logs.filter((l) => l.beverage_category === "tea").length;
  const uniqueShops = new Set(logs.map((l) => l.shop_id)).size;
  const uniqueCities = new Set(
    logs
      .filter((l) => l.shop?.city && l.shop?.state)
      .map((l) => `${l.shop!.city!.toLowerCase().trim()}|${l.shop!.state!.toLowerCase().trim()}`)
  ).size;

  const progress = computeAchievementProgress(
    {
      totalLogs: logs.length,
      coffeeLogs,
      uniqueShops,
      uniqueCities,
      teaLogs,
    },
    earnedAchievements
  );

  return toStampDisplayItems(progress);
}
