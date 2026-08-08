import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Coffee, MapPin, Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type { Profile, BeverageCategory, Temperature } from "@/lib/supabase/types";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { StatCard } from "@/components/dashboard/stat-card";
import { ComingSoonStrip } from "@/components/dashboard/coming-soon-strip";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { RecentActivity } from "@/components/logs/recent-activity";
import type { LogCardData } from "@/components/logs/log-card";

export const metadata: Metadata = {
  title: "Dashboard | Coffee Passport",
};

interface RecentLogRow {
  id: string;
  drink_rating: number;
  shop_rating: number;
  caption: string | null;
  photo_url: string | null;
  price: number | null;
  size: string | null;
  temperature: Temperature | null;
  created_at: string;
  shop: { name: string } | null;
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
  // trivially correct as logs are added, edited, or removed.
  const { data: statRows } = await supabase
    .from("drink_logs")
    .select("shop_id, drink_id, beverage_category")
    .eq("user_id", user.id)
    .returns<{ shop_id: string; drink_id: string; beverage_category: BeverageCategory }[]>();

  const allLogs = statRows ?? [];
  const coffeesLogged = allLogs.filter((l) => l.beverage_category === "coffee").length;
  const teasLogged = allLogs.filter((l) => l.beverage_category === "tea").length;
  const cafesVisited = new Set(allLogs.map((l) => l.shop_id)).size;
  const uniqueDrinks = new Set(allLogs.map((l) => l.drink_id)).size;

  const { data: recentRows } = await supabase
    .from("drink_logs")
    .select(
      "id, drink_rating, shop_rating, caption, photo_url, price, size, temperature, created_at, shop:shops(name), drink:drinks(name)"
    )
    .eq("user_id", user.id)
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
    shopName: r.shop?.name ?? "Unknown shop",
    drinkName: r.drink?.name ?? "Unknown drink",
    drinkRating: r.drink_rating,
    shopRating: r.shop_rating,
    caption: r.caption,
    photoUrl: r.photo_url ? signedUrlByPath.get(r.photo_url) ?? null : null,
    photoPath: r.photo_url,
    price: r.price,
    size: r.size,
    temperature: r.temperature,
    createdAt: r.created_at,
  }));

  const firstName = profile?.first_name || "there";

  return (
    <div className="min-h-screen bg-crema">
      <header className="border-b border-border/40">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-espresso" />
            <span className="font-heading text-lg font-semibold text-espresso">Coffee Passport</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="container max-w-5xl space-y-8 py-6 sm:space-y-10 sm:py-10">
        <DashboardHero firstName={firstName} />

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
          <div className="mb-4">
            <h2 className="font-heading text-xl font-semibold text-espresso">Recent coffees</h2>
            <p className="text-sm text-charcoal/50">Your latest cups and café visits</p>
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
