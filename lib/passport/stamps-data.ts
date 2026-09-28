"use server";

import { createClient } from "@/lib/supabase/server";
import { getEarnedAchievements } from "@/lib/passport/actions";
import {
  computeAchievementProgress,
  derivePassportAchievementStats,
  toStampDisplayItems,
  type StampDisplayItem,
} from "@/lib/passport/achievements";

interface StampStatsLogRow {
  beverage_category: "coffee" | "tea";
  shop_id: string;
  drink_rating: number;
  caption: string | null;
  photo_url: string | null;
  temperature: "hot" | "iced" | null;
  drink: { name: string } | null;
  shop: {
    location_id: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
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
    .select(
      "beverage_category, shop_id, drink_rating, caption, photo_url, temperature, drink:drinks(name), shop:shops(location_id,city,state,country)"
    )
    .eq("user_id", user.id)
    .returns<StampStatsLogRow[]>();

  if (error) {
    console.error("get my stamp items query:", error.message);
    throw new Error("Unable to load your stamps.");
  }

  const logs = rows ?? [];

  // No evaluate_passport_achievements() call here anymore. Evaluation
  // is now a write-time side effect of createDrinkLog/updateDrinkLog
  // (lib/drink-logs/actions.ts) — this page, like Dashboard, Explore,
  // and Passport, only ever reads what's already been evaluated.
  const earnedAchievements = await getEarnedAchievements();

  const progress = computeAchievementProgress(derivePassportAchievementStats(logs), earnedAchievements);

  return toStampDisplayItems(progress);
}
