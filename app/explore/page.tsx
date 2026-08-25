import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getDefaultExploreRegion, getDiscoveryResults } from "@/lib/explore/actions";
import { evaluatePassportAchievements, getEarnedAchievements } from "@/lib/passport/actions";
import { computeAchievementProgress, selectUpNext, toUpNextGoalDisplay } from "@/lib/passport/achievements";
import { AuthenticatedHeader } from "@/components/dashboard/authenticated-header";
import { ExploreClient } from "@/components/explore/explore-client";
import type { BeverageCategory } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Explore | Coffee Passport",
};

interface OwnLogStatRow {
  shop_id: string;
  drink_id: string;
  beverage_category: BeverageCategory;
  shop: { city: string | null; state: string | null } | null;
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
      .select("shop_id, drink_id, beverage_category, shop:shops(city,state)")
      .eq("user_id", user.id)
      .returns<OwnLogStatRow[]>(),
  ]);

  const initialResults = await getDiscoveryResults(region.bounds);

  // Same evaluate-then-read pattern already established on Dashboard,
  // evaluating here too means a threshold crossed by a log made just
  // before visiting Explore is reflected immediately, not only after a
  // separate Dashboard or Passport visit.
  await evaluatePassportAchievements();
  const earnedAchievements = await getEarnedAchievements();

  const allLogs = statRows ?? [];
  const achievementProgress = computeAchievementProgress(
    {
      totalLogs: allLogs.length,
      coffeeLogs: allLogs.filter((l) => l.beverage_category === "coffee").length,
      uniqueShops: new Set(allLogs.map((l) => l.shop_id)).size,
      uniqueCities: new Set(
        allLogs
          .filter((l) => l.shop?.city && l.shop?.state)
          .map((l) => `${l.shop!.city!.toLowerCase().trim()}|${l.shop!.state!.toLowerCase().trim()}`)
      ).size,
      teaLogs: allLogs.filter((l) => l.beverage_category === "tea").length,
    },
    earnedAchievements
  );
  const upNextGoal = toUpNextGoalDisplay(selectUpNext(achievementProgress)[0] ?? null);

  return (
    <div className="min-h-screen bg-crema pb-24 sm:pb-10">
      <AuthenticatedHeader active="explore" />

      <main className="container max-w-6xl space-y-6 py-6 sm:py-10">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-espresso sm:text-3xl">Explore</h1>
          <p className="text-sm text-charcoal/60">Where should you get coffee?</p>
        </div>

        <ExploreClient initialResults={initialResults} regionLabel={region.label} upNextGoal={upNextGoal} />
      </main>
    </div>
  );
}
