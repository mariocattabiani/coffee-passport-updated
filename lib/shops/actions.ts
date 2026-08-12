"use server";

import { createClient } from "@/lib/supabase/server";
import type { Shop } from "@/lib/supabase/types";

const UNIQUE_VIOLATION = "23505";
const MAX_PLACE_ID_LENGTH = 255;
const MAX_NAME_LENGTH = 120;
const MAX_ADDRESS_LENGTH = 255;
const MAX_LOCATION_LENGTH = 80;

export interface FindOrCreateShopInput {
  googlePlaceId: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface FindOrCreateShopResult {
  shop?: Shop;
  error?: string;
}

function validateShopInput(input: FindOrCreateShopInput): string | null {
  const placeId = input.googlePlaceId.trim();
  if (!placeId) return "Missing place information. Please try selecting the café again.";
  if (placeId.length > MAX_PLACE_ID_LENGTH) {
    return "Something went wrong with that selection. Please try again.";
  }

  const name = input.name.trim();
  if (!name) return "That café is missing a name. Please try a different result.";
  if (name.length > MAX_NAME_LENGTH) return "That café's name is too long.";

  if (input.address && input.address.length > MAX_ADDRESS_LENGTH) {
    return "That address is too long.";
  }
  if (input.city && input.city.length > MAX_LOCATION_LENGTH) return "That city name is too long.";
  if (input.state && input.state.length > MAX_LOCATION_LENGTH) return "That state is too long.";

  if (input.latitude !== null && (input.latitude < -90 || input.latitude > 90)) {
    return "That location looks invalid. Please try again.";
  }
  if (input.longitude !== null && (input.longitude < -180 || input.longitude > 180)) {
    return "That location looks invalid. Please try again.";
  }

  return null;
}

/**
 * Finds the shared shop row for a Google place, or creates one if it's
 * never been logged before. Shops are shared, canonical records, never
 * duplicated per user: two people selecting the same café both end up
 * pointing at the same row.
 *
 * Trust note: the browser-submitted place data here (name, address,
 * coordinates) is accepted as pragmatic early-stage input, not
 * independently re-verified against Google server-side. See
 * supabase/shops_google_places.sql for the full reasoning.
 */
export async function findOrCreateShop(input: FindOrCreateShopInput): Promise<FindOrCreateShopResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please log in and try again." };
  }

  const validationError = validateShopInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const googlePlaceId = input.googlePlaceId.trim();
  const name = input.name.trim();
  const address = input.address?.trim() || null;
  const city = input.city?.trim() || null;
  const state = input.state?.trim() || null;

  const { data: existing } = await supabase
    .from("shops")
    .select("*")
    .eq("google_place_id", googlePlaceId)
    .maybeSingle<Shop>();

  if (existing) {
    return { shop: existing };
  }

  const { data: inserted, error } = await supabase
    .from("shops")
    .insert({
      google_place_id: googlePlaceId,
      name,
      address,
      city,
      state,
      latitude: input.latitude,
      longitude: input.longitude,
    })
    .select()
    .single<Shop>();

  if (!error && inserted) {
    return { shop: inserted };
  }

  if (error?.code === UNIQUE_VIOLATION) {
    // Someone else added this exact place a moment ago, the database is
    // the source of truth here, not an error, hand back whichever row
    // actually won the race.
    const { data: winner } = await supabase
      .from("shops")
      .select("*")
      .eq("google_place_id", googlePlaceId)
      .maybeSingle<Shop>();
    if (winner) {
      return { shop: winner };
    }
  }

  return { error: "Something went wrong saving that café. Please try again." };
}
