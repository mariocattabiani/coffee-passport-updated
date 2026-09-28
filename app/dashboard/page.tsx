import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Coffee, MapPin, Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type { Profile, BeverageCategory, Temperature } from "@/lib/supabase/types";
import { AuthenticatedHeader } from "@/components/dashboard/authenticated-header";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { StatCard } from "@/components/dashboard/stat-card";
import { ComingSoonStrip } from "@/components/dashboard/coming-soon-strip";
import { RecentActivity } from "@/components/logs/recent-activity";
import { ContinueYourPassport } from "@/components/dashboard/continue-your-passport";
import { ExploreCta } from "@/components/dashboard/explore-cta";
import { getEarnedAchievements } from "@/lib/passport/actions";
import { computeAchievementProgress, derivePassportAchievementStats, selectUpNext } from "@/lib/passport/achievements";
import { signDrinkPhotoPaths } from "@/lib/storage/sign-photos";
import type { LogCardData } from "@/components/logs/log-card";

export const metadata: Metadata = {
  title: "Dashboard | Coffee Passport",
};

interface RecentLogRow {
  id: string;
  shop_id: string;
  beverage_category: BeverageCategory;
  drink_rating: number;
  shop_rating: number;
  caption: string | null;
  photo_url: string | null;
  photo_position_x: number | null;
  photo_position_y: number | null;
  price: number | null;
  size: string | null;
  temperature: Temperature | null;
  created_at: string;
  logged_at: string;
  shop: { name: string; city: string | null; state: string | null } | null;
  drink: { name: string } | null;
}

interface AchievementLogRow {
  shop_id: string;
  beverage_category: BeverageCategory;
  drink_rating: number;
  caption: string | null;
  photo_url: string | null;
  temperature: Temperature | null;
  shop: {
    location_id: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
  drink: { name: string } | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // profile, the stats query, and the recent-logs query are all
  // independent of each other (none needs another's result, only
  // user.id, already resolved above), so they run in parallel.
  //
  // Achievement evaluation deliberately does NOT run here anymore.
  // evaluate_passport_achievements() is now a write-time side effect of
  // createDrinkLog/updateDrinkLog (see lib/drink-logs/actions.ts) —
  // Dashboard only ever READS what's already been evaluated, via
  // getEarnedAchievements() below. See the Achievement Performance
  // Remediation report for the full rationale: the old design re-ran
  // the full evaluator on every Dashboard/Explore/Passport/Stamps
  // visit even when nothing had changed since the last one.
  const [{ data: profile }, { data: statRows }, { data: recentRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    supabase
      .from("drink_logs")
      .select(
        "shop_id, beverage_category, drink_rating, caption, photo_url, temperature, shop:shops(location_id,city,state,country), drink:drinks(name)"
      )
      .eq("user_id", user.id)
      .returns<AchievementLogRow[]>(),
    supabase
      .from("drink_logs")
      .select(
        "id, shop_id, beverage_category, drink_rating, shop_rating, caption, photo_url, photo_position_x, photo_position_y, price, size, temperature, created_at, logged_at, shop:shops(name,city,state), drink:drinks(name)"
      )
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<RecentLogRow[]>(),
  ]);

  const allLogs = statRows ?? [];
  const coffeesLogged = allLogs.filter((l) => l.beverage_category === "coffee").length;
  const teasLogged = allLogs.filter((l) => l.beverage_category === "tea").length;
  const cafesVisited = new Set(allLogs.map((l) => l.shop_id)).size;
  const uniqueDrinks = new Set(allLogs.map((l) => l.drink?.name?.trim().toLowerCase()).filter(Boolean)).size;

  const earnedAchievements = await getEarnedAchievements();
  const achievementProgress = computeAchievementProgress(
    derivePassportAchievementStats(allLogs),
    earnedAchievements
  );
  const closestGoal = selectUpNext(achievementProgress)[0] ?? null;

  const recent = recentRows ?? [];

  // Resolve one signed URL per photo in a single batch call, the bucket
  // is private, so a raw photo_url path can't be rendered directly.
  const signedUrlByPath = await signDrinkPhotoPaths(
    supabase,
    recent.map((r) => r.photo_url),
    3600
  );

  const recentLogs: LogCardData[] = recent.map((r) => ({
    id: r.id,
    shopId: r.shop_id,
    shopName: r.shop?.name ?? "Unknown shop",
    shopCity: r.shop?.city ?? null,
    shopState: r.shop?.state ?? null,
    drinkName: r.drink?.name ?? "Unknown drink",
    beverageCategory: r.beverage_category,
    drinkRating: r.drink_rating,
    shopRating: r.shop_rating,
    caption: r.caption,
    photoUrl: r.photo_url ? signedUrlByPath.get(r.photo_url) ?? null : null,
    photoPath: r.photo_url,
    photoPositionX: r.photo_position_x,
    photoPositionY: r.photo_position_y,
    price: r.price,
    size: r.size,
    temperature: r.temperature,
    createdAt: r.created_at,
    loggedAt: r.logged_at,
  }));

  const firstName = profile?.first_name || "there";

  return (
    <div className="min-h-dvh bg-crema pb-24 lg:pb-10">
      <AuthenticatedHeader active="dashboard" />

      <main className="container max-w-5xl space-y-8 py-6 sm:space-y-10 sm:py-10">
        <DashboardHero firstName={firstName} />

        <div className="grid gap-4 sm:grid-cols-2">
          <ExploreCta />
          <ContinueYourPassport goal={closestGoal} />
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <StatCard
            icon={Coffee}
            value={coffeesLogged}
            label="Coffees logged"
            tint="espresso"
            secondary={teasLogged > 0 ? `+${teasLogged} teas logged` : undefined}
          />
          <StatCard icon={MapPin} value={cafesVisited} label="Cafés explored" tint="latte" />
          <StatCard icon={Sparkles} value={uniqueDrinks} label="Unique drinks" tint="sage" />
        </div>

        {/* RECENT ACTIVITY */}
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-xl font-semibold text-espresso">Recent coffees</h2>
              <p className="text-sm text-charcoal/50">Your latest cups and café visits</p>
            </div>
            <Link
              href="/passport"
              className="shrink-0 text-sm font-medium text-sage hover:text-espresso"
            >
              View your Passport
            </Link>
          </div>
          <RecentActivity initialLogs={recentLogs} />
        </section>

        {/* FUTURE FEATURES, deliberately understated */}
        <section className="border-t border-border/60 pt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/40">
            Coming soon
          </p>
          <ComingSoonStrip />
        </section>
      </main>
    </div>
  );
}
