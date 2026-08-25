const DEFAULT_RADIUS_DEGREES = 0.15; // roughly a 10-mile-ish box at most US latitudes

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** A simple square bounding box around a center point, in plain
 *  degrees, deliberately not a precise circular radius, that's what
 *  the RPC's bbox filter needs, precise distance is computed
 *  separately (see haversineMiles) only across the small result set
 *  that survives this filter. */
export function boundsAroundPoint(lat: number, lng: number, radiusDegrees = DEFAULT_RADIUS_DEGREES): Bounds {
  return {
    minLat: lat - radiusDegrees,
    maxLat: lat + radiusDegrees,
    minLng: lng - radiusDegrees,
    maxLng: lng + radiusDegrees,
  };
}

/** Real distance in miles, using the standard Haversine formula.
 *  Deliberately only ever called across an already bbox-filtered,
 *  small result set (at most 100 rows), never used as the primary
 *  database filter itself, that's what the indexed bounding box is
 *  for. */
export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const EARTH_RADIUS_MILES = 3958.8;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}
