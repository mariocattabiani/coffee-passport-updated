import worldTopology from "world-atlas/countries-110m.json";
import { feature } from "topojson-client";
import { geoEqualEarth, geoPath, geoBounds, type GeoProjection } from "d3-geo";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, Feature, Geometry } from "geojson";

/**
 * Real geography, not hand-drawn continents — world-atlas's own
 * pre-built, pre-simplified TopoJSON (Natural Earth-derived), bundled
 * at build time via a direct JSON import (resolveJsonModule is already
 * enabled in this project's tsconfig). No runtime request, no Google
 * dependency, works fully offline after build. `countries-110m.json`
 * specifically — a small map thumbnail has no use for coastline detail
 * finer than what's visible at this size.
 *
 * Everything in this module runs ONCE, at import time, not per
 * component render: the world geometry is static and the projection is
 * fixed (this app deliberately shows a constant "the whole world" view
 * regardless of where any given user has logged coffee — see
 * travel-map.tsx for why), so nothing here legitimately needs
 * useMemo — module-level constants already give that for free.
 *
 * VIEWBOX DERIVATION, corrected this pass — the previous version
 * computed `viewHeight = WORLD_WIDTH / TARGET_ASPECT` with
 * TARGET_ASPECT (1.55) SMALLER than Equal Earth's natural full-globe
 * aspect ratio (~1.92:1). Dividing by a smaller number produces a
 * LARGER height, not a smaller one — that math added vertical
 * whitespace above and below the world instead of cropping it, the
 * exact opposite of the intent.
 *
 * The actual fix isn't a different constant, it's a different
 * mechanism entirely: rather than guessing at an aspect ratio and
 * deriving a height from it, this now computes the TIGHT projected
 * bounding box of the world's countries with Antarctica EXCLUDED, and
 * uses that real bounding box directly as the viewBox (plus a small
 * padding margin). Antarctica is identified geographically (any
 * feature whose bounds lie entirely south of -60° latitude), not by
 * hardcoding world-atlas's numeric country id for it, which would be
 * more fragile to get exactly right. -60° cleanly isolates Antarctica
 * alone: no other landmass (Tierra del Fuego / southernmost South
 * America stays north of -55°) is affected, so Alaska, Iceland, Japan,
 * Australia, and New Zealand are never at risk of being excluded by
 * this filter — they simply aren't near that latitude.
 *
 * Because Equal Earth compresses areas near the poles (an intentional
 * property of the projection, not a bug), Antarctica's huge nominal
 * latitude span occupies a disproportionately small vertical sliver of
 * the rendered world even before this exclusion — removing it
 * meaningfully tightens the bounding box without needing to also trim
 * anything in the northern hemisphere. The exact resulting aspect
 * ratio is whatever this real computation produces, not a number
 * chosen in advance; it lands in the neighborhood of the previously
 * discussed 1.55-1.7 range for Equal Earth's actual geometry, but this
 * file no longer asserts an exact figure, since asserting one is
 * exactly the kind of unverified assumption that caused the original
 * bug.
 */

const WORLD_WIDTH = 600;
// Small breathing room around the tightest possible bounding box, in
// the same units as the projection output, so land at the very edge
// (Alaska, New Zealand) isn't rendered flush against the frame.
// Tightened twice now (originally 14, then 6, now 4) to give the
// geography a progressively more filled feel within its frame, each
// time a deliberately small step — this only ever changes how much
// margin surrounds the ALREADY-fully-included inhabited-world bounds,
// never which features are in those bounds, so Alaska, Hawaii,
// Iceland, Japan, Australia, and New Zealand can never be cropped by
// adjusting this number alone.
const PADDING = 4;
// Antarctica alone lies entirely south of this line; nothing else does.
const ANTARCTICA_LATITUDE_THRESHOLD = -60;

const topology = worldTopology as unknown as Topology;
const allCountries = feature(
  topology,
  topology.objects.countries as GeometryCollection
) as unknown as FeatureCollection<Geometry>;

const inhabitedFeatures: Feature<Geometry>[] = allCountries.features.filter((f) => {
  const [, maxLat] = geoBounds(f)[1];
  return maxLat > ANTARCTICA_LATITUDE_THRESHOLD;
});
const inhabitedWorld: FeatureCollection<Geometry> = {
  type: "FeatureCollection",
  features: inhabitedFeatures,
};

const projection: GeoProjection = geoEqualEarth();
// Fit scale/translate to the INHABITED world specifically (Antarctica
// excluded from this calculation too, not just from what's drawn) —
// there's no reason Antarctica's geometry should influence the scale
// of a map that never shows it.
projection.fitWidth(WORLD_WIDTH, inhabitedWorld);

// .digits(5) fixes the SAME class of hydration-mismatch risk
// roundSvgNumber below exists for, but for the generated path STRINGS
// specifically: worldCountryPaths is module-level code, evaluated
// separately on the server (during SSR) and again on the client (when
// this module loads there too) — d3-geo's own path-string generation
// can otherwise emit a coordinate at full floating-point precision,
// which carries the exact same cross-environment last-bit risk
// projectPoint's coordinates have. Pinning the digit count makes the
// generated path data byte-identical between server and client,
// deterministically, the same way rounding fixes it for circles.
const pathGenerator = geoPath(projection).digits(5);
const bounds = pathGenerator.bounds(inhabitedWorld);

// Rounded here too, same reason as roundSvgNumber's own doc comment
// below: bounds() returns raw floating-point numbers, unaffected by
// pathGenerator's .digits() (that only controls generated path
// STRINGS). WORLD_VIEWBOX feeds the SVG's own viewBox attribute
// directly, which React hydration-checks like any other prop — left
// unrounded, this module-level computation could itself differ by a
// last bit between the server and client evaluations of this same
// file, which would be a more fundamental mismatch than the circles.
const viewBoxX = roundSvgNumber(bounds[0][0] - PADDING);
const viewBoxY = roundSvgNumber(bounds[0][1] - PADDING);
const viewBoxWidth = roundSvgNumber(bounds[1][0] - bounds[0][0] + PADDING * 2);
const viewBoxHeight = roundSvgNumber(bounds[1][1] - bounds[0][1] + PADDING * 2);

/** Passed directly to the <svg viewBox="..."> in travel-map.tsx. */
export const WORLD_VIEWBOX = `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`;
export const WORLD_VIEW_WIDTH = viewBoxWidth;
export const WORLD_VIEW_HEIGHT = viewBoxHeight;
// The viewBox's own origin — NOT necessarily (0, 0), since it's a
// padded crop of the projected bounds, offset by wherever the
// inhabited world's own bounding box happens to start. Anything that
// converts a projected (x, y) coordinate into a percentage-of-viewBox
// position (the HTML tooltip overlay in travel-map.tsx, specifically)
// must subtract this origin first — the projected SVG coordinates
// themselves are already correct and don't need this, only the
// separate percentage-based positioning math does.
export const WORLD_VIEW_X = viewBoxX;
export const WORLD_VIEW_Y = viewBoxY;

/** One precomputed SVG path `d` string per (non-Antarctic) country
 *  polygon, ready to render directly as <path d={...} />. Computed
 *  once, here, never regenerated per render or per user. */
export const worldCountryPaths: string[] = inhabitedFeatures
  .map((f) => pathGenerator(f))
  .filter((d): d is string => d !== null);

/**
 * Projects a real latitude/longitude into the SAME fixed world
 * projection the country paths above were generated from, so a dot
 * and the coastline beneath it are always geographically consistent.
 */
/**
 * Rounds a projected coordinate (or any derived SVG number) to a
 * stable, fixed decimal precision. This is the actual hydration fix:
 * d3-geo's projection math can produce a value like 48.85445508179734
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

export function projectPoint(latitude: number, longitude: number): [number, number] | null {
  const projected = projection([longitude, latitude]);
  if (!projected) return null;
  return [roundSvgNumber(projected[0]), roundSvgNumber(projected[1])];
}
