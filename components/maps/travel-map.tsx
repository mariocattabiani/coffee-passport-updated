"use client";

import { useEffect, useRef, useState } from "react";

import { loadMapsLibrary, loadMarkerLibrary, loadCoreLibrary } from "@/lib/google-maps/loader";

export interface TravelMapPoint {
  locationId: string;
  city: string;
  region: string | null;
  country: string;
  latitude: number;
  longitude: number;
  cafeCount: number;
  drinkCount: number;
}

interface TravelMapProps {
  points: TravelMapPoint[];
}

// A single point (or a very tight cluster of nearby cities) can make
// fitBounds zoom in absurdly close — same clamp the previous per-shop
// map used.
const MAX_SINGLE_POINT_ZOOM = 10;

/**
 * RENDERING TECHNOLOGY, STATED HONESTLY: this still uses Google Maps
 * (the same loader/mapId/marker architecture Explore already uses, and
 * that was already approved), not a bundled real-coastline basemap.
 * The intended direction (Natural Earth/GeoJSON, bundled locally, no
 * API call) is the right target, but this sandbox has no network
 * access to fetch, inspect, or verify a real geographic asset — and
 * hand-drawing continent shapes from memory would mean shipping
 * geography that was never actually checked against anything real.
 * Per explicit instruction, faking that is worse than not doing it:
 * Google Maps — a real, licensed, already-working renderer — stays in
 * place until a real asset can be sourced with actual network access.
 *
 * What DID change, and is the actual point of this component: it now
 * plots CANONICAL LOCATIONS (one marker per city, from
 * public.locations, via shops.location_id), not individual shop
 * coordinates. A shop needs a resolved location, never its own exact
 * lat/lng — which is the real fix, independent of which renderer
 * eventually draws the dots. No per-marker clustering logic is needed
 * here (unlike the old per-shop map): the data arriving in `points` is
 * already aggregated to one entry per city before this component ever
 * sees it (see app/passport/page.tsx and profile_map_v2.sql).
 *
 * mapId-based cloud styling (configured in Google Cloud Console, not
 * in this code) is what keeps roads/POIs/business labels off — same
 * mechanism the previous per-shop map already relied on, unchanged.
 * streetView/mapType/fullscreen controls are explicitly disabled below.
 */
export function TravelMap({ points }: TravelMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TravelMapPoint | null>(null);

  useEffect(() => {
    // Nothing to show, the Maps JavaScript API is never even loaded —
    // no map-load billing for a person/profile with no resolved
    // locations yet.
    if (points.length === 0) return;
    if (!containerRef.current) return;

    let cancelled = false;
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];

    async function init() {
      const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;
      if (!mapId) {
        setError("Map isn't configured yet. Add NEXT_PUBLIC_GOOGLE_MAP_ID to enable it.");
        return;
      }

      try {
        const { Map } = await loadMapsLibrary();
        const { AdvancedMarkerElement, PinElement } = await loadMarkerLibrary();
        const { LatLngBounds } = await loadCoreLibrary();

        if (cancelled || !containerRef.current) return;

        const map = new Map(containerRef.current, {
          mapId,
          center: { lat: points[0].latitude, lng: points[0].longitude },
          zoom: 4,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });

        const bounds = new LatLngBounds();
        points.forEach((p) => bounds.extend({ lat: p.latitude, lng: p.longitude }));

        map.fitBounds(bounds, 48);
        google.maps.event.addListenerOnce(map, "bounds_changed", () => {
          if ((map.getZoom() ?? 0) > MAX_SINGLE_POINT_ZOOM) {
            map.setZoom(MAX_SINGLE_POINT_ZOOM);
          }
        });

        // Subtle size differentiation only (Part 18: not a bubble
        // chart) — a light city stays close to the base size, a very
        // active one is only modestly larger, sqrt-scaled.
        const baseScale = 1;
        for (const point of points) {
          const scale = Math.min(baseScale + Math.sqrt(point.drinkCount) * 0.12, baseScale + 0.6);
          const pin = new PinElement({
            background: "#5B3A29",
            borderColor: "#FAF8F4",
            glyphColor: "#FAF8F4",
            scale,
          });

          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: point.latitude, lng: point.longitude },
            title: `${point.city}, ${point.country}`,
            content: pin.element,
          });
          marker.addListener("click", () => setSelected(point));
          markers.push(marker);
        }
      } catch (err) {
        if (!cancelled) {
          setError("The map couldn't load right now. Please try again later.");
        }
        if (process.env.NODE_ENV !== "production") {
          console.error("Travel Map marker initialization error:", err);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      markers.forEach((m) => {
        m.map = null;
      });
    };
  }, [points]);

  if (points.length === 0) return null;

  return (
    <div>
      <div className="relative h-80 w-full overflow-hidden rounded-2xl border border-border/60 shadow-soft sm:h-[500px]">
        {error ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-espresso/5 px-6 text-center">
            <p className="text-sm text-charcoal/50">{error}</p>
          </div>
        ) : (
          <div ref={containerRef} className="h-full w-full" />
        )}
      </div>

      {selected && (
        <div className="mt-3 flex items-start justify-between gap-4 rounded-xl border border-border bg-white p-4 shadow-soft">
          <div>
            <p className="font-heading text-base font-semibold text-espresso">
              {selected.city}
              {selected.region ? `, ${selected.region}` : ""}, {selected.country}
            </p>
            <div className="mt-1.5 flex items-center gap-3 text-xs text-charcoal/50">
              <span>
                {selected.cafeCount} {selected.cafeCount === 1 ? "café" : "cafés"}
              </span>
              <span>
                {selected.drinkCount} {selected.drinkCount === 1 ? "drink" : "drinks"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="shrink-0 text-xs font-medium text-charcoal/40 hover:text-charcoal/70"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
