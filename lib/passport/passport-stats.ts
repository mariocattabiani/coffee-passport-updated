import type { BeverageCategory, Temperature } from "@/lib/supabase/types";

/**
 * The shape every function in this module actually reads off a drink
 * log row. Deliberately narrower than app/passport/page.tsx's own
 * FullLogRow (which also carries id, caption, created_at, and a few
 * shop fields nothing here uses) — FullLogRow satisfies this shape
 * structurally, so the page passes `logs` straight through with no
 * conversion. A future React Native client only needs to shape its
 * own fetched rows to this same subset to reuse every function below
 * as-is; it never needs to import anything from app/ or components/.
 */
export interface PassportDrinkLogRow {
  shop_id: string;
  drink_id: string;
  beverage_category: BeverageCategory;
  drink_rating: number;
  shop_rating: number;
  photo_url: string | null;
  photo_position_x: number | null;
  photo_position_y: number | null;
  temperature: Temperature | null;
  logged_at: string;
  shop: {
    name: string;
    city: string | null;
    state: string | null;
    location: {
      id: string;
      city: string;
      region: string | null;
      country: string;
      latitude: number;
      longitude: number;
    } | null;
  } | null;
  drink: { name: string } | null;
}

export interface PassportBasicStats {
  coffeesLogged: number;
  teasLogged: number;
  cafesExplored: number;
}

/** STATS: unchanged from app/passport/page.tsx — three plain counts
 *  over the full log history. */
export function derivePassportBasicStats(logs: PassportDrinkLogRow[]): PassportBasicStats {
  const coffeesLogged = logs.filter((l) => l.beverage_category === "coffee").length;
  const teasLogged = logs.filter((l) => l.beverage_category === "tea").length;
  const cafesExplored = new Set(logs.map((l) => l.shop_id)).size;
  return { coffeesLogged, teasLogged, cafesExplored };
}

interface RankedAggregate {
  key: string;
  name: string;
  subtitle: string;
  count: number;
  ratingSum: number;
}

/**
 * FAVORITES: most-logged wins, tie-broken by average rating, then
 * alphabetically, so the result is always deterministic. Shared by
 * deriveFavoriteDrink and deriveFavoriteShop below, exactly as the
 * single buildAggregate helper was shared between both call sites in
 * the original page.
 */
function rankByFrequency(
  logs: PassportDrinkLogRow[],
  getKey: (l: PassportDrinkLogRow) => string,
  getName: (l: PassportDrinkLogRow) => string,
  getSubtitle: (l: PassportDrinkLogRow) => string,
  getRating: (l: PassportDrinkLogRow) => number
): RankedAggregate | null {
  const map = new Map<string, RankedAggregate>();
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

export interface FavoriteDrinkResult {
  title: string;
  subtitle: string;
  rating: number;
  /** Raw Storage path, not a resolved URL — signing requires a
   *  server-side Supabase client, which this module deliberately
   *  never touches. The caller resolves this against whatever
   *  signed-URL map it already built for the rest of the page. */
  photoPath: string | null;
  photoPositionX: number | null;
  photoPositionY: number | null;
  logCount: number;
}

/**
 * The favorite drink's representative log is looked up separately
 * from the ranking aggregate, deliberately: the aggregate's own
 * winning entry is "the first log found while scanning newest-first"
 * for its subtitle (café name), but that isn't necessarily the log
 * that should supply the display photo. If the newest log of a
 * favorite drink has no photo but an older one does, the two would
 * silently mismatch — a photo from café A shown next to café B's
 * name. `logs` is expected already sorted newest-first (the same
 * assumption app/passport/page.tsx's own query guarantees), so
 * `.find()` naturally returns the most recent match for each rule
 * below, with no extra query.
 *
 * Matched by NORMALIZED DRINK NAME, not drink_id: public.drinks is
 * shop-scoped, so the same drink name logged at two different cafés
 * is genuinely two different drink_id rows. The aggregate's WINNING
 * key is still exactly one of those drink_id rows (the favorite-drink
 * calculation itself is unchanged), but restricting the
 * representative-photo search to that one drink_id would miss real
 * photos of the same drink logged at a different café. Matching by
 * name instead finds any log of the same drink the user actually
 * recognizes as "their favorite," regardless of which café's specific
 * drink record produced it.
 */
export function deriveFavoriteDrink(logs: PassportDrinkLogRow[]): FavoriteDrinkResult | null {
  const agg = rankByFrequency(
    logs,
    (l) => l.drink_id,
    (l) => l.drink?.name ?? "Unknown drink",
    (l) => l.shop?.name ?? "",
    (l) => l.drink_rating
  );
  if (!agg) return null;

  const favoriteDrinkName = agg.name.trim().toLowerCase();
  const representativeLog =
    logs.find((l) => (l.drink?.name ?? "").trim().toLowerCase() === favoriteDrinkName && l.photo_url) ??
    logs.find((l) => (l.drink?.name ?? "").trim().toLowerCase() === favoriteDrinkName) ??
    null;

  return {
    title: agg.name,
    subtitle: representativeLog?.shop?.name ?? agg.subtitle,
    rating: Math.round((agg.ratingSum / agg.count) * 10) / 10,
    photoPath: representativeLog?.photo_url ?? null,
    photoPositionX: representativeLog?.photo_position_x ?? null,
    photoPositionY: representativeLog?.photo_position_y ?? null,
    logCount: agg.count,
  };
}

export interface FavoriteShopResult {
  title: string;
  subtitle: string;
  rating: number;
  logCount: number;
  shopId: string;
}

/** Same ranking as deriveFavoriteDrink, keyed by shop instead of
 *  drink. Deliberately carries no photo — the original page never
 *  attached one to the favorite-shop card either. */
export function deriveFavoriteShop(logs: PassportDrinkLogRow[]): FavoriteShopResult | null {
  const agg = rankByFrequency(
    logs,
    (l) => l.shop_id,
    (l) => l.shop?.name ?? "Unknown shop",
    (l) => [l.shop?.city, l.shop?.state].filter(Boolean).join(", "),
    (l) => l.shop_rating
  );
  if (!agg) return null;

  return {
    title: agg.name,
    subtitle: agg.subtitle,
    rating: Math.round((agg.ratingSum / agg.count) * 10) / 10,
    logCount: agg.count,
    shopId: agg.key,
  };
}

export interface TemperaturePreference {
  hotPercent: number;
  icedPercent: number;
}

/** HOT VS ICED: only from logs where temperature was actually set;
 *  null (not 0/0) when nobody has ever recorded one, same as before. */
export function deriveTemperaturePreference(logs: PassportDrinkLogRow[]): TemperaturePreference | null {
  const tempLogs = logs.filter((l) => l.temperature !== null);
  if (tempLogs.length === 0) return null;
  const hotCount = tempLogs.filter((l) => l.temperature === "hot").length;
  return {
    hotPercent: Math.round((hotCount / tempLogs.length) * 100),
    icedPercent: Math.round(((tempLogs.length - hotCount) / tempLogs.length) * 100),
  };
}

export interface PassportMapPoint {
  locationId: string;
  city: string;
  region: string | null;
  country: string;
  latitude: number;
  longitude: number;
  cafeCount: number;
  drinkCount: number;
}

export interface PassportLocationMap {
  points: PassportMapPoint[];
  cafeCount: number;
}

/**
 * COFFEE MAP: aggregated by CANONICAL LOCATION (city), not by
 * individual shop — several cafés in the same city produce ONE point
 * with a combined café/drink count. A shop only contributes here if
 * it has a resolved location_id (see supabase/location_model.sql and
 * supabase/location_backfill.sql) — a shop's own latitude/longitude
 * (which almost no shop has) is never read for this. `points` is
 * returned already aggregated one-row-per-canonical-location, so a
 * caller's "how many cities" count is simply `points.length` — there
 * is only one aggregation here, never a second, separate one that
 * could disagree with it.
 */
export function derivePassportLocationMap(logs: PassportDrinkLogRow[]): PassportLocationMap {
  const locationMapAgg = new Map<
    string,
    {
      locationId: string;
      city: string;
      region: string | null;
      country: string;
      latitude: number;
      longitude: number;
      shopIds: Set<string>;
      drinkCount: number;
    }
  >();
  for (const l of logs) {
    const location = l.shop?.location;
    if (!location) continue;
    const existing = locationMapAgg.get(location.id);
    if (existing) {
      existing.shopIds.add(l.shop_id);
      existing.drinkCount += 1;
    } else {
      locationMapAgg.set(location.id, {
        locationId: location.id,
        city: location.city,
        region: location.region,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        shopIds: new Set([l.shop_id]),
        drinkCount: 1,
      });
    }
  }
  const points: PassportMapPoint[] = [...locationMapAgg.values()].map((p) => ({
    locationId: p.locationId,
    city: p.city,
    region: p.region,
    country: p.country,
    latitude: p.latitude,
    longitude: p.longitude,
    cafeCount: p.shopIds.size,
    drinkCount: p.drinkCount,
  }));
  const cafeCount = [...locationMapAgg.values()].reduce((sum, p) => sum + p.shopIds.size, 0);
  return { points, cafeCount };
}

/** EXPLORING SINCE: the earliest logged_at across the user's history
 *  — this is what lets a backdated log move the date earlier. Null
 *  for an empty history, matching the page's own hasLogs guard
 *  exactly (a bare .reduce() over [] would throw without an initial
 *  value; this preserves the same "null when there's nothing yet"
 *  behavior instead of introducing one). */
export function deriveEarliestLoggedAt(logs: PassportDrinkLogRow[]): string | null {
  if (logs.length === 0) return null;
  return logs.reduce((earliest, l) => (l.logged_at < earliest ? l.logged_at : earliest), logs[0].logged_at);
}
