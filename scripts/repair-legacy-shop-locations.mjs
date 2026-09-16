#!/usr/bin/env node
/**
 * Coffee Passport: legacy shop location repair.
 *
 * WHY THIS EXISTS: a batch of shops created before the canonical
 * location system existed have `location_id = null` AND
 * `city/state/country = null`, but DO have a real `google_place_id`
 * from when they were originally added. Confirmed examples: Bar Café
 * Bastione, Bar Caffè Gelateria Lanterna Magica, Bar la piazzetta, Bar
 * La Piazzetta, Beach Bum Coffee, canazei. Unlike a brand new shop
 * (which now resolves location_id at creation time — see
 * lib/shops/actions.ts / lib/shops/location-match-actions.ts), these
 * rows predate that flow entirely and were never given the chance to
 * resolve. This is a ONE-TIME REPAIR for that specific backlog, not a
 * change to the normal app flow, which is untouched by this script.
 *
 * GOOGLE DATA BOUNDARY (same policy every other part of this feature
 * already follows — see location_model.sql / lib/shops/actions.ts):
 * Google's latitude/longitude, formattedAddress, and raw address
 * components are used ONLY TRANSIENTLY, in memory, to identify which
 * of Coffee Passport's OWN canonical locations (public.locations) a
 * shop belongs to. They are NEVER written to the database by this
 * script. The only values ever persisted are:
 *   - shops.location_id (the canonical location's own id)
 *   - shops.city / shops.state / shops.country — copied from that
 *     SAME canonical locations row, never from Google's response.
 *
 * MATCHING RULES — identical to the app's own normal-flow matcher
 * (lib/shops/location-match-actions.ts's matchCanonicalLocation), so a
 * shop repaired here resolves exactly the way it would have if it had
 * been created today:
 *   - city: exact case-insensitive match.
 *   - country: exact ISO-2 country_code match.
 *   - US region: exact normalized region match, only when country is US.
 *   - non-US region: never required (canonical non-US regions are
 *     intentionally null — no verified GeoNames non-US region-code
 *     convention yet).
 *   - Exactly one match -> resolve. Multiple matches -> unresolved,
 *     reported (this script has no interactive picker the way the
 *     live UI does, so ambiguous cases are always left for manual
 *     review, never guessed).
 *
 * NEAREST-LOCATION FALLBACK — only reached when the exact match above
 * finds nothing AND Google returned real coordinates for the place.
 * Real Haversine great-circle distance (not naive lat/lng subtraction)
 * against a SQL-bounded candidate set (one query, not one query per
 * canonical location — a rough bounding box around the shop's
 * coordinates, sized generously past the 25km threshold, computed
 * server-side by Postgres; final distance and the threshold decision
 * happen in JS against that already-small candidate set). Only used
 * within 25km — past that, the shop is left unresolved rather than
 * guessed at.
 *
 * USAGE (run locally, not in this sandbox — needs real network access
 * to both Supabase and the Google Places API):
 *   node scripts/repair-legacy-shop-locations.mjs --dry-run
 *   node scripts/repair-legacy-shop-locations.mjs --apply
 *
 * Dry run is the DEFAULT — no flag, or --dry-run, behaves identically:
 * fetches Google data, resolves candidates, prints every proposed
 * update, writes nothing. Only --apply actually updates the database.
 * A shop that already resolved (location_id no longer null) simply
 * won't be selected by the eligibility query on a later run.
 *
 * DEPENDENCIES: only @supabase/supabase-js, already a real dependency
 * of the Next.js app itself (see package.json) — run from the project
 * root with the app's own `npm install` already in place, nothing
 * extra needed. Native `fetch` (Node 18+) for the Google Places calls,
 * no node-fetch. package.json/package-lock.json are never touched.
 *
 * ENVIRONMENT: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (service role,
 * not anon — this writes to shops and reads public.locations directly),
 * GOOGLE_PLACES_SERVER_API_KEY (the same server-side key
 * lib/explore/nearby-search-actions.ts already uses).
 */

import { createClient } from "@supabase/supabase-js";

const PLACE_DETAILS_URL = "https://places.googleapis.com/v1/places";
const FIELD_MASK = "addressComponents,location";

const NEAREST_MATCH_THRESHOLD_KM = 25;
// Generous bounding box for the SQL prefilter, well past the 25km
// threshold — this only narrows the candidate set for one query, the
// real distance/threshold decision happens afterward in JS via real
// Haversine distance, never this box alone.
const BOUNDING_BOX_DEGREES = 0.5;

// A small, polite delay between Google Place Details requests — this
// is a low-volume, one-time admin script (expected to process at most
// hundreds of shops), not a bulk import; there's no need to hammer the
// API as fast as possible.
const REQUEST_DELAY_MS = 120;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // mean Earth radius, km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function extractComponent(components, type) {
  return components?.find((c) => c.types?.includes(type))?.shortText ?? null;
}

function extractComponentLong(components, type) {
  return components?.find((c) => c.types?.includes(type))?.longText ?? null;
}

/**
 * Fetches one place's addressComponents + location from Google Place
 * Details (New). Returns { error } on any failure (network, non-2xx,
 * or a response with no addressComponents at all) rather than
 * throwing — a single Google failure must not abort the whole repair
 * run, it should just leave that one shop unresolved and reported.
 */
async function fetchPlaceLocationHint(apiKey, googlePlaceId) {
  let response;
  try {
    response = await fetch(`${PLACE_DETAILS_URL}/${encodeURIComponent(googlePlaceId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
    });
  } catch (err) {
    return { error: `network error: ${err.message}` };
  }

  if (!response.ok) {
    return { error: `HTTP ${response.status} ${response.statusText}` };
  }

  const place = await response.json();
  const components = place.addressComponents ?? [];

  // locality, falling back to postal_town — same fallback the app's
  // own normal-flow extraction uses (lib/google-maps/autocomplete.ts,
  // lib/explore/nearby-search-actions.ts) for UK-style addresses.
  const city =
    extractComponentLong(components, "locality") ?? extractComponentLong(components, "postal_town");
  const region = extractComponent(components, "administrative_area_level_1");
  const countryCode = extractComponent(components, "country");
  const latitude = place.location?.latitude ?? null;
  const longitude = place.location?.longitude ?? null;

  return { city, region, countryCode, latitude, longitude };
}

/**
 * Exact canonical match — identical rules to
 * lib/shops/location-match-actions.ts's matchCanonicalLocation, kept
 * in sync deliberately (documented in this script's own header) so a
 * shop repaired here resolves exactly the way the live app would
 * resolve it today.
 */
async function findExactMatch(supabase, { city, region, countryCode }) {
  if (!city || city.trim().length < 2) return [];

  let query = supabase.from("locations").select("id, city, region, country").ilike("city", city.trim());

  const normalizedCountryCode = countryCode?.trim().toUpperCase() || null;
  if (normalizedCountryCode) {
    query = query.eq("country_code", normalizedCountryCode);
  }
  if (normalizedCountryCode === "US" && region?.trim()) {
    query = query.eq("region", region.trim().toUpperCase());
  }

  const { data, error } = await query.limit(10);
  if (error) {
    console.error("findExactMatch query failed:", error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Nearest-location fallback — one bounded SQL query (a generous
 * lat/lng box, not a full-table scan and not one query per candidate),
 * then real Haversine distance computed in JS against that small
 * candidate set. Only returns a match within NEAREST_MATCH_THRESHOLD_KM;
 * anything farther is treated as no match at all, never guessed.
 */
async function findNearestMatch(supabase, latitude, longitude) {
  const { data, error } = await supabase
    .from("locations")
    .select("id, city, region, country, latitude, longitude")
    .gte("latitude", latitude - BOUNDING_BOX_DEGREES)
    .lte("latitude", latitude + BOUNDING_BOX_DEGREES)
    .gte("longitude", longitude - BOUNDING_BOX_DEGREES)
    .lte("longitude", longitude + BOUNDING_BOX_DEGREES);

  if (error) {
    console.error("findNearestMatch query failed:", error.message);
    return null;
  }

  let nearest = null;
  let nearestDistanceKm = Infinity;
  for (const candidate of data ?? []) {
    const distanceKm = haversineKm(latitude, longitude, candidate.latitude, candidate.longitude);
    if (distanceKm < nearestDistanceKm) {
      nearestDistanceKm = distanceKm;
      nearest = candidate;
    }
  }

  if (nearest && nearestDistanceKm <= NEAREST_MATCH_THRESHOLD_KM) {
    return { location: nearest, distanceKm: nearestDistanceKm };
  }
  return null;
}

/** Paginated for the same reason scripts/import-geonames-locations.mjs
 *  paginates its own prefetch — a single unpaginated select can
 *  silently cap out at PostgREST's default row limit once the
 *  eligible-shop count grows past it, which would make this repair
 *  quietly incomplete without any error. */
async function loadEligibleShops(supabase) {
  const PAGE_SIZE = 1000;
  const shops = [];
  let from = 0;

  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("shops")
      .select("id, name, google_place_id")
      .is("location_id", null)
      .not("google_place_id", "is", null)
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      console.error(`Failed to load eligible shops (page starting at ${from}):`, error.message);
      process.exit(1);
    }

    const page = data ?? [];
    shops.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return shops;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  // Dry run is the default: anything that isn't an explicit --apply
  // (including --dry-run itself, or no flag at all) behaves as dry
  // run — never writes to the database.
  const dryRun = !apply;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const googleApiKey = process.env.GOOGLE_PLACES_SERVER_API_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.");
    process.exit(1);
  }
  if (!googleApiKey) {
    console.error("Set GOOGLE_PLACES_SERVER_API_KEY before running this script.");
    process.exit(1);
  }

  console.log(dryRun ? "=== DRY RUN (no database writes) ===" : "=== APPLY (writing to the database) ===");

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log("Loading eligible legacy shops (location_id is null, google_place_id is not null)...");
  const shops = await loadEligibleShops(supabase);
  console.log(`Found ${shops.length} eligible shop(s).`);

  let exactMatches = 0;
  let nearestMatches = 0;
  let unresolved = 0;
  let googleFailures = 0;
  let updateFailures = 0;
  const unresolvedReport = [];

  for (const shop of shops) {
    const hint = await fetchPlaceLocationHint(googleApiKey, shop.google_place_id);
    await sleep(REQUEST_DELAY_MS);

    if (hint.error) {
      googleFailures += 1;
      console.error(`  [Google API failure] shop id=${shop.id} name="${shop.name}": ${hint.error}`);
      continue;
    }

    let resolution = null; // { location, via: "exact" | "nearest", distanceKm? }

    const exact = await findExactMatch(supabase, hint);
    if (exact.length === 1) {
      resolution = { location: exact[0], via: "exact" };
    } else if (exact.length === 0 && hint.latitude != null && hint.longitude != null) {
      const nearest = await findNearestMatch(supabase, hint.latitude, hint.longitude);
      if (nearest) {
        resolution = { location: nearest.location, via: "nearest", distanceKm: nearest.distanceKm };
      }
    }

    if (!resolution) {
      unresolved += 1;
      unresolvedReport.push({
        id: shop.id,
        name: shop.name,
        google_place_id: shop.google_place_id,
        google_city: hint.city,
        google_region: hint.region,
        google_country_code: hint.countryCode,
      });
      continue;
    }

    const { location, via, distanceKm } = resolution;
    const label = via === "exact" ? "exact match" : `nearest match, ${distanceKm.toFixed(1)}km`;
    console.log(
      `  [${dryRun ? "would resolve" : "resolving"}] shop id=${shop.id} name="${shop.name}" -> ` +
        `${location.city}${location.region ? `, ${location.region}` : ""}, ${location.country} (${label})`
    );

    if (via === "exact") exactMatches += 1;
    else nearestMatches += 1;

    if (!dryRun) {
      const { error } = await supabase
        .from("shops")
        .update({
          location_id: location.id,
          city: location.city,
          state: location.region,
          country: location.country,
        })
        .eq("id", shop.id);

      if (error) {
        updateFailures += 1;
        console.error(`  [update failed] shop id=${shop.id}: ${error.message}`);
      }
    }
  }

  console.log("");
  console.log("=== Repair summary ===");
  console.log(`Legacy shops scanned: ${shops.length}`);
  console.log(`Exact canonical matches: ${exactMatches}`);
  console.log(`Nearest-location fallback matches: ${nearestMatches}`);
  console.log(`Unresolved shops: ${unresolved}`);
  console.log(`Google API failures: ${googleFailures}`);
  if (!dryRun) console.log(`Database update failures: ${updateFailures}`);

  if (unresolvedReport.length > 0) {
    console.log("");
    console.log("Unresolved shops (manual/admin review needed):");
    for (const u of unresolvedReport) {
      console.log(
        `  shop id=${u.id} name="${u.name}" google_place_id=${u.google_place_id} ` +
          `google_city=${u.google_city ?? "null"} google_region=${u.google_region ?? "null"} ` +
          `google_country_code=${u.google_country_code ?? "null"}`
      );
    }
  }

  if (dryRun) {
    console.log("");
    console.log("This was a dry run — no changes were written. Run with --apply to write these updates.");
  }
}

main().catch((err) => {
  console.error("Repair script failed:", err);
  process.exit(1);
});
