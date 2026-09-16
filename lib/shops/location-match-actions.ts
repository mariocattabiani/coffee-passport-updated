"use server";

import { createClient } from "@/lib/supabase/server";

export interface LocationOption {
  id: string;
  city: string;
  region: string | null;
  country: string;
}

export interface CanonicalLocationHint {
  city: string | null;
  region: string | null;
  /** ISO-2, e.g. "US", "IT" — Google's own `shortText` on the
   *  `country` address component already returns this format (see
   *  lib/google-maps/autocomplete.ts's selectPlace), no parsing
   *  required. */
  countryCode: string | null;
}

/**
 * Matches Coffee Passport's OWN public.locations table against
 * STRUCTURED, already-parsed city/region/country values — never a
 * formatted address string. This function replaces an earlier version
 * (matchLocationFromHint) that parsed the first comma-separated
 * segment of a Google "secondary text" hint as a city name — which
 * only worked when that hint happened to already be a bare
 * "City, ST"-shaped string. Both real callers (google-shop-picker.tsx,
 * explore-search.tsx) actually pass `place.formattedAddress` as that
 * hint, e.g. "123 Main St, Virginia Beach, VA 23451, USA" — so the old
 * function was searching locations for city = "123 Main St", which
 * never matches anything. Location resolution was functionally broken
 * for most real café selections; this fixes it structurally by taking
 * the SAME structured city/state/country values
 * ShopSearchSession.selectPlace() already extracts from Google's
 * addressComponents — no parsing, no second Google request, no new
 * data ever pulled from Google, just using what was already fetched
 * and already sitting on SelectedShopPlace unused for this purpose.
 *
 * Matching rules:
 *   - city: exact case-insensitive match (ilike with no wildcards).
 *   - country: exact ISO-2 country_code match, when a code is
 *     available.
 *   - US region: exact normalized region match, but ONLY when
 *     countryCode is "US" — Coffee Passport's canonical region is
 *     always a real 2-letter code for US rows (see location_model.sql).
 *   - Non-US region: NEVER required to match. Canonical non-US regions
 *     are intentionally null (no verified GeoNames non-US region-code
 *     convention yet), so requiring Google's own region value to equal
 *     that null would make every non-US match impossible — matching by
 *     city + country_code alone is correct and already how
 *     location_backfill.sql treats non-US rows too.
 *
 * Never fuzzy. Returns every match so the caller can tell "exactly
 * one, resolve silently" from "genuinely ambiguous, show the picker"
 * apart — this function itself never guesses which one is right.
 */
export async function matchCanonicalLocation(hint: CanonicalLocationHint): Promise<LocationOption[]> {
  const city = hint.city?.trim();
  if (!city || city.length < 2) return [];

  const supabase = await createClient();
  const countryCode = hint.countryCode?.trim().toUpperCase() || null;

  let query = supabase.from("locations").select("id, city, region, country").ilike("city", city);

  if (countryCode) {
    query = query.eq("country_code", countryCode);
  }

  if (countryCode === "US" && hint.region?.trim()) {
    query = query.eq("region", hint.region.trim().toUpperCase());
  }

  const { data, error } = await query.limit(10);

  if (error) {
    console.error("matchCanonicalLocation failed:", error.message);
    return [];
  }

  return (data ?? []) as LocationOption[];
}
