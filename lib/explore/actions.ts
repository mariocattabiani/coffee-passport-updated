"use server";

import { createClient } from "@/lib/supabase/server";
import { boundsAroundPoint, type Bounds } from "@/lib/explore/geo";

const SIGNED_URL_TTL_SECONDS = 5 * 60;
const DEFAULT_RESULT_LIMIT = 50;
// A neutral, wide fallback (roughly contiguous-US-scale) for a signed-in
// user with no logged shop history yet, deliberately not a "near you"
// claim, since we have no real location signal without an explicit
// geolocation grant.
const FALLBACK_CENTER = { lat: 39.8283, lng: -98.5795 };
const FALLBACK_RADIUS_DEGREES = 20;

export interface DiscoveryResult {
  shopId: string;
  name: string;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
  isChain: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  topDrinkName: string | null;
  topDrinkRating: number | null;
  visitedByMe: boolean;
  myLogCount: number;
  friendVisitCount: number;
  photoUrl: string | null;
}

interface DiscoveryRow {
  shop_id: string;
  name: string;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
  is_chain: boolean;
  rating_avg: number | null;
  rating_count: number;
  top_drink_name: string | null;
  top_drink_rating: number | null;
  visited_by_me: boolean;
  my_log_count: number;
  friend_visit_count: number;
  photo_path: string | null;
}

/** Shared by both RPC variants: batches every photo into one signed-URL
 *  call for the whole result set, never one request per card, and maps
 *  the raw row shape into the client-facing DiscoveryResult shape. */
async function enrichAndMapRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: DiscoveryRow[]
): Promise<DiscoveryResult[]> {
  const photoPaths = rows.map((r) => r.photo_path).filter((p): p is string => !!p);
  const signedUrlByPath = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("drink-photos")
      .createSignedUrls(photoPaths, SIGNED_URL_TTL_SECONDS);
    signed?.forEach((s) => {
      if (s.signedUrl && !s.error) signedUrlByPath.set(s.path ?? "", s.signedUrl);
    });
  }

  return rows.map((r) => ({
    shopId: r.shop_id,
    name: r.name,
    city: r.city,
    state: r.state,
    latitude: r.latitude,
    longitude: r.longitude,
    isChain: r.is_chain,
    ratingAvg: r.rating_avg,
    ratingCount: r.rating_count,
    topDrinkName: r.top_drink_name,
    topDrinkRating: r.top_drink_rating,
    visitedByMe: r.visited_by_me,
    myLogCount: r.my_log_count,
    friendVisitCount: r.friend_visit_count,
    photoUrl: r.photo_path ? signedUrlByPath.get(r.photo_path) ?? null : null,
  }));
}

/** Browse-by-viewport: never fires a Google request, purely a bounded,
 *  indexed read of stored shops plus their aggregate context. Throws
 *  on a real database failure rather than returning an empty list,
 *  swallowing the error here is exactly what previously made a SQL bug
 *  look identical to "no cafés in this area." */
export async function getDiscoveryResults(
  bounds: Bounds,
  resultLimit = DEFAULT_RESULT_LIMIT
): Promise<DiscoveryResult[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_shop_discovery_results", {
    min_lat: bounds.minLat,
    max_lat: bounds.maxLat,
    min_lng: bounds.minLng,
    max_lng: bounds.maxLng,
    result_limit: resultLimit,
  });

  if (error) {
    console.error("get_shop_discovery_results failed:", error.message);
    throw new Error("Unable to load café discovery results.");
  }

  return enrichAndMapRows(supabase, (data ?? []) as DiscoveryRow[]);
}

export interface StoredShopMatch {
  shopId: string;
  name: string;
}

/** Plain stored-shop name search, capped small, feeds
 *  getStoredResultsByIds for full enrichment. Never touches Google.
 *
 *  Prefix matching, not substring. This is a deliberate choice for
 *  better-bounded behavior at V1 scale, not a verified index-usage
 *  guarantee: shops_name_lower_idx is an expression index on
 *  lower(name), and whether Postgres's planner actually chooses that
 *  index for this exact ILIKE call depends on planner/collation
 *  specifics that haven't been confirmed against a real query plan
 *  from this environment. What prefix matching does guarantee,
 *  regardless of which plan Postgres picks, is a bounded, predictable
 *  scan, unlike a leading-wildcard substring match, which can never be
 *  satisfied by a standard btree index no matter how it's phrased.
 *  Same tradeoff already made deliberately for search_users in
 *  Sprint 3F, kept consistent here rather than introducing a second
 *  search convention. Revisit with an actual EXPLAIN if this table
 *  grows enough for it to matter. */
export async function searchStoredShops(query: string): Promise<StoredShopMatch[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shops")
    .select("id, name")
    .ilike("name", `${trimmed}%`)
    .limit(10);

  if (error) {
    // Logged for observability, but not thrown: this is a best-effort
    // typeahead, not core page data, a transient failure here should
    // degrade to "no suggestions" rather than crash the page.
    console.error("searchStoredShops failed:", error.message);
    return [];
  }

  return (data ?? []).map((s) => ({ shopId: s.id as string, name: s.name as string }));
}

/** Full discovery-card enrichment for a specific, small set of shop
 *  ids, used for search results (which could be anywhere, not just the
 *  current viewport), so a stored shop found via search gets the exact
 *  same treatment as one found by browsing. Same error-surfacing
 *  discipline as getDiscoveryResults. */
export async function getStoredResultsByIds(shopIds: string[]): Promise<DiscoveryResult[]> {
  if (shopIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shop_discovery_by_ids", { shop_ids: shopIds });

  if (error) {
    console.error("get_shop_discovery_by_ids failed:", error.message);
    throw new Error("Unable to load café details.");
  }

  return enrichAndMapRows(supabase, (data ?? []) as DiscoveryRow[]);
}

export interface DefaultRegion {
  bounds: Bounds;
  /** A subtle "starting near..." hint, null when there's no history to
   *  derive one from, never a fabricated claim. */
  label: string | null;
}

interface OwnLogShopRow {
  shop: { city: string | null; state: string | null; latitude: number | null; longitude: number | null } | null;
}

/**
 * The initial region shown before anyone touches search or location,
 * derived entirely from the user's own logged history, zero Google
 * calls. Picks the most-logged (city, state) with usable coordinates.
 * Falls back to a wide, clearly-not-a-location-claim default for a
 * user with no history yet.
 */
export async function getDefaultExploreRegion(): Promise<DefaultRegion> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fallback: DefaultRegion = {
    bounds: boundsAroundPoint(FALLBACK_CENTER.lat, FALLBACK_CENTER.lng, FALLBACK_RADIUS_DEGREES),
    label: null,
  };

  if (!user) return fallback;

  const { data } = await supabase
    .from("drink_logs")
    .select("shop:shops(city,state,latitude,longitude)")
    .eq("user_id", user.id)
    .returns<OwnLogShopRow[]>();

  const logs = data ?? [];

  const cityCounts = new Map<string, { city: string; state: string; lat: number; lng: number; count: number }>();
  for (const l of logs) {
    const s = l.shop;
    if (!s?.city || !s?.state || s.latitude === null || s.longitude === null) continue;
    const key = `${s.city.toLowerCase()}|${s.state.toLowerCase()}`;
    const existing = cityCounts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      cityCounts.set(key, { city: s.city, state: s.state, lat: s.latitude, lng: s.longitude, count: 1 });
    }
  }

  const topCity = [...cityCounts.values()].sort((a, b) => b.count - a.count)[0];
  if (!topCity) return fallback;

  return {
    bounds: boundsAroundPoint(topCity.lat, topCity.lng),
    label: `${topCity.city}, ${topCity.state}`,
  };
}
