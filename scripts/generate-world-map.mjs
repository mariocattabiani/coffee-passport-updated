#!/usr/bin/env node
/**
 * Generates lib/maps/generated-world-geography.ts: precomputed SVG
 * country path data plus the fitted Equal Earth scale, so the CLIENT
 * (components/maps/world-geography.ts) never has to import d3-geo,
 * topojson-client, or world-atlas at all.
 *
 * RUN THIS ONCE, manually, whenever the world geometry needs to
 * change (e.g. world-atlas publishes an update) - not on every build,
 * not on every app startup. It is a devDependency-only tool.
 *
 *   node scripts/generate-world-map.mjs
 *
 * Requires this project's real d3-geo / topojson-client / world-atlas
 * packages to be installed (npm install) - it uses the actual,
 * official packages, not a reimplementation, for everything except
 * the one cross-check described below.
 *
 * WHY THE CROSS-CHECK EXISTS
 * The client-side runtime (lib/maps/equal-earth-projection.ts) needs
 * its own dependency-free copy of the Equal Earth projection formula,
 * so it can project each user's café/city dots without shipping
 * d3-geo to the browser. That formula is duplicated inline below
 * (a plain .mjs script can't `import` a .ts module without an extra
 * build step) - so before trusting ANY output from this run, the
 * script projects a spread of real-world reference points through
 * BOTH the actual d3-geo projection AND this inline copy, and refuses
 * to write anything if they disagree by more than a hairline. This is
 * the "verify against the current d3 projection output" step the
 * Native-Readiness sprint asked for, and it is not optional: it is
 * the only thing standing between "the map is byte-for-byte correct"
 * and "the map is silently wrong." If you ever change the formula in
 * lib/maps/equal-earth-projection.ts, update the copy below to match,
 * or this check will (correctly) start failing.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import worldTopology from "world-atlas/countries-110m.json" with { type: "json" };
import { feature } from "topojson-client";
import { geoEqualEarth, geoPath, geoBounds } from "d3-geo";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "..", "lib", "maps", "generated-world-geography.ts");

const WORLD_WIDTH = 600;
const PADDING = 4;
const ANTARCTICA_LATITUDE_THRESHOLD = -60;

function roundSvgNumber(value, precision = 5) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

// ---- Inline cross-check copy of lib/maps/equal-earth-projection.ts.
// KEEP IN SYNC - see the file header comment above.
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796;
const M = Math.sqrt(3) / 2;
function equalEarthRawCheck(lambda, phi) {
  const l = Math.asin(M * Math.sin(phi));
  const l2 = l * l, l6 = l2 * l2 * l2;
  return [
    (lambda * Math.cos(l)) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2))),
    l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2)),
  ];
}
function projectEqualEarthCheck(longitude, latitude, scale) {
  const lambda = (longitude * Math.PI) / 180;
  const phi = (latitude * Math.PI) / 180;
  const [x, y] = equalEarthRawCheck(lambda, phi);
  return [x * scale, -y * scale];
}

// ---- 1. Real topology, real feature() - unchanged from the current
// components/maps/world-geography.ts.
const topology = worldTopology;
const allCountries = feature(topology, topology.objects.countries);

const inhabitedFeatures = allCountries.features.filter((f) => {
  const [, maxLat] = geoBounds(f)[1];
  return maxLat > ANTARCTICA_LATITUDE_THRESHOLD;
});
const inhabitedWorld = { type: "FeatureCollection", features: inhabitedFeatures };

// ---- 2. Real d3-geo Equal Earth projection, fitted exactly as today.
const projection = geoEqualEarth();
projection.fitWidth(WORLD_WIDTH, inhabitedWorld);

// Translate deliberately reset to (0, 0) AFTER fitting: the fitted
// SCALE is the one numeric fact this app depends on (the documented
// guarantee of fitWidth - the inhabited world's bounding box comes
// out exactly WORLD_WIDTH wide). The translate fitWidth happens to
// choose internally is not something the client-side pure projection
// needs to reproduce, because the viewBox below is always re-derived
// from the ACTUAL resulting bounds of the generated paths, not
// assumed from the translate. Resetting it to (0, 0) here just picks
// the simplest possible coordinate origin for the precomputed data
// and the runtime dot projection to agree on.
const scale = projection.scale();
projection.translate([0, 0]);

// ---- 3. Cross-check: real d3 projection vs. the inline pure copy,
// at a spread of reference points including every location named in
// the sprint's own test plan (Harrisburg PA, Virginia, Cles Italy).
const REFERENCE_POINTS = [
  ["Harrisburg, PA", -76.8867, 40.2732],
  ["Richmond, VA", -77.436, 37.5407],
  ["Cles, Italy", 11.0333, 46.3667],
  ["New York City", -74.006, 40.7128],
  ["London", -0.1278, 51.5074],
  ["Tokyo", 139.6503, 35.6762],
  ["Sydney", 151.2093, -33.8688],
  ["Cape Town", 18.4241, -33.9249],
  ["Reykjavik", -21.9426, 64.1466],
  ["Equator/Prime Meridian", 0, 0],
  ["Dateline east", 179.9, 0],
  ["Dateline west", -179.9, 0],
  ["Near north pole", 0, 89],
  ["Just above Antarctica cutoff", 0, -59],
];

let worstDelta = 0;
for (const [name, lon, lat] of REFERENCE_POINTS) {
  const real = projection([lon, lat]);
  const mine = projectEqualEarthCheck(lon, lat, scale);
  if (!real) throw new Error(`d3 projection returned null for ${name} (${lon}, ${lat})`);
  const delta = Math.hypot(real[0] - mine[0], real[1] - mine[1]);
  worstDelta = Math.max(worstDelta, delta);
  console.log(
    `  ${name.padEnd(28)} d3=[${real[0].toFixed(6)}, ${real[1].toFixed(6)}]  pure=[${mine[0].toFixed(6)}, ${mine[1].toFixed(6)}]  delta=${delta.toExponential(2)}`
  );
}

const MAX_ALLOWED_DELTA = 1e-6; // orders of magnitude finer than one rendered pixel
if (worstDelta > MAX_ALLOWED_DELTA) {
  console.error(`\nCROSS-CHECK FAILED: worst delta ${worstDelta} exceeds ${MAX_ALLOWED_DELTA}.`);
  console.error("Refusing to write output. The pure projection copy in this script");
  console.error("and/or lib/maps/equal-earth-projection.ts has drifted from real d3-geo output.");
  process.exit(1);
}
console.log(`\nCross-check passed. Worst delta across ${REFERENCE_POINTS.length} reference points: ${worstDelta.toExponential(3)}\n`);

// ---- 4. Generate paths + viewBox, identically to the current
// components/maps/world-geography.ts (same PADDING, same .digits(5),
// same bounds()-derived viewBox - just with translate reset to (0,0)
// per step 2 above).
const pathGenerator = geoPath(projection).digits(5);
const bounds = pathGenerator.bounds(inhabitedWorld);

const viewBoxX = roundSvgNumber(bounds[0][0] - PADDING);
const viewBoxY = roundSvgNumber(bounds[0][1] - PADDING);
const viewBoxWidth = roundSvgNumber(bounds[1][0] - bounds[0][0] + PADDING * 2);
const viewBoxHeight = roundSvgNumber(bounds[1][1] - bounds[0][1] + PADDING * 2);

const worldCountryPaths = inhabitedFeatures.map((f) => pathGenerator(f)).filter((d) => d !== null);

console.log(`Generated ${worldCountryPaths.length} country paths (of ${inhabitedFeatures.length} inhabited features).`);
console.log(`viewBox: ${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
console.log(`Fitted Equal Earth scale: ${scale}`);

// ---- 5. Write the committed TS artifact.
const header = `/**
 * GENERATED FILE - do not hand-edit.
 * Produced by scripts/generate-world-map.mjs from the real
 * world-atlas/countries-110m.json + d3-geo Equal Earth projection.
 * Rerun that script (node scripts/generate-world-map.mjs) to
 * regenerate, e.g. after a world-atlas update.
 *
 * Consumed by components/maps/world-geography.ts together with the
 * pure runtime projection in lib/maps/equal-earth-projection.ts -
 * neither the client nor this file needs d3-geo, topojson-client, or
 * world-atlas at runtime; those only run here, in this generation
 * script.
 */
`;

const body = `export const WORLD_COUNTRY_PATHS: string[] = ${JSON.stringify(worldCountryPaths)};

export const WORLD_VIEWBOX = "${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}";
export const WORLD_VIEW_WIDTH = ${viewBoxWidth};
export const WORLD_VIEW_HEIGHT = ${viewBoxHeight};
export const WORLD_VIEW_X = ${viewBoxX};
export const WORLD_VIEW_Y = ${viewBoxY};

/** Fitted Equal Earth scale (d3's projection.scale() after
 *  fitWidth(600, inhabitedWorld), translate reset to (0, 0)) - the
 *  one number lib/maps/equal-earth-projection.ts's projectEqualEarth
 *  needs at runtime to project a lat/lng into this same coordinate
 *  space the paths above were generated in. */
export const EQUAL_EARTH_SCALE = ${scale};
`;

writeFileSync(OUTPUT_PATH, header + body);
console.log(`\nWrote ${OUTPUT_PATH}`);
