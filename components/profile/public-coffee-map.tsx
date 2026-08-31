"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MarkerClusterer, type Renderer } from "@googlemaps/markerclusterer";

import { loadMapsLibrary, loadMarkerLibrary, loadCoreLibrary } from "@/lib/google-maps/loader";
import type { PublicMapShop } from "@/lib/profile/public-map-actions";

interface PublicCoffeeMapProps {
  firstName: string | null;
  shops: PublicMapShop[];
}

// A single café (or a very tight cluster) can make fitBounds zoom in
// absurdly close, same clamp as the owner's own Passport map.
const MAX_SINGLE_SHOP_ZOOM = 14;

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
        "width:34px",
        "height:34px",
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
        "font-size:12px",
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

/**
 * "Where does this person get coffee?" — a compact, always-visible
 * profile module, not the immersive full-screen finder Explore is.
 * Same lower-level map infrastructure as the owner's own Passport
 * CoffeeMap (loader, clusterer, branded pins), deliberately fixed to a
 * short card height rather than growing to fill the viewport, no
 * search bar, no "near me", no full-screen mode — this communicates
 * identity/history, it doesn't help anyone find a café to visit right
 * now, that's what Explore is for.
 *
 * Every shop here already comes from get_public_user_map, which only
 * ever aggregates this user's PUBLIC logs and already excludes shops
 * with no coordinates — this component does no filtering of its own,
 * it only renders what it's given.
 */
export function PublicCoffeeMap({ firstName, shops }: PublicCoffeeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PublicMapShop | null>(null);

  const cityCount = new Set(
    shops.map((s) => (s.city ? s.city.toLowerCase().trim() : null)).filter((c): c is string => !!c)
  ).size;

  useEffect(() => {
    if (shops.length === 0) return;
    if (!containerRef.current) return;

    let cancelled = false;
    let clusterer: MarkerClusterer | null = null;
    let singleMarker: google.maps.marker.AdvancedMarkerElement | null = null;

    async function init() {
      const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;
      if (!mapId) {
        setError("Map isn't configured yet.");
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
          zoomControl: true,
          gestureHandling: "cooperative",
        });

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
          const shop = shops[0];
          const pin = buildPin();
          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: shop.latitude, lng: shop.longitude },
            title: shop.shopName,
            content: pin.element,
          });
          marker.addListener("click", () => setSelected(shop));
          singleMarker = marker;
        } else {
          const markers = shops.map((shop) => {
            const pin = buildPin();
            const marker = new AdvancedMarkerElement({
              position: { lat: shop.latitude, lng: shop.longitude },
              title: shop.shopName,
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
        if (!cancelled) setError("The map couldn't load right now.");
        if (process.env.NODE_ENV !== "production") {
          console.error("Public Coffee Map marker initialization error:", err);
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
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white/60 p-6 text-center">
        <p className="text-sm text-charcoal/50">
          {firstName ? `${firstName} hasn't` : "This person hasn't"} logged a public coffee with a café
          location yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-soft sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="min-w-0 truncate font-heading text-base font-semibold text-espresso">
          {firstName ? `${firstName}'s Coffee Map` : "Coffee Map"}
        </h2>
        <p className="shrink-0 text-xs text-charcoal/50">
          {cityCount > 0 && `${cityCount} ${cityCount === 1 ? "city" : "cities"} · `}
          {shops.length} {shops.length === 1 ? "café" : "cafés"}
        </p>
      </div>

      <div className="relative h-60 w-full overflow-hidden rounded-xl border border-border/60 sm:h-72">
        {error ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-espresso/5 px-6 text-center">
            <p className="text-sm text-charcoal/50">{error}</p>
          </div>
        ) : (
          <div ref={containerRef} className="h-full w-full" />
        )}
      </div>

      {selected && (
        <div className="mt-3 flex items-start justify-between gap-4 rounded-xl border border-border bg-crema/60 p-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-espresso">{selected.shopName}</p>
            {(selected.city || selected.state) && (
              <p className="text-xs text-charcoal/50">
                {[selected.city, selected.state].filter(Boolean).join(", ")}
              </p>
            )}
            <p className="mt-1 text-xs text-charcoal/50">
              {selected.publicVisitCount} {selected.publicVisitCount === 1 ? "visit" : "visits"} logged
              publicly
            </p>
            <Link
              href={`/shops/${selected.shopId}`}
              className="mt-1.5 inline-block text-xs font-semibold text-sage hover:text-espresso"
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
