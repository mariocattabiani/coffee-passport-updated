"use client";

import { useEffect, useRef, useState } from "react";
import { MarkerClusterer, SuperClusterAlgorithm } from "@googlemaps/markerclusterer";

import { loadMapsLibrary, loadMarkerLibrary, loadCoreLibrary } from "@/lib/google-maps/loader";
import { buildLabelMarker, type LabelMarkerHandle } from "@/lib/explore/label-marker";
import { MapCafePreview } from "@/components/explore/map-cafe-preview";
import type { DiscoveryResult } from "@/lib/explore/actions";
import type { ExternalCafeResult } from "@/lib/explore/nearby-search-actions";

interface ExploreMapProps {
  /** "embedded" (default) is the compact box used in the desktop split
   *  view and the old mobile card, "fullscreen" fills its fixed-
   *  position parent (MobileMapView) edge to edge instead. */
  variant?: "embedded" | "fullscreen";
  items: DiscoveryResult[];
  selectedShopId: string | null;
  onSelectShop: (shopId: string) => void;
  externalItems?: ExternalCafeResult[];
  selectedExternalPlaceId?: string | null;
  onSelectExternal?: (googlePlaceId: string) => void;
  onCenterSettled?: (lat: number, lng: number, zoom: number) => void;
  selectedDistanceMiles?: number | null;
  openingExternalId?: string | null;
  onViewStored?: (shopId: string) => void;
  onViewExternal?: (item: ExternalCafeResult) => void;
  onDismissSelection?: () => void;
  /** Where to center when there are zero markers to fit bounds
   *  against (a "Find coffee near me" with no results yet, for
   *  instance), and the target for an explicit recenter tap. Never
   *  used to fire a Google request, purely a camera move. */
  centerHint?: { lat: number; lng: number } | null;
  /** A deterministic starting camera. When provided, marker bounds do
   *  not override it; this is used by the fullscreen mobile finder to
   *  open locally and to restore a user-controlled viewport. */
  initialViewport?: { center: { lat: number; lng: number }; zoom: number } | null;
  /** Browser-geolocation coordinates, rendered as a standalone,
   *  non-clustered "you are here" marker and used by recenter. */
  currentLocation?: { lat: number; lng: number } | null;
  /** Increment this to explicitly recenter on centerHint, a plain map
   *  camera move, this never triggers a search on its own. */
  recenterToken?: number;
}

// Mirrors Passport CoffeeMap's clamp: a single café (or a very tight
// cluster) can make fitBounds zoom in absurdly close. Also the
// "useful neighborhood/city discovery scale" target for Find Coffee
// Near Me, close enough to see individual cafés immediately.
const MAX_FIT_ZOOM = 14;

// Clustering should only kick in at genuinely zoomed-out views (broad
// metro, regional, state-level), not at city or neighborhood zoom.
const CLUSTER_MAX_ZOOM = 10;
const CLUSTER_RADIUS = 40;

// Priority ladder for AdvancedMarkerElement's native collisionBehavior
// (confirmed supported: this map already requires a Map ID, meaning
// vector rendering, which is what full collision detection needs).
// Selected always wins and hides anything optional overlapping it,
// stored outranks external when both are merely optional, matching
// the requested selected > stored > external ladder. This is Google's
// own built-in mechanism, not a custom geometry/layout engine.
const ZINDEX_SELECTED = 1000;
const ZINDEX_STORED = 100;
const ZINDEX_EXTERNAL = 10;

/**
 * Aligned with the proven components/passport/coffee-map.tsx pattern
 * throughout: same Map ID guard, same constructor options, same
 * bounds/single-vs-multi handling, same error state instead of a
 * silently swallowed exception, same dev-only capability diagnostic.
 */
export function ExploreMap({
  variant = "embedded",
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
  centerHint = null,
  initialViewport = null,
  currentLocation = null,
  recenterToken,
}: ExploreMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const boundsRef = useRef<google.maps.LatLngBounds | null>(null);
  const markersRef = useRef<Map<string, { marker: google.maps.marker.AdvancedMarkerElement; handle: LabelMarkerHandle }>>(
    new Map()
  );
  const externalMarkersRef = useRef<
    Map<string, { marker: google.maps.marker.AdvancedMarkerElement; handle: LabelMarkerHandle }>
  >(new Map());
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
    let locationMarker: google.maps.marker.AdvancedMarkerElement | null = null;
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
        const { AdvancedMarkerElement, CollisionBehavior } = await loadMarkerLibrary();
        const { LatLngBounds } = await loadCoreLibrary();

        if (cancelled || !mapContainerRef.current) return;

        const map = new Map(mapContainerRef.current, {
          mapId,
          center: initialViewport?.center ?? centerHint ?? { lat: 39.8283, lng: -98.5795 },
          zoom: initialViewport?.zoom ?? (centerHint ? MAX_FIT_ZOOM : 4),
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
        }

        if (onCenterSettled) {
          map.addListener("idle", () => {
            if (!skippedFirstIdle) {
              skippedFirstIdle = true;
              return;
            }
            const center = map.getCenter();
            if (center) onCenterSettled(center.lat(), center.lng(), map.getZoom() ?? MAX_FIT_ZOOM);
          });
        }

        if (onDismissSelection) {
          map.addListener("click", () => onDismissSelection());
        }

        try {
          const bounds = new LatLngBounds();
          const markers: google.maps.marker.AdvancedMarkerElement[] = [];
          markersRef.current.clear();
          externalMarkersRef.current.clear();

          items.forEach((item) => {
            const handle = buildLabelMarker(item.name, "stored");
            const marker = new AdvancedMarkerElement({
              position: { lat: item.latitude, lng: item.longitude },
              title: item.name,
              content: handle.element,
            });
            marker.zIndex = ZINDEX_STORED;
            marker.collisionBehavior = CollisionBehavior.OPTIONAL_AND_HIDES_LOWER_PRIORITY;
            marker.addListener("click", () => onSelectShop(item.shopId));
            markersRef.current.set(item.shopId, { marker, handle });
            markers.push(marker);
            bounds.extend({ lat: item.latitude, lng: item.longitude });
          });

          externalItems.forEach((item) => {
            const handle = buildLabelMarker(item.name, "external");
            const marker = new AdvancedMarkerElement({
              position: { lat: item.latitude, lng: item.longitude },
              title: item.name,
              content: handle.element,
            });
            marker.zIndex = ZINDEX_EXTERNAL;
            marker.collisionBehavior = CollisionBehavior.OPTIONAL_AND_HIDES_LOWER_PRIORITY;
            marker.addListener("click", () => onSelectExternal?.(item.googlePlaceId));
            externalMarkersRef.current.set(item.googlePlaceId, { marker, handle });
            markers.push(marker);
            bounds.extend({ lat: item.latitude, lng: item.longitude });
          });

          if (currentLocation) {
            const dot = document.createElement("div");
            dot.className =
              "h-4 w-4 rounded-full border-[3px] border-white bg-sage shadow-[0_0_0_3px_rgba(111,143,114,0.3)]";
            locationMarker = new AdvancedMarkerElement({
              map,
              position: currentLocation,
              title: "Your location",
              content: dot,
              collisionBehavior: CollisionBehavior.REQUIRED,
              zIndex: ZINDEX_SELECTED + 1,
            });
          }

          boundsRef.current = bounds;

          if (!initialViewport && markers.length === 0 && centerHint) {
            // Find Coffee Near Me should still center on the person
            // even if nothing was found nearby, rather than leaving
            // the map on its unrelated wide default view.
            map.setCenter(centerHint);
            map.setZoom(MAX_FIT_ZOOM);
          } else if (markers.length === 1) {
            const only = markersRef.current.size === 1 ? items[0] : externalItems[0];
            if (!initialViewport) {
              map.setCenter({ lat: only.latitude, lng: only.longitude });
              map.setZoom(MAX_FIT_ZOOM);
            }
            markers[0].map = map;
            singleMarker = markers[0];
          } else if (markers.length > 1) {
            clusterer = new MarkerClusterer({
              map,
              markers,
              algorithm: new SuperClusterAlgorithm({ maxZoom: CLUSTER_MAX_ZOOM, radius: CLUSTER_RADIUS }),
            });
            clustererRef.current = clusterer;
            if (!initialViewport) {
              map.fitBounds(bounds);
              google.maps.event.addListenerOnce(map, "bounds_changed", () => {
                if ((map.getZoom() ?? 0) > MAX_FIT_ZOOM) {
                  map.setZoom(MAX_FIT_ZOOM);
                }
              });
            }
          }
        } catch (markerErr) {
          if (process.env.NODE_ENV !== "production") {
            console.error("[Explore Map] marker initialization failed:", markerErr);
          }
        }

        if (mapContainerRef.current && typeof ResizeObserver !== "undefined") {
          const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const { width, height } = entry.contentRect;
            if (width === 0 || height === 0) return;
            google.maps.event.trigger(map, "resize");
            const totalMarkers = markersRef.current.size + externalMarkersRef.current.size;
            if (!initialViewport && boundsRef.current && totalMarkers > 1) {
              map.fitBounds(boundsRef.current);
            } else if (!initialViewport && totalMarkers === 1) {
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
      if (locationMarker) {
        locationMarker.map = null;
        locationMarker = null;
      }
      clusterer?.clearMarkers();
      clusterer = null;
      clustererRef.current = null;
      markersRef.current.forEach(({ marker }) => {
        marker.map = null;
      });
      markersRef.current.clear();
      externalMarkersRef.current.forEach(({ marker }) => {
        marker.map = null;
      });
      externalMarkersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, externalItemsKey]);

  // Recenter is a pure camera move, never a new search, only runs when
  // the token actually changes (an explicit tap), and only if the map
  // and a center are both available.
  useEffect(() => {
    const recenterTarget = currentLocation ?? centerHint;
    if (recenterToken === undefined || !recenterTarget || !mapRef.current) return;
    mapRef.current.setCenter(recenterTarget);
    mapRef.current.setZoom(variant === "fullscreen" ? 15 : MAX_FIT_ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterToken]);

  // Restyles the already-built marker in place (chip color/border plus
  // zIndex/collisionBehavior) rather than rebuilding the marker set,
  // selected always wins collisions over anything merely optional.
  useEffect(() => {
    markersRef.current.forEach(({ marker, handle }, shopId) => {
      const selected = shopId === selectedShopId;
      handle.setSelected(selected);
      marker.zIndex = selected ? ZINDEX_SELECTED : ZINDEX_STORED;
      marker.collisionBehavior = selected
        ? google.maps.CollisionBehavior.REQUIRED_AND_HIDES_OPTIONAL
        : google.maps.CollisionBehavior.OPTIONAL_AND_HIDES_LOWER_PRIORITY;
    });
  }, [selectedShopId]);

  useEffect(() => {
    externalMarkersRef.current.forEach(({ marker, handle }, placeId) => {
      const selected = placeId === selectedExternalPlaceId;
      handle.setSelected(selected);
      marker.zIndex = selected ? ZINDEX_SELECTED : ZINDEX_EXTERNAL;
      marker.collisionBehavior = selected
        ? google.maps.CollisionBehavior.REQUIRED_AND_HIDES_OPTIONAL
        : google.maps.CollisionBehavior.OPTIONAL_AND_HIDES_LOWER_PRIORITY;
    });
  }, [selectedExternalPlaceId]);

  const selectedStoredItem = selectedShopId ? items.find((i) => i.shopId === selectedShopId) ?? null : null;
  const selectedExternalItem = selectedExternalPlaceId
    ? externalItems.find((i) => i.googlePlaceId === selectedExternalPlaceId) ?? null
    : null;

  const containerClass =
    variant === "fullscreen"
      ? "relative h-full w-full overflow-hidden"
      : "relative h-80 w-full overflow-hidden rounded-2xl border border-border/60 shadow-soft sm:h-[500px]";

  return (
    <div className={containerClass}>
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
          card's own highlight, right next to the map. */}
      {(selectedStoredItem || selectedExternalItem) && (
        <div className={variant === "fullscreen" ? "" : "lg:hidden"}>
          {selectedStoredItem && onViewStored && onDismissSelection && (
            <MapCafePreview
              item={{ source: "stored", data: selectedStoredItem }}
              distanceMiles={selectedDistanceMiles}
              opening={false}
              onView={() => onViewStored(selectedStoredItem.shopId)}
              onDismiss={onDismissSelection}
              variant={variant}
            />
          )}
          {selectedExternalItem && onViewExternal && onDismissSelection && (
            <MapCafePreview
              item={{ source: "external", data: selectedExternalItem }}
              distanceMiles={selectedDistanceMiles}
              opening={openingExternalId === selectedExternalItem.googlePlaceId}
              onView={() => onViewExternal(selectedExternalItem)}
              onDismiss={onDismissSelection}
              variant={variant}
            />
          )}
        </div>
      )}
    </div>
  );
}
