/**
 * A pure, dependency-free implementation of the Equal Earth map
 * projection - no d3-geo, no browser/DOM APIs, safe to import from
 * both a Node build script and a React Native app.
 *
 * This is the exact closed-form formula published by Bojan Savric,
 * Tom Patterson, and Bernhard Jenny ("The Equal Earth map projection",
 * International Journal of Geographical Information Science, 2018) -
 * the same formula d3-geo's own geoEqualEarth() implements. It is not
 * an approximation or a re-derivation from scratch; it's the actual
 * published mathematical definition of the projection, which is why
 * this module can produce output equivalent to d3-geo without
 * depending on d3-geo itself.
 *
 * KEEP THIS FILE'S FORMULA IN SYNC with the inline copy in
 * scripts/generate-world-map.mjs (that script can't `import` a .ts
 * module without an extra build step, so it duplicates the same
 * constants and math inline specifically so it can cross-validate
 * this module's output against the real d3-geo package at generation
 * time - see that script's own comments). If A1-A4 or M ever change
 * here, they must change there too, or the cross-check becomes
 * meaningless.
 */

const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const M = Math.sqrt(3) / 2;

/**
 * The raw (unscaled, untranslated) Equal Earth projection: longitude
 * and latitude in RADIANS in, [x, y] out in the projection's own
 * native units (centered on the prime meridian and equator, scale 1).
 */
export function equalEarthRaw(lambda: number, phi: number): [number, number] {
  const l = Math.asin(M * Math.sin(phi));
  const l2 = l * l;
  const l6 = l2 * l2 * l2;
  const x = (lambda * Math.cos(l)) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2)));
  const y = l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2));
  return [x, y];
}

/**
 * Projects a longitude/latitude (in degrees) into final [x, y] SVG
 * coordinates, given the fitted scale this app's world geometry was
 * generated with (see lib/maps/generated-world-geography.ts).
 *
 * translate is deliberately NOT a parameter here: the app never needs
 * one. The generation script fits scale so the inhabited world's
 * bounding box is exactly WORLD_WIDTH wide at translate (0, 0), then
 * re-measures the ACTUAL resulting bounds of the generated paths and
 * uses those real bounds - not an assumed translate - to build the
 * SVG viewBox (see components/maps/world-geography.ts). Any (x, y)
 * this function returns is already in that same (0, 0)-translated
 * coordinate space, so it lines up with the precomputed country paths
 * without this function needing to know the viewBox at all.
 *
 * y is negated: increasing latitude (further north) must move UP the
 * rendered map, i.e. to a SMALLER svg y - the standard "north is up"
 * screen convention every d3 projection also follows internally.
 */
export function projectEqualEarth(longitude: number, latitude: number, scale: number): [number, number] {
  const lambda = (longitude * Math.PI) / 180;
  const phi = (latitude * Math.PI) / 180;
  const [x, y] = equalEarthRaw(lambda, phi);
  return [x * scale, -y * scale];
}
