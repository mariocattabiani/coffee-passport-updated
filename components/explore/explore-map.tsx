"use client";

import { useEffect, useRef, useState } from "react";
import { MarkerClusterer, SuperClusterAlgorithm } from "@googlemaps/markerclusterer";

import { loadMapsLibrary, loadMarkerLibrary, loadCoreLibrary } from "@/lib/google-maps/loader";
import { MapCafePreview } from "@/components/explore/map-cafe-preview";
import type { DiscoveryResult } from "@/lib/explore/actions";
import type { ExternalCafeResult } from "@/lib/explore/nearby-search-actions";

interface ExploreMapProps {
  /** Stored Coffee Passport shops, solid espresso markers. */
  items: DiscoveryResult[];
  selectedShopId: string | null;
  onSelectShop: (shopId: string) => void;
  /** External cafés from an explicit "Search this area" click only,
   *  lighter outlined markers, visually distinct from stored ones.
   *  Empty until the person actually searches. */
  externalItems?: ExternalCafeResult[];
  selectedExternalPlaceId?: string | null;
  onSelectExternal?: (googlePlaceId: string) => void;
  /** Fires only after a drag or zoom genuinely settles (the map's own
   *  idle event), never on every pan frame, and never on the very
   *  first idle right after the initial programmatic center/fitBounds.
   *  This never triggers a Google Places request itself, it only
   *  updates local state so "Search this area" knows what center to
   *  use if the person explicitly presses it. */
  onCenterSettled?: (lat: number, lng: number) => void;
  /** Distance for whichever item is currently selected, if location is
   *  known, used only by the mobile preview card. */
  selectedDistanceMiles?: number | null;
  /** True while the selected external café's "View café" is resolving
   *  (find-or-open-dialog), mirrors the same state the list card uses. */
  openingExternalId?: string | null;
  /** "View café" from the mobile preview, for a stored result this is
   *  just navigation, for an external one it reuses the exact same
   *  find-existing-or-open-dialog flow the list card already uses,
   *  marker selection itself never triggers either. */
  onViewStored?: (shopId: string) => void;
  onViewExternal?: (item: ExternalCafeResult) => void;
  /** Closes the mobile preview, from its own close button or from
   *  tapping empty map space. */
  onDismissSelection?: () => void;
}

// Mirrors Passport CoffeeMap's clamp: a single café (or a very tight
// cluster) can make fitBounds zoom in absurdly close.
const MAX_FIT_ZOOM = 14;

// Clustering should only kick in at genuinely zoomed-out views (broad
// metro, regional, state-level), not at city or neighborhood zoom.
// Google Maps zoom ~11-13 is a typical "viewing a whole city" range
// (Harrisburg, for instance), so capping clustering at zoom 10 means
// individual café pins show from city zoom all the way in through
// neighborhoods and streets, and clustering only activates once the
// view is wide enough to span multiple cities or a region. The radius
// is also tightened from the library's own default (~60px) so that,
// even within the zoom range where clustering is active, only markers
// that are genuinely close enough to visually overlap get grouped,
// rather than a wide catch-all radius sweeping in anything nearby.
const CLUSTER_MAX_ZOOM = 10;
const CLUSTER_RADIUS = 40;

/**
 * Aligned with the proven components/passport/coffee-map.tsx pattern
 * throughout: same Map ID guard, same constructor options, same
 * bounds/single-vs-multi handling, same error state instead of a
 * silently swallowed exception, same dev-only capability diagnostic.
 *
 * Differences from Passport, all deliberate: selection is controlled
 * from outside rather than owned internally, that's what keeps the
 * list and map in sync without a scroll loop. This component can be
 * mounted inside a CSS-hidden container (the mobile List/Map toggle),
 * so a ResizeObserver recovers it once actually visible. And it now
 * renders two visually distinct marker families, stored and external,
 * the latter only ever populated after an explicit search, never
 * automatically.
 */
export function ExploreMap({
  items,
  selectedShopId,
  onSelectShop,
  externalItems = [],
  selectedExternalPlaceId = null,
  onSelectExternal,
  onCenterSettled,
  selectedDistanceMiles = null,
  openingExternalId = null,
  onViewStored,
  onViewExternal,
  onDismissSelection,
}: ExploreMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const boundsRef = useRef<google.maps.LatLngBounds | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const externalMarkersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const itemsKey = items.map((i) => i.shopId).join(",");
  const externalItemsKey = externalItems.map((i) => i.googlePlaceId).join(",");

  useEffect(() => {
    if (!mapContainerRef.current) return;

    let cancelled = false;
    let clusterer: MarkerClusterer | null = null;
    let singleMarker: google.maps.marker.AdvancedMarkerElement | null = null;
    let skippedFirstIdle = false;

    async function init() {
      setMapError(null);

      const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;
      if (!mapId) {
        setMapError("Map isn't configured yet.");
        return;
      }

      try {
        const { Map } = await loadMapsLibrary();
        const { AdvancedMarkerElement, PinElement } = await loadMarkerLibrary();
        const { LatLngBounds } = await loadCoreLibrary();

        if (cancelled || !mapContainerRef.current) return;

        // Base map first, before any marker/pin/clusterer logic runs,
        // exactly the order requested: the visible basemap should never
        // depend on marker construction succeeding.
        const map = new Map(mapContainerRef.current, {
          mapId,
          center: { lat: 39.8283, lng: -98.5795 },
          zoom: 4,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;

        if (process.env.NODE_ENV !== "production") {
          map.addListener("mapcapabilities_changed", () => {
            const capabilities = map.getMapCapabilities();
            console.warn("[Explore Map diagnostic] mapcapabilities_changed:", {
              isAdvancedMarkersAvailable: capabilities.isAdvancedMarkersAvailable,
            });
          });
          const initialCapabilities = map.getMapCapabilities();
          console.warn("[Explore Map diagnostic] initial capabilities:", {
            isAdvancedMarkersAvailable: initialCapabilities.isAdvancedMarkersAvailable,
          });
        }

        // Reports a settled center after the person actually drags or
        // zooms, never on the initial programmatic fitBounds/setCenter
        // that construction itself triggers, that first idle is
        // skipped explicitly. Never fires a Google Places request,
        // only updates local state in the parent.
        if (onCenterSettled) {
          map.addListener("idle", () => {
            if (!skippedFirstIdle) {
              skippedFirstIdle = true;
              return;
            }
            const center = map.getCenter();
            if (center) onCenterSettled(center.lat(), center.lng());
          });
        }

        // Tapping empty map space dismisses the mobile preview, marker
        // clicks have their own listeners on the marker's own content
        // element and don't bubble into this.
        if (onDismissSelection) {
          map.addListener("click", () => onDismissSelection());
        }

        // Marker setup happens after the map is confirmed constructed,
        // in its own try/catch: if this part fails, the already-visible
        // basemap is left alone rather than being replaced by an error
        // overlay for a problem that isn't actually a basemap problem.
        try {
          const bounds = new LatLngBounds();
          const markers: google.maps.marker.AdvancedMarkerElement[] = [];
          markersRef.current.clear();
          externalMarkersRef.current.clear();

          const buildStoredPin = () =>
            new PinElement({
              background: "#5B3A29",
              borderColor: "#C99A3B",
              glyphColor: "#FAF8F4",
            });

          // Crema fill, sage border/glyph, a clearly lighter, more
          // provisional treatment than the solid espresso stored pin,
          // still within the existing Coffee Passport palette.
          const buildExternalPin = () =>
            new PinElement({
              background: "#FAF8F4",
              borderColor: "#6F8F72",
              glyphColor: "#6F8F72",
            });

          items.forEach((item) => {
            const pin = buildStoredPin();
            const marker = new AdvancedMarkerElement({
              position: { lat: item.latitude, lng: item.longitude },
              title: item.name,
              content: pin.element,
            });
            marker.addListener("click", () => onSelectShop(item.shopId));
            markersRef.current.set(item.shopId, marker);
            markers.push(marker);
            bounds.extend({ lat: item.latitude, lng: item.longitude });
          });

          externalItems.forEach((item) => {
            const pin = buildExternalPin();
            const marker = new AdvancedMarkerElement({
              position: { lat: item.latitude, lng: item.longitude },
              title: item.name,
              content: pin.element,
            });
            marker.addListener("click", () => onSelectExternal?.(item.googlePlaceId));
            externalMarkersRef.current.set(item.googlePlaceId, marker);
            markers.push(marker);
            bounds.extend({ lat: item.latitude, lng: item.longitude });
          });

          boundsRef.current = bounds;

          if (markers.length === 1) {
            // Mirrors Passport: nothing to cluster with exactly one
            // marker, MarkerClusterer's map-attachment path was
            // unreliable for a lone marker, attach directly instead.
            const only = markersRef.current.size === 1 ? items[0] : externalItems[0];
            map.setCenter({ lat: only.latitude, lng: only.longitude });
            map.setZoom(MAX_FIT_ZOOM);
            markers[0].map = map;
            singleMarker = markers[0];
          } else if (markers.length > 1) {
            clusterer = new MarkerClusterer({
              map,
              markers,
              algorithm: new SuperClusterAlgorithm({ maxZoom: CLUSTER_MAX_ZOOM, radius: CLUSTER_RADIUS }),
            });
            clustererRef.current = clusterer;
            map.fitBounds(bounds);
            google.maps.event.addListenerOnce(map, "bounds_changed", () => {
              if ((map.getZoom() ?? 0) > MAX_FIT_ZOOM) {
                map.setZoom(MAX_FIT_ZOOM);
              }
            });
          }
        } catch (markerErr) {
          if (process.env.NODE_ENV !== "production") {
            console.error("[Explore Map] marker initialization failed:", markerErr);
          }
          // Deliberately no setMapError here, the basemap above already
          // rendered successfully, losing markers isn't the same class
          // of failure as losing the map entirely.
        }

        // Recovers from being initialized (or resized) while the
        // container was effectively zero-sized, the mobile List/Map
        // toggle hides this component's container with display:none
        // rather than unmounting it, and Google Maps caches the size
        // it saw at construction time, it doesn't relayout on its own
        // when a hidden ancestor becomes visible again.
        if (mapContainerRef.current && typeof ResizeObserver !== "undefined") {
          const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const { width, height } = entry.contentRect;
            if (width === 0 || height === 0) return;
            google.maps.event.trigger(map, "resize");
            const totalMarkers = markersRef.current.size + externalMarkersRef.current.size;
            if (boundsRef.current && totalMarkers > 1) {
              map.fitBounds(boundsRef.current);
            } else if (totalMarkers === 1) {
              const only = items[0] ?? externalItems[0];
              if (only) map.setCenter({ lat: only.latitude, lng: only.longitude });
            }
          });
          observer.observe(mapContainerRef.current);
          resizeObserverRef.current = observer;
        }
      } catch (err) {
        if (!cancelled) {
          setMapError("The map couldn't load right now.");
        }
        if (process.env.NODE_ENV !== "production") {
          // The caught error object itself is sufficient for debugging
          // and never contains the API key, Map ID, coordinates, or
          // shop/user data, those never enter this catch block.
          console.error("[Explore Map] initialization failed:", err);
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      if (singleMarker) {
        singleMarker.map = null;
        singleMarker = null;
      }
      clusterer?.clearMarkers();
      clusterer = null;
      clustererRef.current = null;
      markersRef.current.forEach((m) => {
        m.map = null;
      });
      markersRef.current.clear();
      externalMarkersRef.current.forEach((m) => {
        m.map = null;
      });
      externalMarkersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, externalItemsKey]);

  // Highlight whichever stored marker matches the externally-controlled
  // selection, without re-running the whole init effect.
  useEffect(() => {
    markersRef.current.forEach((marker, shopId) => {
      const el = marker.content as HTMLElement | null;
      if (!el) return;
      el.style.filter = shopId === selectedShopId ? "drop-shadow(0 0 0 transparent) brightness(1.15)" : "";
      el.style.zIndex = shopId === selectedShopId ? "10" : "";
    });
  }, [selectedShopId]);

  // Same for external markers, its own selection value, independent of
  // the stored one.
  useEffect(() => {
    externalMarkersRef.current.forEach((marker, placeId) => {
      const el = marker.content as HTMLElement | null;
      if (!el) return;
      el.style.filter = placeId === selectedExternalPlaceId ? "drop-shadow(0 0 0 transparent) brightness(1.1)" : "";
      el.style.zIndex = placeId === selectedExternalPlaceId ? "10" : "";
    });
  }, [selectedExternalPlaceId]);

  const selectedStoredItem = selectedShopId ? items.find((i) => i.shopId === selectedShopId) ?? null : null;
  const selectedExternalItem = selectedExternalPlaceId
    ? externalItems.find((i) => i.googlePlaceId === selectedExternalPlaceId) ?? null
    : null;

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-2xl border border-border/60 shadow-soft sm:h-[500px]">
      {mapError ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-espresso/5 px-6 text-center">
          <p className="text-sm text-charcoal/50">{mapError}</p>
        </div>
      ) : (
        <div ref={mapContainerRef} className="h-full w-full" />
      )}
      {!mapError && items.length === 0 && externalItems.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-crema/80 p-6 text-center">
          <p className="text-sm text-charcoal/50">No cafés to show on the map here yet.</p>
        </div>
      )}

      {/* Mobile only, desktop already shows selection via the list
          card's own highlight, right next to the map, no overlay
          needed there. */}
      {(selectedStoredItem || selectedExternalItem) && (
        <div className="sm:hidden">
          {selectedStoredItem && onViewStored && onDismissSelection && (
            <MapCafePreview
              item={{ source: "stored", data: selectedStoredItem }}
              distanceMiles={selectedDistanceMiles}
              opening={false}
              onView={() => onViewStored(selectedStoredItem.shopId)}
              onDismiss={onDismissSelection}
            />
          )}
          {selectedExternalItem && onViewExternal && onDismissSelection && (
            <MapCafePreview
              item={{ source: "external", data: selectedExternalItem }}
              distanceMiles={selectedDistanceMiles}
              opening={openingExternalId === selectedExternalItem.googlePlaceId}
              onView={() => onViewExternal(selectedExternalItem)}
              onDismiss={onDismissSelection}
            />
          )}
        </div>
      )}
    </div>
  );
}
