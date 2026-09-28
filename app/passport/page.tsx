import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import type { Profile, BeverageCategory, Temperature } from "@/lib/supabase/types";
import { AuthenticatedHeader } from "@/components/dashboard/authenticated-header";
import { PassportHeader } from "@/components/passport/passport-header";
import { PassportLibraryLinks } from "@/components/passport/passport-library-links";
import { TravelMap } from "@/components/maps/travel-map";
import { FavoritesSection, type FavoriteSummary } from "@/components/passport/favorites-section";
import { PassportStyleSummary } from "@/components/passport/passport-style-summary";
import { PassportHistory } from "@/components/passport/passport-history";
import { PassportEmptyState } from "@/components/passport/passport-empty-state";
import { UpNext } from "@/components/passport/up-next";
import { Stamps } from "@/components/passport/stamps";
import { PlacesExplored } from "@/components/passport/places-explored";
import { getEarnedAchievements } from "@/lib/passport/actions";
import { getMySaves } from "@/lib/profile/saved-actions";
import { getFriendCount } from "@/lib/friends/actions";
import {
  computeAchievementProgress,
  computePlacesExplored,
  derivePassportAchievementStats,
  selectUpNext,
  toStampDisplayItems,
} from "@/lib/passport/achievements";
import {
  derivePassportBasicStats,
  deriveEarliestLoggedAt,
  deriveFavoriteDrink,
  deriveFavoriteShop,
  derivePassportLocationMap,
  deriveTemperaturePreference,
} from "@/lib/passport/passport-stats";
import { signDrinkPhotoPaths } from "@/lib/storage/sign-photos";
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
  temperature: Temperature | null;
  created_at: string;
  logged_at: string;
  shop: {
    name: string;
    location_id: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
    location: { id: string; city: string; region: string | null; country: string; latitude: number; longitude: number } | null;
  } | null;
  drink: { name: string } | null;
}

export default async function PassportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // profile, the full log history, and saved items are all
  // independent of each other (nothing here needs another's result,
  // only user.id, already resolved above) — previously profile was
  // awaited on its own before this Promise.all, forcing one full
  // extra round trip for no reason. One query for everything log-
  // related: stats, favorites, and the full history list are all
  // derived from this same rows result, no matter how the page uses
  // it. Want to Try's count on this page needs the same
  // get_my_saves() the dedicated Want to Try page and the self-profile
  // Saved tab already call, not a second, parallel counting mechanism.
  const [{ data: profile }, { data: rows }, savedItems, friendCount] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    supabase
      .from("drink_logs")
      .select(
        "id, shop_id, drink_id, beverage_category, drink_rating, shop_rating, caption, photo_url, photo_position_x, photo_position_y, temperature, created_at, logged_at, shop:shops(name,location_id,city,state,country,latitude,longitude,location:locations(id,city,region,country,latitude,longitude)), drink:drinks(name)"
      )
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<FullLogRow[]>(),
    getMySaves(),
    getFriendCount(user.id),
  ]);

  const logs = rows ?? [];

  // Resolve every photo in one batched call, whether it ends up used in
  // the history grid or reused as a favorite's thumbnail below.
  const signedUrlByPath = await signDrinkPhotoPaths(
    supabase,
    logs.map((l) => l.photo_url),
    3600
  );

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
    // Not selected above: Passport's own grid tile (PassportLogGrid ->
    // CoffeeLogGridTile) never renders price/size — they were only
    // ever consumed by the older long-card LogCard presentation, which
    // Passport no longer uses. LogCardData still requires the fields
    // (LogCard itself, used elsewhere — Dashboard, the shop page's own
    // history — still renders them there, so the shared type keeps
    // them), so they're supplied as null here specifically, not
    // removed from the type. Trims two columns off what was
    // potentially a large multi-hundred-row query for an active user.
    price: null,
    size: null,
    temperature: l.temperature,
    createdAt: l.created_at,
    loggedAt: l.logged_at,
  }));

  // STATS
  const { coffeesLogged, teasLogged, cafesExplored } = derivePassportBasicStats(logs);

  // FAVORITES, HOT VS ICED: the underlying calculations moved to
  // lib/passport/passport-stats.ts (deriveFavoriteDrink,
  // deriveFavoriteShop, deriveTemperaturePreference) — same ranking,
  // same tie-breaks, same representative-photo-by-normalized-name
  // matching, unchanged. Pure functions can't create a signed URL
  // (that needs this page's own server-side Supabase client), so
  // deriveFavoriteDrink returns the winning log's raw Storage path
  // instead, resolved against signedUrlByPath here exactly as before.
  const favoriteDrinkResult = deriveFavoriteDrink(logs);
  const favoriteDrink: FavoriteSummary | null = favoriteDrinkResult
    ? {
        title: favoriteDrinkResult.title,
        subtitle: favoriteDrinkResult.subtitle,
        rating: favoriteDrinkResult.rating,
        photoUrl: favoriteDrinkResult.photoPath
          ? signedUrlByPath.get(favoriteDrinkResult.photoPath) ?? null
          : null,
        photoPositionX: favoriteDrinkResult.photoPositionX,
        photoPositionY: favoriteDrinkResult.photoPositionY,
        logCount: favoriteDrinkResult.logCount,
      }
    : null;

  const favoriteShopResult = deriveFavoriteShop(logs);
  const favoriteShop: FavoriteSummary | null = favoriteShopResult
    ? {
        title: favoriteShopResult.title,
        subtitle: favoriteShopResult.subtitle,
        rating: favoriteShopResult.rating,
        photoUrl: null,
        logCount: favoriteShopResult.logCount,
        shopId: favoriteShopResult.shopId,
      }
    : null;

  const hotIced = deriveTemperaturePreference(logs);

  // COFFEE MAP: aggregated by CANONICAL LOCATION (city), not by
  // individual shop — the full derivation, tie-breaks, and the
  // location_id-only inclusion rule live in
  // lib/passport/passport-stats.ts's derivePassportLocationMap now;
  // see that function's own comment for the "why" (matches the "one
  // dot per city" product direction, and the PA/Virginia Beach/Italy
  // bug this shape specifically fixes).
  const { points: mapPoints, cafeCount: mapCafeCount } = derivePassportLocationMap(logs);

  const hasLogs = logs.length > 0;

  // ACHIEVEMENTS: evaluate_passport_achievements() no longer runs here.
  // It now runs as a write-time side effect of createDrinkLog /
  // updateDrinkLog (see lib/drink-logs/actions.ts) — by the time a log
  // exists for this page to read, it has already been evaluated once,
  // there. Passport (like Dashboard, Explore, and Passport/Stamps) is a
  // pure read here: earned achievements plus progress derived from the
  // current log history, never a trigger for evaluation itself.
  const earnedAchievements = await getEarnedAchievements();

  const achievementStats = derivePassportAchievementStats(logs);
  const uniqueCitiesCount = achievementStats.uniqueCities;
  const achievementProgress = computeAchievementProgress(achievementStats, earnedAchievements);
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
  const earliestLoggedAt = deriveEarliestLoggedAt(logs);

  // Map-specific city count is now simply mapPoints.length: since
  // mapPoints is already aggregated one-row-per-canonical-location,
  // there's no separate coordinate-only subset to re-derive anymore —
  // this is exactly the fix for the "Cities count and Map count can
  // disagree" problem, on the owner side too, not just public
  // profiles: there is only one aggregation now, not two.

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-clip bg-crema pb-24 lg:pb-10">
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
                  friendsCount: friendCount,
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
                {mapPoints.length > 0 && (
                  <p className="mt-1 text-sm text-charcoal/60">
                    {mapCafeCount} {mapCafeCount === 1 ? "café" : "cafés"} across {mapPoints.length}{" "}
                    {mapPoints.length === 1 ? "city" : "cities"}
                  </p>
                )}
              </div>
              <TravelMap points={mapPoints} />
              {mapPoints.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-white/50 p-6 text-center">
                  <p className="text-sm text-charcoal/50">No mapped locations yet.</p>
                </div>
              )}
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
