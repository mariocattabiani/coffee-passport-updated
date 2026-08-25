"use server";

import { createClient } from "@/lib/supabase/server";

const NEARBY_SEARCH_URL = "https://places.googleapis.com/v1/places:searchNearby";
const MAX_RESULT_COUNT = 12;
const MAX_RADIUS_METERS = 5000; // 5km hard cap, never exceeded regardless of client input
const MIN_RADIUS_METERS = 200;
// Only the fields needed to render an ephemeral card and later persist
// the shop via the existing shop-creation flow, exactly the same
// fields the autocomplete flow already extracts city/state/country
// from. No ratings, reviews, photos, phone, website, hours, or
// generative summary fields, none of that is requested or billed.
const FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents";

export interface ExternalCafeResult {
  googlePlaceId: string;
  name: string;
  formattedAddress: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}

export interface NearbySearchOutcome {
  success: boolean;
  results: ExternalCafeResult[];
  error?: string;
}

interface GoogleAddressComponent {
  types?: string[];
  shortText?: string;
}

function extractComponent(components: GoogleAddressComponent[], type: string): string | null {
  return components.find((c) => c.types?.includes(type))?.shortText ?? null;
}

/**
 * One explicit "Search this area" click = exactly one Nearby Search
 * (New) request, a Pro SKU. This function is the only place that ever
 * calls it, there is no automatic trigger anywhere in the app. Runs
 * server-side specifically because GOOGLE_PLACES_SERVER_API_KEY is not
 * NEXT_PUBLIC_-prefixed and must never reach a browser bundle, and so
 * every numeric input can be validated against a hard ceiling that a
 * modified client request can't bypass.
 */
export async function searchNearbyExternalCafes(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<NearbySearchOutcome> {
  // Authentication is enforced here, in the action itself, not assumed
  // from /explore's middleware, client-side button state, or the
  // obscurity of a Server Action's endpoint. This runs before any
  // validation, before the API key is even read, and before any
  // outbound request to Google, an unauthenticated caller never
  // reaches the billable endpoint at all.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, results: [], error: "Please log in and try again." };
  }

  if (typeof lat !== "number" || Number.isNaN(lat) || lat < -90 || lat > 90) {
    return { success: false, results: [], error: "Invalid latitude." };
  }
  if (typeof lng !== "number" || Number.isNaN(lng) || lng < -180 || lng > 180) {
    return { success: false, results: [], error: "Invalid longitude." };
  }

  const clampedRadius = Math.min(Math.max(radiusMeters, MIN_RADIUS_METERS), MAX_RADIUS_METERS);

  const apiKey = process.env.GOOGLE_PLACES_SERVER_API_KEY;
  if (!apiKey) {
    // Never logged: the key itself, the header it would go in, or full
    // request headers. Only the fact that it's missing.
    console.error("GOOGLE_PLACES_SERVER_API_KEY is not configured.");
    return { success: false, results: [], error: "Nearby search isn't configured yet." };
  }

  let response: Response;
  try {
    response = await fetch(NEARBY_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        // includedPrimaryTypes, not includedTypes: this restricts to
        // places whose PRIMARY classification is a café, not merely
        // any place that happens to also serve coffee, this is what
        // keeps restaurants/bars/convenience stores out of results.
        includedPrimaryTypes: ["cafe"],
        maxResultCount: MAX_RESULT_COUNT,
        rankPreference: "DISTANCE",
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: clampedRadius,
          },
        },
      }),
    });
  } catch (err) {
    // Network-level failure, never logs the key, headers, or request
    // body, only that the fetch itself threw.
    console.error("Nearby Search request failed to send:", err instanceof Error ? err.message : "unknown error");
    return { success: false, results: [], error: "Nearby search couldn't be completed." };
  }

  if (!response.ok) {
    // Safe diagnostics only: HTTP status and Google's own sanitized
    // error code/message from the response body. Never the API key,
    // never the X-Goog-Api-Key header, never full request/response
    // headers.
    let googleErrorCode: string | undefined;
    let googleErrorMessage: string | undefined;
    try {
      const errorBody = await response.json();
      googleErrorCode = errorBody?.error?.status;
      googleErrorMessage = errorBody?.error?.message;
    } catch {
      // Response body wasn't JSON, nothing further to safely extract.
    }
    console.error("Nearby Search failed:", {
      httpStatus: response.status,
      googleErrorCode,
      googleErrorMessage,
    });
    return { success: false, results: [], error: "Nearby search couldn't be completed." };
  }

  const data = await response.json();
  const places: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    addressComponents?: GoogleAddressComponent[];
  }> = Array.isArray(data.places) ? data.places : [];

  const placeIds = places.map((p) => p.id).filter((id): id is string => !!id);

  // Dedup against already-stored shops in one query, matched by
  // google_place_id, never persisting anything just to check this.
  // Reuses the same client created for the auth check above.
  let storedPlaceIds = new Set<string>();
  if (placeIds.length > 0) {
    const { data: existing } = await supabase
      .from("shops")
      .select("google_place_id")
      .in("google_place_id", placeIds);
    storedPlaceIds = new Set((existing ?? []).map((s) => s.google_place_id as string));
  }

  const results: ExternalCafeResult[] = places
    .filter((p) => p.id && !storedPlaceIds.has(p.id) && p.location?.latitude != null && p.location?.longitude != null)
    .map((p) => {
      const components = p.addressComponents ?? [];
      return {
        googlePlaceId: p.id!,
        name: p.displayName?.text ?? "Unnamed café",
        formattedAddress: p.formattedAddress ?? null,
        city: extractComponent(components, "locality"),
        state: extractComponent(components, "administrative_area_level_1"),
        country: extractComponent(components, "country"),
        latitude: p.location!.latitude!,
        longitude: p.location!.longitude!,
      };
    });

  return { success: true, results };
}
