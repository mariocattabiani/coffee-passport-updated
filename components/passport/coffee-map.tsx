"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MarkerClusterer, type Renderer } from "@googlemaps/markerclusterer";

import { loadMapsLibrary, loadMarkerLibrary, loadCoreLibrary } from "@/lib/google-maps/loader";
import { CoffeeMapEmptyState } from "@/components/passport/coffee-map-empty-state";
import { StarDisplay } from "@/components/logs/star-display";

export interface MapShop {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
  visitCount: number;
  avgShopRating: number;
}

interface CoffeeMapProps {
  shops: MapShop[];
}

// A single shop (or a very tight cluster) can make fitBounds zoom in
// absurdly close, this clamps it to a sensible neighborhood level.
const MAX_SINGLE_SHOP_ZOOM = 14;

/**
 * A Coffee Passport-branded cluster: an espresso circle with a crema
 * ring (matching the individual pins exactly) and a soft sage halo, the
 * café count in the center. Renders as an AdvancedMarkerElement rather
 * than MarkerClusterer's default pin, so clusters and individual
 * markers visually belong to the same family.
 */
function createClusterRenderer(
  AdvancedMarkerElementCtor: typeof google.maps.marker.AdvancedMarkerElement
): Renderer {
  return {
    render({ count, position }) {
      const container = document.createElement("div");
      container.style.cssText = [
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "width:40px",
        "height:40px",
        "border-radius:9999px",
        "background:#5B3A29",
        "border:2px solid #FAF8F4",
        "box-shadow:0 0 0 3px rgba(111,143,114,0.35), 0 3px 10px rgba(43,20,10,0.3)",
        "cursor:pointer",
      ].join(";");

      const label = document.createElement("span");
      label.textContent = String(count);
      label.style.cssText = [
        "color:#FAF8F4",
        "font-family:inherit",
        "font-weight:600",
        "font-size:13px",
        "line-height:1",
      ].join(";");
      container.appendChild(label);

      return new AdvancedMarkerElementCtor({
        position,
        content: container,
        title: `${count} cafés`,
        zIndex: 1000 + count,
      });
    },
  };
}

export function CoffeeMap({ shops }: CoffeeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MapShop | null>(null);

  useEffect(() => {
    // Nothing to show, the Maps JavaScript API is never even loaded,
    // no map load billing for a person with no coordinate-backed shops.
    if (shops.length === 0) return;
    if (!containerRef.current) return;

    let cancelled = false;
    let clusterer: MarkerClusterer | null = null;
    let singleMarker: google.maps.marker.AdvancedMarkerElement | null = null;

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
          center: { lat: shops[0].latitude, lng: shops[0].longitude },
          zoom: 12,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });

        // TEMPORARY DEV-ONLY DIAGNOSTIC: confirms whether the active Map
        // ID actually supports Advanced Markers. Logs only the one
        // boolean, never the key, Map ID, coordinates, or shop/user
        // data. Safe to remove once the marker visibility question is
        // resolved.
        if (process.env.NODE_ENV !== "production") {
          map.addListener("mapcapabilities_changed", () => {
            const capabilities = map.getMapCapabilities();
            console.warn("[Coffee Map diagnostic] mapcapabilities_changed:", {
              isAdvancedMarkersAvailable: capabilities.isAdvancedMarkersAvailable,
            });
          });

          const initialCapabilities = map.getMapCapabilities();
          console.warn("[Coffee Map diagnostic] initial capabilities:", {
            isAdvancedMarkersAvailable: initialCapabilities.isAdvancedMarkersAvailable,
          });
        }

        const bounds = new LatLngBounds();
        shops.forEach((shop) => bounds.extend({ lat: shop.latitude, lng: shop.longitude }));

        map.fitBounds(bounds);
        google.maps.event.addListenerOnce(map, "bounds_changed", () => {
          if ((map.getZoom() ?? 0) > MAX_SINGLE_SHOP_ZOOM) {
            map.setZoom(MAX_SINGLE_SHOP_ZOOM);
          }
        });

        const buildPin = () =>
          new PinElement({
            background: "#5B3A29",
            borderColor: "#FAF8F4",
            glyphColor: "#FAF8F4",
          });

        if (shops.length === 1) {
          // Nothing to cluster with exactly one café. MarkerClusterer
          // takes over map-attachment for markers passed to it, and
          // that path was silently failing to render a lone marker.
          // Attaching the marker to the map directly sidesteps
          // MarkerClusterer entirely for this case.
          const shop = shops[0];
          const pin = buildPin();

          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: shop.latitude, lng: shop.longitude },
            title: shop.name,
            content: pin.element,
          });
          marker.addListener("click", () => setSelected(shop));

          singleMarker = marker;
        } else {
          const markers = shops.map((shop) => {
            const pin = buildPin();
            const marker = new AdvancedMarkerElement({
              position: { lat: shop.latitude, lng: shop.longitude },
              title: shop.name,
              content: pin.element,
            });
            marker.addListener("click", () => setSelected(shop));
            return marker;
          });

          clusterer = new MarkerClusterer({
            map,
            markers,
            renderer: createClusterRenderer(AdvancedMarkerElement),
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError("The map couldn't load right now. Please try again later.");
        }
        if (process.env.NODE_ENV !== "production") {
          // TEMPORARY, this debugging round only: logs the actual
          // caught error so we can see what's really throwing, instead
          // of a generic message. The error object itself doesn't
          // contain the API key, Map ID, coordinates, or shop/user
          // data, those never enter this catch block, only whatever
          // Google's own SDK or our marker-construction code threw.
          // Revert to a generic message once this is resolved.
          console.error("Coffee Map marker initialization error:", err);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (singleMarker) {
        singleMarker.map = null;
        singleMarker = null;
      }
      clusterer?.clearMarkers();
      clusterer = null;
    };
  }, [shops]);

  if (shops.length === 0) {
    return <CoffeeMapEmptyState />;
  }

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
            <p className="font-heading text-base font-semibold text-espresso">{selected.name}</p>
            {(selected.city || selected.state) && (
              <p className="text-sm text-charcoal/50">
                {[selected.city, selected.state].filter(Boolean).join(", ")}
              </p>
            )}
            <div className="mt-1.5 flex items-center gap-3 text-xs text-charcoal/50">
              <span>
                {selected.visitCount} {selected.visitCount === 1 ? "visit" : "visits"}
              </span>
              <StarDisplay rating={selected.avgShopRating} size="h-3 w-3" showValue />
            </div>
            <Link
              href={`/shops/${selected.id}`}
              className="mt-2 inline-block text-xs font-semibold text-sage hover:text-espresso"
            >
              View café
            </Link>
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
