"use server";

import { createClient } from "@/lib/supabase/server";
import type { Shop } from "@/lib/supabase/types";

const UNIQUE_VIOLATION = "23505";
const MAX_PLACE_ID_LENGTH = 255;
const MAX_NAME_LENGTH = 120;
const MAX_CITY_LENGTH = 80;

/**
 * Pure lookup, no side effects, no creation. Used first, always,
 * before ever considering creating a shop: if a Google-discovered café
 * is already in Coffee Passport, we open the existing record, we never
 * create a second one.
 */
export async function findShopByGooglePlaceId(googlePlaceId: string): Promise<Shop | null> {
  const placeId = googlePlaceId.trim();
  if (!placeId) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("shops").select("*").eq("google_place_id", placeId).maybeSingle<Shop>();

  return data ?? null;
}

export interface CreateCoffeePassportShopInput {
  googlePlaceId: string;
  /** Coffee Passport's own permanent name for this café, entered by a
   *  user through our own form. This is never Google's displayName
   *  copied in silently, the caller is responsible for that boundary,
   *  see components/explore/add-external-cafe-dialog.tsx. */
  name: string;
  city?: string | null;
  nameSource: "user" | "manual" | "seed";
  locationSource?: "user" | "manual" | "seed";
}

export interface CreateCoffeePassportShopResult {
  shop?: Shop;
  error?: string;
}

function validateCreateInput(input: CreateCoffeePassportShopInput): string | null {
  const placeId = input.googlePlaceId.trim();
  if (!placeId) return "Missing place information. Please try again.";
  if (placeId.length > MAX_PLACE_ID_LENGTH) return "Something went wrong with that selection. Please try again.";

  const name = input.name.trim();
  if (!name) return "Please enter a café name.";
  if (name.length > MAX_NAME_LENGTH) return "That name is too long.";

  if (input.city && input.city.length > MAX_CITY_LENGTH) return "That city name is too long.";

  return null;
}

/**
 * Creates a new, durable Coffee Passport shop record from a
 * Google-discovered café (Autocomplete or Nearby Search), storing only
 * what's genuinely Coffee Passport's own: the Google place ID (the one
 * field with an explicit, indefinite storage right), a Coffee
 * Passport-entered name, and an optional Coffee Passport-entered city.
 *
 * Deliberately does NOT accept or persist Google's formattedAddress,
 * addressComponents, state, country, or coordinates. A newly created
 * shop may have null latitude/longitude, that's expected and fine,
 * shops.latitude/longitude are already nullable with constraints that
 * explicitly permit null. It simply won't appear in coordinate-based
 * map surfaces until Coffee Passport has its own location data for it,
 * every other surface (ratings, Top Drinks, logs, Passport history,
 * public activity, the café page itself) works the same regardless.
 *
 * Race-safe the same way shop creation always has been in this project: attempts
 * the insert, and on a unique-constraint hit (someone else created the
 * same place a moment earlier), returns whichever row actually won,
 * never a raw duplicate-key failure surfaced to the user.
 */
export async function createCoffeePassportShop(
  input: CreateCoffeePassportShopInput
): Promise<CreateCoffeePassportShopResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Please log in and try again." };
  }

  const validationError = validateCreateInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const googlePlaceId = input.googlePlaceId.trim();
  const name = input.name.trim();
  const city = input.city?.trim() || null;

  const { data: inserted, error } = await supabase
    .from("shops")
    .insert({
      google_place_id: googlePlaceId,
      name,
      city,
      name_source: input.nameSource,
      location_source: city ? input.locationSource ?? "user" : "unknown",
    })
    .select()
    .single<Shop>();

  if (!error && inserted) {
    return { shop: inserted };
  }

  if (error?.code === UNIQUE_VIOLATION) {
    const winner = await findShopByGooglePlaceId(googlePlaceId);
    if (winner) {
      return { shop: winner };
    }
  }

  return { error: "Something went wrong saving that café. Please try again." };
}
