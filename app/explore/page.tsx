import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getDefaultExploreRegion, getDiscoveryResults } from "@/lib/explore/actions";
import { getEarnedAchievements } from "@/lib/passport/actions";
import {
  computeAchievementProgress,
  derivePassportAchievementStats,
  selectUpNext,
  toUpNextGoalDisplay,
} from "@/lib/passport/achievements";
import { AuthenticatedHeader } from "@/components/dashboard/authenticated-header";
import { ExploreClient } from "@/components/explore/explore-client";
import type { BeverageCategory } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Explore | Coffee Passport",
};

interface OwnLogStatRow {
  shop_id: string;
  beverage_category: BeverageCategory;
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

export default async function ExplorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Zero Google calls anywhere on this page load: the default region
  // comes entirely from the user's own stored history, and the initial
  // discovery results are a plain bounded read of stored shops.
  const [region, { data: statRows }] = await Promise.all([
    getDefaultExploreRegion(),
    supabase
      .from("drink_logs")
      .select(
        "shop_id, beverage_category, drink_rating, caption, photo_url, temperature, drink:drinks(name), shop:shops(location_id,city,state,country)"
      )
      .eq("user_id", user.id)
      .returns<OwnLogStatRow[]>(),
  ]);

  const initialResults = await getDiscoveryResults(region.bounds);

  // No evaluate_passport_achievements() call here anymore. Evaluation
  // now happens as a write-time side effect of createDrinkLog /
  // updateDrinkLog (lib/drink-logs/actions.ts), so a threshold crossed
  // by a log is already reflected by the time this reads it — Explore
  // (like every other page) only ever reads what's already been
  // evaluated, it doesn't re-run the evaluator just because it rendered.
  const earnedAchievements = await getEarnedAchievements();

  const allLogs = statRows ?? [];
  const achievementProgress = computeAchievementProgress(
    derivePassportAchievementStats(allLogs),
    earnedAchievements
  );
  const upNextGoal = toUpNextGoalDisplay(selectUpNext(achievementProgress)[0] ?? null);

  return (
    <div className="min-h-dvh overflow-x-clip bg-crema pb-24 lg:pb-10">
      <AuthenticatedHeader active="explore" />

      <main className="container min-w-0 max-w-6xl space-y-6 py-6 sm:py-10">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-espresso sm:text-3xl">Explore</h1>
          <p className="text-sm text-charcoal/60">Where should you get coffee?</p>
        </div>

        <ExploreClient initialResults={initialResults} regionLabel={region.label} upNextGoal={upNextGoal} />
      </main>
    </div>
  );
}
