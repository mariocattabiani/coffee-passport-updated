import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import type { Profile, BeverageCategory, Temperature } from "@/lib/supabase/types";
import { AuthenticatedHeader } from "@/components/dashboard/authenticated-header";
import { PassportHeader } from "@/components/passport/passport-header";
import { FavoritesSection, type FavoriteSummary } from "@/components/passport/favorites-section";
import { PassportHistory } from "@/components/passport/passport-history";
import { PassportEmptyState } from "@/components/passport/passport-empty-state";
import type { LogCardData } from "@/components/logs/log-card";

export const metadata: Metadata = {
  title: "Passport | Coffee Passport",
};

interface FullLogRow {
  id: string;
  shop_id: string;
  drink_id: string;
  beverage_category: BeverageCategory;
  drink_rating: number;
  shop_rating: number;
  caption: string | null;
  photo_url: string | null;
  price: number | null;
  size: string | null;
  temperature: Temperature | null;
  created_at: string;
  shop: { name: string; city: string | null; state: string | null } | null;
  drink: { name: string } | null;
}

interface Aggregate {
  key: string;
  name: string;
  subtitle: string;
  count: number;
  ratingSum: number;
  photoUrl: string | null;
}

export default async function PassportPage() {
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

  // One query for everything: stats, favorites, and the full history
  // list are all derived from this same result, so there's exactly one
  // round trip for the user's log data, no matter how the page uses it.
  const { data: rows } = await supabase
    .from("drink_logs")
    .select(
      "id, shop_id, drink_id, beverage_category, drink_rating, shop_rating, caption, photo_url, price, size, temperature, created_at, shop:shops(name,city,state), drink:drinks(name)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<FullLogRow[]>();

  const logs = rows ?? [];

  // Resolve every photo in one batched call, whether it ends up used in
  // the history grid or reused as a favorite's thumbnail below.
  const photoPaths = logs.map((l) => l.photo_url).filter((p): p is string => !!p);
  const signedUrlByPath = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("drink-photos")
      .createSignedUrls(photoPaths, 3600);
    signed?.forEach((s) => {
      if (s.signedUrl && !s.error) signedUrlByPath.set(s.path ?? "", s.signedUrl);
    });
  }

  const historyLogs: LogCardData[] = logs.map((l) => ({
    id: l.id,
    shopName: l.shop?.name ?? "Unknown shop",
    drinkName: l.drink?.name ?? "Unknown drink",
    beverageCategory: l.beverage_category,
    drinkRating: l.drink_rating,
    shopRating: l.shop_rating,
    caption: l.caption,
    photoUrl: l.photo_url ? signedUrlByPath.get(l.photo_url) ?? null : null,
    photoPath: l.photo_url,
    price: l.price,
    size: l.size,
    temperature: l.temperature,
    createdAt: l.created_at,
  }));

  // STATS
  const coffeesLogged = logs.filter((l) => l.beverage_category === "coffee").length;
  const teasLogged = logs.filter((l) => l.beverage_category === "tea").length;
  const cafesExplored = new Set(logs.map((l) => l.shop_id)).size;
  const uniqueDrinks = new Set(logs.map((l) => l.drink_id)).size;
  const avgDrinkRating =
    logs.length > 0
      ? Math.round((logs.reduce((sum, l) => sum + l.drink_rating, 0) / logs.length) * 10) / 10
      : 0;

  // FAVORITES: most-logged wins, tie-broken by average rating, then
  // alphabetically, so the result is always deterministic. Logs are
  // already newest-first from the query above, so the first photo found
  // for a given drink or shop is already its most recent one.
  function buildAggregate(
    getKey: (l: FullLogRow) => string,
    getName: (l: FullLogRow) => string,
    getSubtitle: (l: FullLogRow) => string,
    getRating: (l: FullLogRow) => number
  ): Aggregate | null {
    const map = new Map<string, Aggregate>();
    for (const l of logs) {
      const key = getKey(l);
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.ratingSum += getRating(l);
        if (l.photo_url && !existing.photoUrl) {
          existing.photoUrl = signedUrlByPath.get(l.photo_url) ?? null;
        }
      } else {
        map.set(key, {
          key,
          name: getName(l),
          subtitle: getSubtitle(l),
          count: 1,
          ratingSum: getRating(l),
          photoUrl: l.photo_url ? signedUrlByPath.get(l.photo_url) ?? null : null,
        });
      }
    }
    const sorted = [...map.values()].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const avgA = a.ratingSum / a.count;
      const avgB = b.ratingSum / b.count;
      if (avgB !== avgA) return avgB - avgA;
      return a.name.localeCompare(b.name);
    });
    return sorted[0] ?? null;
  }

  const favoriteDrinkAgg = buildAggregate(
    (l) => l.drink_id,
    (l) => l.drink?.name ?? "Unknown drink",
    (l) => l.shop?.name ?? "",
    (l) => l.drink_rating
  );
  const favoriteShopAgg = buildAggregate(
    (l) => l.shop_id,
    (l) => l.shop?.name ?? "Unknown shop",
    (l) => [l.shop?.city, l.shop?.state].filter(Boolean).join(", "),
    (l) => l.shop_rating
  );

  const favoriteDrink: FavoriteSummary | null = favoriteDrinkAgg
    ? {
        title: favoriteDrinkAgg.name,
        subtitle: favoriteDrinkAgg.subtitle,
        rating: Math.round((favoriteDrinkAgg.ratingSum / favoriteDrinkAgg.count) * 10) / 10,
        photoUrl: favoriteDrinkAgg.photoUrl,
      }
    : null;
  const favoriteShop: FavoriteSummary | null = favoriteShopAgg
    ? {
        title: favoriteShopAgg.name,
        subtitle: favoriteShopAgg.subtitle,
        rating: Math.round((favoriteShopAgg.ratingSum / favoriteShopAgg.count) * 10) / 10,
        photoUrl: favoriteShopAgg.photoUrl,
        logCount: favoriteShopAgg.count,
        // No canonical shop image data source exists yet (that's the
        // future Places/map work), left explicitly null rather than
        // omitted so the intent is clear at the call site.
        canonicalImageUrl: null,
      }
    : null;

  // HOT VS ICED: only from logs where temperature was actually set.
  const tempLogs = logs.filter((l) => l.temperature !== null);
  const hotCount = tempLogs.filter((l) => l.temperature === "hot").length;
  const hotIced =
    tempLogs.length > 0
      ? {
          hotPercent: Math.round((hotCount / tempLogs.length) * 100),
          icedPercent: Math.round(((tempLogs.length - hotCount) / tempLogs.length) * 100),
        }
      : null;

  const hasLogs = logs.length > 0;

  return (
    <div className="min-h-screen bg-crema pb-24 sm:pb-10">
      <AuthenticatedHeader active="passport" />

      <main className="container max-w-5xl space-y-8 py-6 sm:space-y-10 sm:py-10">
        <PassportHeader
          profile={profile}
          stats={
            hasLogs
              ? { coffeesLogged, teasLogged, cafesExplored, uniqueDrinks, avgDrinkRating }
              : null
          }
        />

        {hasLogs ? (
          <>
            <FavoritesSection favoriteDrink={favoriteDrink} favoriteShop={favoriteShop} hotIced={hotIced} />

            <PassportHistory initialLogs={historyLogs} />
          </>
        ) : (
          <PassportEmptyState />
        )}
      </main>
    </div>
  );
}
