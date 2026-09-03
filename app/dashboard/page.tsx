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
import { evaluatePassportAchievements, getEarnedAchievements } from "@/lib/passport/actions";
import { computeAchievementProgress, selectUpNext } from "@/lib/passport/achievements";
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  // Lightweight query across every log, just for the stat tiles. Counts
  // are computed here in code rather than a stored counter or a
  // database view, this is plenty fast at this scale and stays
  // trivially correct as logs are added, edited, or removed. Shop
  // city/state is embedded here too now, still one query, so the
  // Continue Your Passport card can consider a city-based goal the
  // same way Passport itself does.
  const { data: statRows } = await supabase
    .from("drink_logs")
    .select("shop_id, drink_id, beverage_category, shop:shops(city,state)")
    .eq("user_id", user.id)
    .returns<
      {
        shop_id: string;
        drink_id: string;
        beverage_category: BeverageCategory;
        shop: { city: string | null; state: string | null } | null;
      }[]
    >();

  const allLogs = statRows ?? [];
  const coffeesLogged = allLogs.filter((l) => l.beverage_category === "coffee").length;
  const teasLogged = allLogs.filter((l) => l.beverage_category === "tea").length;
  const cafesVisited = new Set(allLogs.map((l) => l.shop_id)).size;
  const uniqueDrinks = new Set(allLogs.map((l) => l.drink_id)).size;

  // Evaluate before reading: the person may have just been redirected
  // here straight from creating a log that crossed a threshold, if we
  // read earned achievements first, Dashboard could show "0 more until
  // Coffee 25" for something already qualified for but not yet
  // persisted. This RPC is idempotent and constraint-backed, so calling
  // it here in addition to Passport's own call is safe, this is a
  // second, not exclusive, evaluation point.
  await evaluatePassportAchievements();
  const earnedAchievements = await getEarnedAchievements();
  const achievementProgress = computeAchievementProgress(
    {
      totalLogs: allLogs.length,
      coffeeLogs: coffeesLogged,
      uniqueShops: cafesVisited,
      uniqueCities: new Set(
        allLogs
          .filter((l) => l.shop?.city && l.shop?.state)
          .map((l) => `${l.shop!.city!.toLowerCase().trim()}|${l.shop!.state!.toLowerCase().trim()}`)
      ).size,
      teaLogs: teasLogged,
    },
    earnedAchievements
  );
  const closestGoal = selectUpNext(achievementProgress)[0] ?? null;

  const { data: recentRows } = await supabase
    .from("drink_logs")
    .select(
      "id, shop_id, beverage_category, drink_rating, shop_rating, caption, photo_url, photo_position_x, photo_position_y, price, size, temperature, created_at, logged_at, shop:shops(name,city,state), drink:drinks(name)"
    )
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<RecentLogRow[]>();

  const recent = recentRows ?? [];

  // Resolve one signed URL per photo in a single batch call, the bucket
  // is private, so a raw photo_url path can't be rendered directly.
  const photoPaths = recent.map((r) => r.photo_url).filter((p): p is string => !!p);
  const signedUrlByPath = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("drink-photos")
      .createSignedUrls(photoPaths, 3600);
    signed?.forEach((s) => {
      if (s.signedUrl && !s.error) signedUrlByPath.set(s.path ?? "", s.signedUrl);
    });
  }

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
    <div className="min-h-screen bg-crema pb-24 sm:pb-10">
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
