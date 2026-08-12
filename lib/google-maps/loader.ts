import { Loader } from "@googlemaps/js-api-loader";

let loader: Loader | null = null;

function getLoader(): Loader {
  if (!loader) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("MISSING_GOOGLE_MAPS_API_KEY");
    }
    loader = new Loader({ apiKey, version: "weekly" });
  }
  return loader;
}

/**
 * Loads the "places" library the first time it's actually needed (a
 * real search), never eagerly on page load.
 */
export async function loadPlacesLibrary(): Promise<google.maps.PlacesLibrary> {
  return getLoader().importLibrary("places");
}

/** Loads the "maps" library, only called when the Coffee Map actually
 *  has something to render. */
export async function loadMapsLibrary(): Promise<google.maps.MapsLibrary> {
  return getLoader().importLibrary("maps");
}

/** Loads the "marker" library (AdvancedMarkerElement, PinElement). */
export async function loadMarkerLibrary(): Promise<google.maps.MarkerLibrary> {
  return getLoader().importLibrary("marker");
}

/** Loads the "core" library (LatLng, LatLngBounds, Point, Size, etc.),
 *  the same underlying Loader instance is reused, so this never
 *  triggers a second script load. */
export async function loadCoreLibrary(): Promise<google.maps.CoreLibrary> {
  return getLoader().importLibrary("core");
}
