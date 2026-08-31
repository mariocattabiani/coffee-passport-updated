"use server";

import { createClient } from "@/lib/supabase/server";

export interface PublicMapShop {
  shopId: string;
  shopName: string;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
  publicVisitCount: number;
  latestPublicVisit: string;
}

interface PublicMapRow {
  shop_id: string;
  shop_name: string;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
  public_visit_count: number;
  latest_public_visit: string;
}

/**
 * Café pins for the always-visible public profile Coffee Map.
 * get_public_user_map already aggregates by café and excludes shops
 * with no coordinates entirely, this function only reshapes the rows,
 * it never filters or joins anything itself, that would defeat the
 * point of enforcing privacy in SQL rather than in React.
 *
 * A real RPC failure is thrown, not swallowed into an empty list —
 * if public_profile_v2.sql hasn't been run, this should surface as an
 * obvious error, not render as "this person has no public cafés."
 */
export async function getPublicUserMap(username: string): Promise<PublicMapShop[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_user_map", { target_username: username });

  if (error) {
    console.error("get_public_user_map failed:", error.message);
    throw new Error("Unable to load this profile's Coffee Map.");
  }

  const rows = (data ?? []) as PublicMapRow[];

  return rows.map((r) => ({
    shopId: r.shop_id,
    shopName: r.shop_name,
    city: r.city,
    state: r.state,
    latitude: r.latitude,
    longitude: r.longitude,
    publicVisitCount: r.public_visit_count,
    latestPublicVisit: r.latest_public_visit,
  }));
}

export interface PublicCityRow {
  city: string;
  state: string | null;
  coffeeCount: number;
  cafeCount: number;
}

interface PublicCityRpcRow {
  city: string;
  state: string | null;
  coffee_count: number;
  cafe_count: number;
}

/** Public-only city breakdown, already ordered most-active first.
 *  A real RPC failure is thrown, not swallowed into an empty list. */
export async function getPublicUserCities(username: string): Promise<PublicCityRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_user_cities", { target_username: username });

  if (error) {
    console.error("get_public_user_cities failed:", error.message);
    throw new Error("Unable to load this profile's cities.");
  }

  const rows = (data ?? []) as PublicCityRpcRow[];

  return rows.map((r) => ({
    city: r.city,
    state: r.state,
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
