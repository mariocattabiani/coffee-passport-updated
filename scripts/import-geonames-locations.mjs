#!/usr/bin/env node
/**
 * Coffee Passport: GeoNames locations import.
 *
 * WHY THIS EXISTS: supabase/location_seed.sql ships ~30 hand-verified
 * cities, enough to cover this project's known test cases but nowhere
 * near enough for real production coverage. This script is the
 * documented path to closing that gap with a real, comprehensive,
 * legally safe dataset — it could not be run inside the sandbox that
 * built this feature (no network access there), so it's provided here
 * to run locally, wherever real internet access exists.
 *
 * DATA SOURCE / LICENSE: GeoNames (https://www.geonames.org/) —
 * `cities500` (every populated place with 500+ residents),
 * `admin1CodesASCII.txt` (region codes, US only — see below), and
 * `countryInfo.txt` (the authoritative ISO country code -> name
 * mapping). Licensed CC BY 4.0 — free to use, adapt, and redistribute
 * with attribution. This is NOT Google-derived data, so persisting it
 * indefinitely does not touch the Google Places persistence policy
 * this project deliberately avoids crossing (see lib/shops/actions.ts).
 * Attribution requirement: credit "GeoNames" and link
 * https://www.geonames.org/ wherever this data is described publicly.
 *
 * IDENTITY ARCHITECTURE (see location_model.sql for the authoritative
 * definition — if that file's scheme note and this one ever disagree,
 * location_model.sql wins):
 *   - Every row this script inserts carries GeoNames' own `geonameid`
 *     (column 0 of cities500.txt) as `geonames_id` — a real, globally
 *     unique identifier GeoNames itself assigns to every distinct
 *     place on the planet. That is the actual global uniqueness
 *     anchor for imported rows, not display text. Two real places that
 *     happen to share a city/region/country display identity (rare,
 *     but real — GeoNames itself has distinct geonameids for them)
 *     import as two distinct rows, correctly, never silently collapsed
 *     into one.
 *   - `normalized_key` (city + region-or-empty + country_code) is used
 *     ONLY as a matching aid — to find whether one of the hand-curated
 *     seed rows (location_seed.sql, which have no geonames_id) already
 *     represents the SAME place, so this import can attach its
 *     geonames_id to that existing row instead of inserting a
 *     duplicate-looking second row for a city location_seed.sql
 *     already covers.
 *   - region: US rows only, the 2-letter USPS code (GeoNames' own
 *     admin1 CODE, e.g. "PA" — never the display name). Every non-US
 *     row: region = null — the same documented limitation
 *     location_seed.sql uses, for the same reason (no verified non-US
 *     region-code convention yet, and this sandbox has no network
 *     access to establish/verify one).
 *
 * SEED-MERGE STRATEGY (the actual fix for "seeded Rome + imported Rome
 * becoming two rows"), TWO-PHASE — matching on one side only isn't
 * enough: a seed row being the sole match for a key doesn't prove the
 * REAL WORLD only has one place for that key too, so attaching on the
 * first GeoNames row encountered (this script's own earlier approach)
 * could silently attach a seed's coordinates to the wrong one of two
 * genuinely distinct places sharing a city name + country.
 *   Phase A: every GeoNames city is parsed and grouped by match key
 *     FIRST, before any attach/insert decision — so the true number of
 *     distinct real GeoNames places per key is known upfront.
 *   Phase B: a seed row is attached to a GeoNames geonames_id ONLY
 *     when BOTH sides are unambiguous for that key — exactly one
 *     existing seed row (loaded below) AND exactly one GeoNames
 *     candidate in that key's group. Any other combination (no seed
 *     match, an already-ambiguous seed match, or 2+ GeoNames
 *     candidates) means every real place in that group is imported
 *     normally, each as its own row by its own geonames_id — only the
 *     SEED ATTACHMENT is withheld when ambiguous and reported for
 *     manual review, never the underlying data.
 * Match key — US: city+region+country_code (all three, unambiguous);
 * non-US: city+country_code only (seed regions are null).
 *
 * WHAT THIS DOES NOT DO: no fuzzy matching anywhere, no writing to
 * shops or touching shops.location_id — that's location_backfill.sql's
 * job, run separately, AFTER this script has given it more locations
 * to match against.
 *
 * USAGE (run locally, not in this sandbox):
 *   1. From the project root, where `npm install` has already been run
 *      for the app itself (this script reuses @supabase/supabase-js
 *      from there — nothing extra to install).
 *   2. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment
 *      (service role, not anon — this writes to a table with no client
 *      insert policy, by design, see location_model.sql).
 *   3. node scripts/import-geonames-locations.mjs
 *
 * DEPENDENCIES: only @supabase/supabase-js is imported, which is
 * already a real dependency of the Next.js app itself (see
 * package.json) — running this script from the project root with the
 * project's own `npm install` already in place needs nothing extra.
 * Native `fetch` (Node 18+, which this project already targets) is
 * used instead of node-fetch. ZIP extraction shells out to the
 * system's own `unzip` command (present on virtually every Linux/macOS
 * dev machine) instead of an `adm-zip` package dependency — this was a
 * deliberate choice over `npm install --no-save adm-zip`: shelling out
 * needs zero package installation at all, temporary or otherwise, and
 * this script never touches package.json/package-lock.json as a
 * result. If `unzip` isn't available on your system, install it via
 * your OS package manager (e.g. `apt install unzip`, already present
 * by default on macOS) rather than adding an npm dependency for it.
 */

import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const GEONAMES_CITIES_URL = "https://download.geonames.org/export/dump/cities500.zip";
const GEONAMES_ADMIN1_URL = "https://download.geonames.org/export/dump/admin1CodesASCII.txt";
const GEONAMES_COUNTRY_INFO_URL = "https://download.geonames.org/export/dump/countryInfo.txt";

// Minimum population, matching cities500's own name (500+ residents) —
// keeps the import to genuinely inhabited places, not every hamlet.
const MIN_POPULATION = 500;

// A key that appeared on more than one seed row would be genuinely
// ambiguous to auto-merge into — this sentinel marks that case so it's
// never silently resolved to "whichever came first."
const AMBIGUOUS = Symbol("ambiguous-seed-match");

/**
 * A failed HTTP request (GeoNames down, network blip, a URL that now
 * 404s) must never be silently parsed as if it were real data — an
 * HTML error page fed into the tab-separated parsers below would
 * produce garbage rows (or, more likely, zero rows) with no clear
 * signal why. Every download in this script goes through this one
 * helper, which checks response.ok and exits clearly rather than
 * continuing on bad data.
 */
async function fetchOrExit(url, label) {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Failed to download ${label}: HTTP ${res.status} ${res.statusText} (${url})`);
    process.exit(1);
  }
  return res;
}

function seedMatchKey(row) {
  // US: all three fields (region is always a real code for US seed
  // rows). Non-US: city + country_code only (seed regions are null by
  // convention — see the scheme note above).
  return row.country_code === "US"
    ? `${row.city.trim().toLowerCase()}|${(row.region ?? "").toUpperCase()}|${row.country_code}`
    : `${row.city.trim().toLowerCase()}|${row.country_code}`;
}

async function loadCountryNames() {
  console.log("Downloading authoritative country code -> name mapping (countryInfo.txt)...");
  const res = await fetchOrExit(GEONAMES_COUNTRY_INFO_URL, "countryInfo.txt");
  const text = await res.text();

  // countryInfo.txt: comment lines start with "#" (the last is the
  // column header, also "#"-prefixed), then one tab-separated row per
  // country. Columns: ISO, ISO3, ISO-Numeric, fips, Country, ... — we
  // only need column 0 (ISO) and column 4 (Country).
  const countryNames = new Map();
  for (const line of text.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const cols = line.split("\t");
    const isoCode = cols[0];
    const countryName = cols[4];
    if (isoCode && countryName) countryNames.set(isoCode, countryName.trim());
  }
  console.log(`Loaded ${countryNames.size} country names.`);
  return countryNames;
}

async function loadUsStateAdmin1Codes() {
  console.log("Downloading US region codes (admin1CodesASCII.txt)...");
  const res = await fetchOrExit(GEONAMES_ADMIN1_URL, "admin1CodesASCII.txt");
  const text = await res.text();

  // Format: "{countryCode}.{admin1Code}\t{name}\t{asciiName}\t{geonameid}"
  // Only US rows are kept — non-US admin1 data is deliberately not
  // used at all, see the scheme note at the top of this file.
  const usAdmin1Codes = new Set();
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const [key] = line.split("\t");
    if (key && key.startsWith("US.")) usAdmin1Codes.add(key.slice(3)); // "US.PA" -> "PA"
  }
  console.log(`Loaded ${usAdmin1Codes.size} US state/territory codes.`);
  return usAdmin1Codes;
}

async function loadExistingSeedRows(supabase) {
  console.log("Loading existing hand-seeded rows (geonames_id is null)...");
  const { data, error } = await supabase
    .from("locations")
    .select("id, city, region, country_code")
    .is("geonames_id", null);

  if (error) {
    console.error("Failed to load existing seed rows:", error.message);
    process.exit(1);
  }

  const seedMatchMap = new Map();
  for (const row of data ?? []) {
    const key = seedMatchKey(row);
    if (seedMatchMap.has(key)) {
      seedMatchMap.set(key, AMBIGUOUS);
    } else {
      seedMatchMap.set(key, row.id);
    }
  }
  console.log(`Loaded ${data?.length ?? 0} seed rows (${seedMatchMap.size} distinct match keys).`);
  return seedMatchMap;
}

/**
 * Prefetched once, in a single query, specifically so the insert pass
 * below can accurately report how many rows are genuinely new vs.
 * already present — PostgREST's upsert response doesn't reliably
 * distinguish "inserted" from "skipped by ON CONFLICT" on its own, and
 * checking per-row would mean one query per GeoNames candidate (tens
 * of thousands of round trips). A single `select geonames_id` is cheap
 * (one integer column, no other fields) even at full cities500 scale.
 */
/**
 * Paginated deliberately: a single unpaginated select can silently cap
 * out at PostgREST's default row limit (commonly 1000) once the
 * dataset grows past that — this function existing at all is specifically
 * so the new-vs-skipped accounting in the summary is trustworthy, so a
 * silent partial load here would quietly reintroduce the exact
 * inaccuracy it was built to fix. Pages through in fixed-size, ordered
 * ranges until a page comes back with fewer than PAGE_SIZE rows (the
 * standard, deterministic termination condition for range pagination),
 * ordered by geonames_id itself — it's already unique among non-null
 * rows (see location_model.sql's plain unique index), so it's a stable,
 * well-indexed sort key with no risk of a row being skipped or
 * double-counted across page boundaries the way an unstable order
 * could cause.
 */
async function loadExistingGeonamesIds(supabase) {
  console.log("Loading existing geonames_ids (for accurate new-vs-skipped reporting)...");

  const PAGE_SIZE = 1000;
  const ids = new Set();
  let from = 0;

  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("locations")
      .select("geonames_id")
      .not("geonames_id", "is", null)
      .order("geonames_id", { ascending: true })
      .range(from, to);

    if (error) {
      console.error(`Failed to load existing geonames_ids (page starting at ${from}):`, error.message);
      process.exit(1);
    }

    const page = data ?? [];
    for (const row of page) ids.add(row.geonames_id);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(`Loaded ${ids.size} existing geonames_ids.`);
  return ids;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const countryNames = await loadCountryNames();
  const usAdmin1Codes = await loadUsStateAdmin1Codes();
  const seedMatchMap = await loadExistingSeedRows(supabase);
  const existingGeonamesIds = await loadExistingGeonamesIds(supabase);

  console.log("Downloading cities500 (this is a real download, may take a moment)...");
  const citiesRes = await fetchOrExit(GEONAMES_CITIES_URL, "cities500.zip");
  const citiesBuffer = Buffer.from(await citiesRes.arrayBuffer());

  // Shell out to the system's own `unzip` rather than depending on a
  // ZIP-parsing npm package — see this file's own header comment for
  // why. Extracts straight to stdout (`-p`), so nothing is left behind
  // on disk except the downloaded .zip itself, which is cleaned up
  // right after.
  const zipPath = join(tmpdir(), `coffee-passport-cities500-${Date.now()}.zip`);
  writeFileSync(zipPath, citiesBuffer);
  let citiesText;
  try {
    citiesText = execFileSync("unzip", ["-p", zipPath, "cities500.txt"], {
      maxBuffer: 1024 * 1024 * 1024, // cities500.txt is tens of MB uncompressed
    }).toString("utf8");
  } catch (err) {
    console.error(
      "Failed to extract cities500.txt with the system `unzip` command. " +
        "Is `unzip` installed and on your PATH? (apt install unzip on Linux; " +
        "already present by default on macOS)"
    );
    console.error(err.message);
    process.exit(1);
  } finally {
    unlinkSync(zipPath);
  }

  // cities500.txt columns (documented in GeoNames' own readme.txt):
  // geonameid, name, asciiname, alternatenames, latitude, longitude,
  // feature class, feature code, country code, cc2, admin1 code,
  // admin2 code, admin3 code, admin4 code, population, elevation, dem,
  // timezone, modification date.
  //
  // PHASE A: parse every candidate first, grouped by match key,
  // WITHOUT deciding attach-vs-insert yet — the previous version of
  // this script attached to a seed row on the FIRST GeoNames row that
  // matched its key, which only proves one seed row exists, not that
  // only one real GeoNames place exists for that key. Two distinct
  // real places (different geonameids) can share a city name + country
  // — sequential "first wins" could silently attach a seed's
  // coordinates to the wrong one of two real places.
  const candidatesByKey = new Map();
  let skippedUnknownCountry = 0;

  for (const line of citiesText.split("\n")) {
    if (!line.trim()) continue;
    const cols = line.split("\t");
    const [geonameIdStr, name, , , latitude, longitude, , , countryCode, , admin1Code, , , , populationStr] = cols;

    const population = Number(populationStr);
    const geonamesId = Number(geonameIdStr);
    if (!name || !countryCode || Number.isNaN(geonamesId) || Number.isNaN(population) || population < MIN_POPULATION) {
      continue;
    }

    const countryName = countryNames.get(countryCode);
    if (!countryName) {
      // A country code countryInfo.txt doesn't recognize — extremely
      // rare (disputed/historical territories), skipped rather than
      // stored with a guessed name.
      skippedUnknownCountry += 1;
      continue;
    }

    const region = countryCode === "US" && admin1Code && usAdmin1Codes.has(admin1Code) ? admin1Code : null;

    const candidate = {
      city: name.trim(),
      region,
      country: countryName,
      country_code: countryCode.toUpperCase(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      geonames_id: geonamesId,
    };
    const key = seedMatchKey(candidate);
    const group = candidatesByKey.get(key) ?? [];
    group.push(candidate);
    candidatesByKey.set(key, group);
  }

  // PHASE B: for each match key, decide attach-vs-insert using BOTH
  // sides of the match — exactly one seed row AND exactly one GeoNames
  // candidate for that key. Any other combination (no seed match,
  // ambiguous seed match, or 2+ GeoNames candidates for the key) means
  // every candidate in that group is inserted as its own distinct row
  // by its own geonames_id; an ambiguous case is also recorded for the
  // admin report below, and the seed row is left unattached rather
  // than guessed at.
  const toInsert = [];
  const toAttach = []; // { id, geonames_id } — existing seed rows to update
  const ambiguousSeedMatches = []; // for the admin report

  for (const [key, candidates] of candidatesByKey) {
    const seedMatch = seedMatchMap.get(key);
    const hasSafeSeedMatch = seedMatch && seedMatch !== AMBIGUOUS;

    if (hasSafeSeedMatch && candidates.length === 1) {
      toAttach.push({ id: seedMatch, geonames_id: candidates[0].geonames_id });
      continue;
    }

    if (hasSafeSeedMatch && candidates.length > 1) {
      ambiguousSeedMatches.push({
        seedLocationId: seedMatch,
        city: candidates[0].city,
        region: candidates[0].region,
        country_code: candidates[0].country_code,
        candidateGeonamesIds: candidates.map((c) => c.geonames_id),
      });
    }

    // No safe seed match, or an ambiguous one just reported above:
    // every real GeoNames place in this group still gets imported,
    // each as its own row by its own geonames_id — only the SEED
    // attachment is what's withheld when ambiguous, never the import
    // of real data.
    for (const c of candidates) toInsert.push(c);
  }

  console.log(
    `Parsed ${toInsert.length + toAttach.length} distinct GeoNames candidates (population >= ${MIN_POPULATION}). ` +
      `Skipped ${skippedUnknownCountry} rows with an unrecognized country code.`
  );

  // Attach pass first: update existing seed rows' geonames_id. Tracked
  // by ACTUAL result, not by how many were attempted — an update call
  // that returns an error is a failed attachment, not a successful
  // one, and the summary below must reflect that.
  console.log("Attaching geonames_id to matching seed rows...");
  let attachSucceeded = 0;
  let attachFailed = 0;
  for (const { id, geonames_id } of toAttach) {
    const { error } = await supabase.from("locations").update({ geonames_id }).eq("id", id);
    if (error) {
      console.error(`Failed to attach geonames_id ${geonames_id} to location ${id}:`, error.message);
      attachFailed += 1;
    } else {
      attachSucceeded += 1;
    }
  }

  // Insert pass: batched, additive only. ON CONFLICT (geonames_id) DO
  // NOTHING makes re-running this script safe. New-vs-skipped counts
  // are computed from existingGeonamesIds, prefetched once above — the
  // upsert call's own response can't reliably distinguish "this row
  // was inserted" from "this row was skipped by the conflict handler"
  // through PostgREST, so that response is used only to detect genuine
  // batch failures, never to count successes.
  const BATCH_SIZE = 500;
  let newlyInserted = 0;
  let skippedExisting = 0;
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const batchNewCount = batch.filter((c) => !existingGeonamesIds.has(c.geonames_id)).length;

    const { error } = await supabase.from("locations").upsert(batch, {
      onConflict: "geonames_id",
      ignoreDuplicates: true,
    });
    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
      continue;
    }

    newlyInserted += batchNewCount;
    skippedExisting += batch.length - batchNewCount;
    // Keep the in-memory Set consistent with what's now actually in
    // the database — defensive, since Phase A/B already dedupes
    // candidates by match key upfront so the same geonames_id
    // shouldn't appear in two different batches within one run, but
    // this costs nothing and protects the accounting either way.
    for (const c of batch) existingGeonamesIds.add(c.geonames_id);
    console.log(`Processed ${Math.min(i + BATCH_SIZE, toInsert.length)} / ${toInsert.length}...`);
  }

  // Final summary — the exact shape requested: attached / ambiguous /
  // inserted counts, plus enough admin-safe detail (no user data
  // anywhere in this) to manually resolve each ambiguous case.
  console.log("");
  console.log("=== Import summary ===");
  console.log(`GeoNames candidates processed: ${toInsert.length + toAttach.length}`);
  console.log(`Seed rows attached: ${attachSucceeded}${attachFailed > 0 ? ` (${attachFailed} attach attempts failed, see errors above)` : ""}`);
  console.log(`Ambiguous seed matches left unattached: ${ambiguousSeedMatches.length}`);
  console.log(`New GeoNames rows inserted: ${newlyInserted}`);
  console.log(`Existing GeoNames rows skipped: ${skippedExisting}`);

  if (ambiguousSeedMatches.length > 0) {
    console.log("");
    console.log("Ambiguous seed matches (manual/admin review needed):");
    for (const a of ambiguousSeedMatches) {
      console.log(
        `  seed location_id=${a.seedLocationId} city=${a.city} region=${a.region ?? "null"} ` +
          `country_code=${a.country_code} candidate geonames_ids=[${a.candidateGeonamesIds.join(", ")}]`
      );
    }
  }

  console.log("");
  console.log("Done. Run supabase/location_backfill.sql next to match existing shops against the expanded dataset.");
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
