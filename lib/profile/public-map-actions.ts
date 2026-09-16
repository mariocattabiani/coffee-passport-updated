"use server";

import { createClient } from "@/lib/supabase/server";

export interface PublicMapLocation {
  locationId: string;
  city: string;
  region: string | null;
  country: string;
  latitude: number;
  longitude: number;
  cafeCount: number;
  drinkCount: number;
  latestPublicVisit: string;
}

interface PublicMapRow {
  location_id: string;
  city: string;
  region: string | null;
  country: string;
  latitude: number;
  longitude: number;
  cafe_count: number;
  drink_count: number;
  latest_public_visit: string;
}

/**
 * City-level dots for the public profile's travel map. Aggregated
 * through shops.location_id -> locations (see profile_map_v2.sql), not
 * per-café, and no longer requires any shop's own exact coordinates —
 * a shop only needs a resolved canonical location, which is a much
 * weaker, much more commonly satisfiable requirement than "this exact
 * café has lat/lng on file". Privacy is still fully enforced in SQL
 * (public logs only), this function only reshapes rows.
 *
 * A real RPC failure is thrown, not swallowed into an empty list — if
 * profile_map_v2.sql hasn't been run, this should surface as an
 * obvious error, not render as "this person has no public cafés."
 */
export async function getPublicUserMap(username: string): Promise<PublicMapLocation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_user_map", { target_username: username });

  if (error) {
    console.error("get_public_user_map failed:", error.message);
    throw new Error("Unable to load this profile's Coffee Map.");
  }

  const rows = (data ?? []) as PublicMapRow[];

  return rows.map((r) => ({
    locationId: r.location_id,
    city: r.city,
    region: r.region,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
    cafeCount: r.cafe_count,
    drinkCount: r.drink_count,
    latestPublicVisit: r.latest_public_visit,
  }));
}

export interface PublicCityRow {
  /** Null for a real, legitimately persisted city that hasn't been
   *  resolved to a canonical location yet — still true history, just
   *  not map-plottable until location_backfill.sql (or a future
   *  match) resolves it. Never used to hide the row. */
  locationId: string | null;
  city: string;
  region: string | null;
  country: string | null;
  coffeeCount: number;
  cafeCount: number;
}

interface PublicCityRpcRow {
  location_id: string | null;
  city: string;
  region: string | null;
  country: string | null;
  coffee_count: number;
  cafe_count: number;
}

/** Public-only city breakdown, already ordered most-active first.
 *  Includes both resolved (map-plottable) and unresolved (real city
 *  history, not yet map-plottable) rows — see get_public_user_cities
 *  in profile_map_v2.sql for why this union exists: an earlier version
 *  of this function silently dropped unresolved cities, which deleted
 *  real history from the UI. A real RPC failure is thrown, not
 *  swallowed into an empty list. */
export async function getPublicUserCities(username: string): Promise<PublicCityRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_user_cities", { target_username: username });

  if (error) {
    console.error("get_public_user_cities failed:", error.message);
    throw new Error("Unable to load this profile's cities.");
  }

  const rows = (data ?? []) as PublicCityRpcRow[];

  return rows.map((r) => ({
    locationId: r.location_id,
    city: r.city,
    region: r.region,
    country: r.country,
    coffeeCount: r.coffee_count,
    cafeCount: r.cafe_count,
  }));
}

export interface PublicDrinkRow {
  drinkName: string;
  category: "coffee" | "tea";
  logCount: number;
}

interface PublicDrinkRpcRow {
  drink_name: string;
  category: "coffee" | "tea";
  log_count: number;
}

/** Public-only drink breakdown, already ordered most-logged first.
 *  A real RPC failure is thrown, not swallowed into an empty list. */
export async function getPublicUserDrinks(username: string): Promise<PublicDrinkRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_user_drinks", { target_username: username });

  if (error) {
    console.error("get_public_user_drinks failed:", error.message);
    throw new Error("Unable to load this profile's drinks.");
  }

  const rows = (data ?? []) as PublicDrinkRpcRow[];

  return rows.map((r) => ({
    drinkName: r.drink_name,
    category: r.category,
    logCount: r.log_count,
  }));
}
