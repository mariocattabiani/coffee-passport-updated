import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import type { Profile, BeverageCategory, Temperature } from "@/lib/supabase/types";
import { AuthenticatedHeader } from "@/components/dashboard/authenticated-header";
import { PassportHeader } from "@/components/passport/passport-header";
import { PassportLibraryLinks } from "@/components/passport/passport-library-links";
import { CoffeeMap, type MapShop } from "@/components/passport/coffee-map";
import { FavoritesSection, type FavoriteSummary } from "@/components/passport/favorites-section";
import { PassportStyleSummary } from "@/components/passport/passport-style-summary";
import { PassportHistory } from "@/components/passport/passport-history";
import { PassportEmptyState } from "@/components/passport/passport-empty-state";
import { UpNext } from "@/components/passport/up-next";
import { Stamps } from "@/components/passport/stamps";
import { PlacesExplored } from "@/components/passport/places-explored";
import { evaluatePassportAchievements, getEarnedAchievements } from "@/lib/passport/actions";
import { getMySaves } from "@/lib/profile/saved-actions";
import {
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
  photo_position_x: number | null;
  photo_position_y: number | null;
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
  // Fetched in parallel with the user's saves — Want to Try's count on
  // this page needs the same get_my_saves() the dedicated Want to Try
  // page and the self-profile Saved tab already call, not a second,
  // parallel counting mechanism.
  const [{ data: rows }, savedItems] = await Promise.all([
    supabase
      .from("drink_logs")
      .select(
        "id, shop_id, drink_id, beverage_category, drink_rating, shop_rating, caption, photo_url, photo_position_x, photo_position_y, price, size, temperature, created_at, logged_at, shop:shops(name,city,state,latitude,longitude), drink:drinks(name)"
      )
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<FullLogRow[]>(),
    getMySaves(),
  ]);

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
    shopCity: l.shop?.city ?? null,
    shopState: l.shop?.state ?? null,
    drinkName: l.drink?.name ?? "Unknown drink",
    beverageCategory: l.beverage_category,
    drinkRating: l.drink_rating,
    shopRating: l.shop_rating,
    caption: l.caption,
    photoUrl: l.photo_url ? signedUrlByPath.get(l.photo_url) ?? null : null,
    photoPath: l.photo_url,
    photoPositionX: l.photo_position_x,
    photoPositionY: l.photo_position_y,
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
  // alphabetically, so the result is always deterministic. This
  // aggregate only ranks winners (key/count/rating) — it deliberately
  // does not track photos/subtitle-of-record for the favorite drink
  // anymore; see favoriteDrinkLog below for why that has to be looked
  // up separately, from the specific representative log, rather than
  // "whichever log happened to be scanned first".
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
      } else {
        map.set(key, {
          key,
          name: getName(l),
          subtitle: getSubtitle(l),
          count: 1,
          ratingSum: getRating(l),
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

  // The favorite drink's representative log is looked up separately
  // from the ranking aggregate above, deliberately: buildAggregate's
  // own photoUrl is "the first photo found while scanning newest-
  // first", but its subtitle (café name) is fixed to whichever log
  // was encountered FIRST for that drink_id, which is the most recent
  // log overall, not necessarily the one that supplied the photo. If
  // the newest log of a favorite drink has no photo but an older one
  // does, the two would silently mismatch — a photo from café A shown
  // next to café B's name. logs is already sorted newest-first (see
  // the query above), so .find() naturally returns the most recent
  // match for each rule below, with no extra query.
  //
  // Matched by NORMALIZED DRINK NAME, not drink_id: public.drinks is
  // shop-scoped (shop_id not null — see drink_logging_schema.sql), so
  // "Green Tea" logged at two different cafés is genuinely two
  // different drink_id rows. favoriteDrinkAgg's WINNING key is still
  // exactly one of those drink_id rows (favorite-drink calculation is
  // unchanged), but restricting the representative-photo search to
  // that one drink_id would miss real photos of the same drink logged
  // at a different café — exactly the bug this fixes. Matching by name
  // instead finds any log of the same drink the user actually
  // recognizes as "their favorite", regardless of which café's
  // specific drink record produced it.
  const favoriteDrinkName = favoriteDrinkAgg?.name.trim().toLowerCase() ?? null;
  const favoriteDrinkLog = favoriteDrinkName
    ? logs.find((l) => (l.drink?.name ?? "").trim().toLowerCase() === favoriteDrinkName && l.photo_url) ??
      logs.find((l) => (l.drink?.name ?? "").trim().toLowerCase() === favoriteDrinkName) ??
      null
    : null;

  const favoriteDrink: FavoriteSummary | null = favoriteDrinkAgg
    ? {
        title: favoriteDrinkAgg.name,
        subtitle: favoriteDrinkLog?.shop?.name ?? favoriteDrinkAgg.subtitle,
        rating: Math.round((favoriteDrinkAgg.ratingSum / favoriteDrinkAgg.count) * 10) / 10,
        photoUrl: favoriteDrinkLog?.photo_url
          ? signedUrlByPath.get(favoriteDrinkLog.photo_url) ?? null
          : null,
        photoPositionX: favoriteDrinkLog?.photo_position_x ?? null,
        photoPositionY: favoriteDrinkLog?.photo_position_y ?? null,
        logCount: favoriteDrinkAgg.count,
      }
    : null;
  const favoriteShop: FavoriteSummary | null = favoriteShopAgg
    ? {
        title: favoriteShopAgg.name,
        subtitle: favoriteShopAgg.subtitle,
        rating: Math.round((favoriteShopAgg.ratingSum / favoriteShopAgg.count) * 10) / 10,
        photoUrl: null,
        logCount: favoriteShopAgg.count,
        shopId: favoriteShopAgg.key,
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

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-crema pb-24 sm:pb-10">
      <AuthenticatedHeader active="passport" />

      <main className="container max-w-5xl min-w-0 space-y-6 py-6 sm:space-y-8 sm:py-10">
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
        />

        {/*
          Unconditional, even when hasLogs is false: Want to Try can be
          non-zero before someone has logged a single coffee — the
          product loop starts at Discover -> Save, well before
          Visit -> Log -> Passport — so this row would hide real,
          useful state for exactly the new users it's meant to guide
          if it were nested inside the hasLogs branch below.
        */}
        <PassportLibraryLinks beenCount={cafesExplored} wantToTryCount={savedItems.length} />

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

            <FavoritesSection favoriteDrink={favoriteDrink} favoriteShop={favoriteShop} />

            <PassportStyleSummary data={hotIced} />

            <PassportHistory initialLogs={historyLogs} />
          </>
        ) : (
          <PassportEmptyState />
        )}
      </main>
    </div>
  );
}
