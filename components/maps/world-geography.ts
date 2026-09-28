import {
  WORLD_COUNTRY_PATHS,
  WORLD_VIEWBOX,
  WORLD_VIEW_WIDTH,
  WORLD_VIEW_HEIGHT,
  WORLD_VIEW_X,
  WORLD_VIEW_Y,
  EQUAL_EARTH_SCALE,
} from "@/lib/maps/generated-world-geography";
import { projectEqualEarth } from "@/lib/maps/equal-earth-projection";

/**
 * Real geography, not hand-drawn continents — but no longer computed
 * here. The country outlines, the viewBox, and the Antarctica
 * exclusion are the same for every user on every request, so they're
 * precomputed once, offline, by scripts/generate-world-map.mjs (which
 * uses the real d3-geo/topojson-client/world-atlas toolchain against
 * the actual world-atlas topology) and committed as
 * lib/maps/generated-world-geography.ts. This module just re-exports
 * that static data under its existing names, so travel-map.tsx needs
 * no changes.
 *
 * The one piece that still runs at request time is projecting each
 * user's own café/city dots (projectPoint below) — that can't be
 * precomputed, since it depends on the dots each user actually has.
 * It uses lib/maps/equal-earth-projection.ts's pure, dependency-free
 * Equal Earth formula with the SAME fitted scale
 * (EQUAL_EARTH_SCALE) the paths above were generated with, so a dot
 * and the coastline beneath it are always geographically consistent.
 *
 * Neither this file nor its two imports pull in d3-geo,
 * topojson-client, world-atlas, topojson-specification, or geojson —
 * none of that reaches the client bundle anymore. Those packages are
 * still real dependencies of scripts/generate-world-map.mjs, an
 * offline generation script, not of the app.
 */

/** Passed directly to the <svg viewBox="..."> in travel-map.tsx. */
export { WORLD_VIEWBOX, WORLD_VIEW_WIDTH, WORLD_VIEW_HEIGHT, WORLD_VIEW_X, WORLD_VIEW_Y };

/** One precomputed SVG path `d` string per (non-Antarctic) country
 *  polygon, ready to render directly as <path d={...} />. Generated
 *  offline, never recomputed per render or per user. */
export const worldCountryPaths: string[] = WORLD_COUNTRY_PATHS;

/**
 * Rounds a projected coordinate (or any derived SVG number) to a
 * stable, fixed decimal precision. This is the actual hydration fix:
 * projection math can otherwise produce a value like 48.85445508179734
 * on the server and 48.85445508179731 on the client for the exact same
 * lat/lng input — not a bug in the projection itself, just an ordinary
 * consequence of floating-point arithmetic sometimes taking a
 * different last-bit path across different JS engines/environments.
 * React's hydration check compares rendered TEXT, so even a
 * microscopic, visually meaningless difference at the 11th decimal
 * place registers as a real mismatch. Rounding both the server and
 * client's output to the same coarser precision (5 decimals by
 * default — far finer than a single visible pixel at any realistic
 * map size, so geography is unaffected) guarantees both environments
 * render the identical string, deterministically, every time.
 */
export function roundSvgNumber(value: number, precision = 5): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

/**
 * Projects a real latitude/longitude into the SAME fixed world
 * projection the country paths above were generated from, so a dot
 * and the coastline beneath it are always geographically consistent.
 * Returns null for non-finite input (e.g. a malformed lat/lng from
 * bad data) rather than emitting NaN into the SVG.
 */
export function projectPoint(latitude: number, longitude: number): [number, number] | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const [x, y] = projectEqualEarth(longitude, latitude, EQUAL_EARTH_SCALE);
  return [roundSvgNumber(x), roundSvgNumber(y)];
}