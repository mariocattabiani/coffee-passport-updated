import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import type { Profile, BeverageCategory, Temperature } from "@/lib/supabase/types";
import { AuthenticatedHeader } from "@/components/dashboard/authenticated-header";
import { PassportHeader } from "@/components/passport/passport-header";
import { CoffeeMap, type MapShop } from "@/components/passport/coffee-map";
import { FavoritesSection, type FavoriteSummary } from "@/components/passport/favorites-section";
import { PassportHistory } from "@/components/passport/passport-history";
import { PassportEmptyState } from "@/components/passport/passport-empty-state";
import { UpNext } from "@/components/passport/up-next";
import { Stamps } from "@/components/passport/stamps";
import { PlacesExplored } from "@/components/passport/places-explored";
import { evaluatePassportAchievements, getEarnedAchievements } from "@/lib/passport/actions";
import {
  ACHIEVEMENT_DEFINITIONS,
  computeAchievementProgress,
  computePlacesExplored,
  selectUpNext,
  toStampDisplayItems,
} from "@/lib/passport/achievements";
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
  logged_at: string;
  shop: { name: string; city: string | null; state: string | null; latitude: number | null; longitude: number | null } | null;
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
      "id, shop_id, drink_id, beverage_category, drink_rating, shop_rating, caption, photo_url, price, size, temperature, created_at, logged_at, shop:shops(name,city,state,latitude,longitude), drink:drinks(name)"
    )
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
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
    shopId: l.shop_id,
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
    loggedAt: l.logged_at,
  }));

  // STATS
  const coffeesLogged = logs.filter((l) => l.beverage_category === "coffee").length;
  const teasLogged = logs.filter((l) => l.beverage_category === "tea").length;
  const cafesExplored = new Set(logs.map((l) => l.shop_id)).size;

  // FAVORITES: most-logged wins, tie-broken by average rating, then
  // alphabetically, so the result is always deterministic. Logs are
  // already ordered newest-logged-first (by logged_at) from the query
  // above, so the first photo found for a given drink or shop is the
  // one from its most recently *had* occurrence, not merely the most
  // recently entered row.
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
        shopId: favoriteShopAgg.key,
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

  // COFFEE MAP: unique visited shops that have real coordinates. Old
  // seed shops (no lat/lng) are simply excluded here, no Google call is
  // ever made to try to "fill in" a location for them.
  interface ShopMapAgg extends MapShop {
    ratingSum: number;
  }
  const shopMapAggMap = new Map<string, ShopMapAgg>();
  for (const l of logs) {
    if (l.shop?.latitude == null || l.shop?.longitude == null) continue;
    const existing = shopMapAggMap.get(l.shop_id);
    if (existing) {
      existing.visitCount += 1;
      existing.ratingSum += l.shop_rating;
    } else {
      shopMapAggMap.set(l.shop_id, {
        id: l.shop_id,
        name: l.shop.name,
        city: l.shop.city,
        state: l.shop.state,
        latitude: l.shop.latitude,
        longitude: l.shop.longitude,
        visitCount: 1,
        ratingSum: l.shop_rating,
        avgShopRating: 0,
      });
    }
  }
  const mapShops: MapShop[] = [...shopMapAggMap.values()].map((s) => ({
    id: s.id,
    name: s.name,
    city: s.city,
    state: s.state,
    latitude: s.latitude,
    longitude: s.longitude,
    visitCount: s.visitCount,
    avgShopRating: Math.round((s.ratingSum / s.visitCount) * 10) / 10,
  }));

  const hasLogs = logs.length > 0;

  // ACHIEVEMENTS: evaluate_passport_achievements() independently
  // re-derives qualification from drink_logs itself server-side, this
  // call never sends an achievement key, there's nothing here for a
  // client to manipulate. Runs on every Passport visit, idempotent via
  // the unique constraint, so a normal repeat visit with nothing newly
  // earned is a harmless no-op.
  if (hasLogs) {
    await evaluatePassportAchievements();
  }
  const earnedAchievements = await getEarnedAchievements();

  const teaLogsCount = logs.filter((l) => l.beverage_category === "tea").length;
  const uniqueCitiesCount = new Set(
    logs
      .filter((l) => l.shop?.city && l.shop?.state)
      .map((l) => `${l.shop!.city!.toLowerCase().trim()}|${l.shop!.state!.toLowerCase().trim()}`)
  ).size;
  const achievementProgress = computeAchievementProgress(
    {
      totalLogs: logs.length,
      coffeeLogs: coffeesLogged,
      uniqueShops: cafesExplored,
      uniqueCities: uniqueCitiesCount,
      teaLogs: teaLogsCount,
    },
    earnedAchievements
  );
  const upNextGoals = selectUpNext(achievementProgress);
  // UpNext is a server component (no "use client"), it can keep using
  // the full AchievementProgress objects directly, no serialization
  // boundary is crossed there. Stamps is a Client Component (for the
  // flip interaction), so it gets the plain, function-free display
  // shape instead.
  const stampItems = toStampDisplayItems(achievementProgress);

  const placesExplored = computePlacesExplored(
    logs.map((l) => ({ shopId: l.shop_id, city: l.shop?.city ?? null, state: l.shop?.state ?? null }))
  );

  // EXPLORING SINCE: the earliest logged_at across the user's history,
  // this is what lets a backdated log move the date earlier, falling
  // back to account creation only if there's no history at all yet.
  const earliestLoggedAt = hasLogs
    ? logs.reduce((earliest, l) => (l.logged_at < earliest ? l.logged_at : earliest), logs[0].logged_at)
    : null;

  // Map-specific city count, deliberately separate from
  // uniqueCitiesCount above: this describes exactly what's rendered on
  // the map (only shops with real coordinates), not the broader
  // exploration count used by Places Explored and the achievement
  // system, which includes every logged shop with a city regardless of
  // whether it's been geocoded.
  const mapCitiesCount = new Set(
    mapShops
      .filter((s) => s.city && s.state)
      .map((s) => `${s.city!.toLowerCase().trim()}|${s.state!.toLowerCase().trim()}`)
  ).size;

  // LATEST STAMP: the most recently earned achievement, if any, for
  // the hero's bottom element. Never fabricated, simply omitted when
  // earnedAchievements is empty.
  const latestStamp = (() => {
    let latestKey: string | null = null;
    let latestDate: string | null = null;
    earnedAchievements.forEach((earnedAt, key) => {
      if (!latestDate || earnedAt > latestDate) {
        latestDate = earnedAt;
        latestKey = key;
      }
    });
    if (!latestKey || !latestDate) return null;
    const definition = ACHIEVEMENT_DEFINITIONS.find((d) => d.key === latestKey);
    if (!definition) return null;
    return { name: definition.name, earnedAt: latestDate };
  })();

  return (
    <div className="min-h-screen bg-crema pb-24 sm:pb-10">
      <AuthenticatedHeader active="passport" />

      <main className="container max-w-5xl space-y-8 py-6 sm:space-y-10 sm:py-10">
        <PassportHeader
          profile={profile}
          stats={
            hasLogs
              ? {
                  drinksLogged: logs.length,
                  teasLogged,
                  cafesExplored,
                  citiesExplored: uniqueCitiesCount,
                  stampsEarned: earnedAchievements.size,
                }
              : null
          }
          exploringSinceDate={earliestLoggedAt}
          latestStamp={latestStamp}
        />

        {hasLogs ? (
          <>
            <section>
              <div className="mb-4">
                <h2 className="font-heading text-2xl font-semibold text-espresso sm:text-3xl">
                  Your Coffee Map
                </h2>
                {mapShops.length > 0 && (
                  <p className="mt-1 text-sm text-charcoal/60">
                    {mapShops.length} {mapShops.length === 1 ? "café" : "cafés"} across {mapCitiesCount}{" "}
                    {mapCitiesCount === 1 ? "city" : "cities"}
                  </p>
                )}
              </div>
              <CoffeeMap shops={mapShops} />
            </section>

            <PlacesExplored places={placesExplored} />

            <Stamps items={stampItems} />

            <UpNext goals={upNextGoals} />

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
