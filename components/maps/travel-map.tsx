"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import {
  WORLD_VIEWBOX,
  WORLD_VIEW_WIDTH,
  WORLD_VIEW_HEIGHT,
  WORLD_VIEW_X,
  WORLD_VIEW_Y,
  worldCountryPaths,
  projectPoint,
  roundSvgNumber,
} from "@/components/maps/world-geography";

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

// A reasonable assumption for the very first paint, before the
// ResizeObserver below has measured the real rendered width — this
// only affects one frame; the map corrects itself immediately once a
// real measurement lands, at the cost of a barely-perceptible size
// settle on first render, a disclosed, deliberate tradeoff for this
// technique rather than a hidden one.
const ASSUMED_INITIAL_WIDTH_PX = 400;

/**
 * Target dot DIAMETER in real CSS pixels, as a function of the map's
 * OWN actual rendered width, not a device/breakpoint guess — what
 * matters is how big the card physically is on screen, which a
 * viewport media query can't tell you (the same map renders inside
 * different card widths on Passport vs a narrower embed, say).
 * Interpolates roughly 6px at a narrow (~mobile card) width up to 7px
 * at a wide (~desktop card) width, matching the requested "normal: 6px"
 * target across container sizes without a hard breakpoint — activity
 * (below) provides the remaining headroom up to the 7-8px ceiling.
 */
function baseDotDiameterPx(containerWidthPx: number): number {
  const clamped = Math.min(Math.max(containerWidthPx, 300), 700);
  return 6 + ((clamped - 300) / (700 - 300)) * 1;
}

/** Activity adds at most ~1px to the diameter — subtle
 *  differentiation, never a bubble chart. Combined with the base
 *  diameter above, the highest-activity dot on the widest container
 *  tops out right at the requested 7-8px ceiling, never beyond it. */
function activityBonusPx(drinkCount: number): number {
  return Math.min(Math.sqrt(Math.max(drinkCount, 1)) * 0.35, 1);
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function getTooltipStyle(x: number, y: number): CSSProperties {
  // The viewBox does not necessarily start at (0, 0) — it's a padded
  // crop of the projected inhabited-world bounds, offset by whatever
  // that bounding box's own origin happens to be (see
  // world-geography.ts). A projected point's raw x/y must have that
  // origin subtracted before it means anything as a percentage of the
  // viewBox, exactly the step that was missing here — without it, the
  // tooltip's position drifted from the actual dot by a constant
  // offset equal to the viewBox's own origin, worse the further the
  // padded crop's origin sits from zero. The circles themselves were
  // never affected: <circle cx cy> is already in the SAME coordinate
  // space the viewBox itself is defined in, so no origin subtraction
  // was ever needed there.
  const leftPct = roundSvgNumber(clampPercent(((x - WORLD_VIEW_X) / WORLD_VIEW_WIDTH) * 100));
  const topPct = roundSvgNumber(clampPercent(((y - WORLD_VIEW_Y) / WORLD_VIEW_HEIGHT) * 100));
  // Clamped, near-dot positioning using the same viewBox-percentage
  // coordinate system the responsive SVG itself already relies on —
  // this needs no separate DOM measurement of the tooltip's own size,
  // it only ever anchors from whichever edge keeps it inside the
  // container: past 65% across, anchor from the right instead of the
  // left; past 70% down, anchor from the bottom instead of the top.
  const anchorRight = leftPct > 65;
  const anchorBottom = topPct > 70;

  const style: CSSProperties = { position: "absolute" };
  if (anchorRight) style.right = `${100 - leftPct}%`;
  else style.left = `${leftPct}%`;
  if (anchorBottom) style.bottom = `${100 - topPct}%`;
  else style.top = `${topPct}%`;
  style.transform = `translate(${anchorRight ? "8px" : "-50%"}, ${anchorBottom ? "-8px" : "10px"})`;
  return style;
}

/**
 * A fixed "my world" view, not an auto-fit map — the world geometry
 * (components/maps/world-geography.ts) is precomputed once at module
 * load and never changes per user; dots are projected into that same
 * fixed frame regardless of whether someone's activity spans
 * Pennsylvania and Italy or clusters tightly around Hoboken/NYC/
 * Newark. There is no fitBounds/zoom-to-markers logic here.
 *
 * Real geography (world-atlas's Natural Earth-derived TopoJSON), no
 * Google dependency — Explore's own café-discovery map is completely
 * separate and untouched.
 *
 * DOT SIZING: a ResizeObserver measures the container's actual
 * rendered CSS width, and each dot's SVG-viewBox radius is derived
 * from that measurement so the RENDERED size stays close to a
 * constant real pixel diameter regardless of how wide the map happens
 * to render (mobile card vs desktop card) — a plain viewBox-unit
 * radius would otherwise scale up on a wider container the same way
 * the coastlines do, producing much larger dots on desktop, which is
 * exactly the effect this avoids.
 *
 * HYDRATION: every coordinate that ends up in JSX (circle cx/cy/r,
 * tooltip left/top percentages) is rounded through
 * world-geography.ts's roundSvgNumber before rendering — d3-geo's
 * underlying projection math can otherwise produce a value that
 * differs by a last bit between the server and client's own
 * evaluation of the exact same formula (ordinary floating-point
 * behavior, not a bug in the projection), which React's hydration
 * check would otherwise flag as a real mismatch even though the
 * visual difference is many orders of magnitude smaller than a pixel.
 */
export function TravelMap({ points }: TravelMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // No empty-world render: a profile/Passport with zero mapped
  // locations shows nothing here at all — the calling page already
  // provides its own "No mapped locations yet" message.
  if (points.length === 0) return null;

  const pxPerViewBoxUnit = (containerWidth ?? ASSUMED_INITIAL_WIDTH_PX) / WORLD_VIEW_WIDTH;

  // Hover (desktop pointer) shows the tooltip transiently; a click/tap
  // (activeId) persists it. Whichever is present wins for what's
  // actually displayed, so a desktop user gets a live preview on
  // hover, and a touch user (where hover doesn't meaningfully apply)
  // still gets the same information via tap, unchanged.
  const displayedId = hoveredId ?? activeId;
  const displayed = points.find((p) => p.locationId === displayedId) ?? null;
  const displayedProjected = displayed ? projectPoint(displayed.latitude, displayed.longitude) : null;

  // Mobile gets a taller container for the SAME unchanged world
  // rendering — not a bigger/re-projected world, not cropped
  // geography, just more vertical breathing room around it. Computed
  // directly from the already-exported WORLD_VIEW_WIDTH/HEIGHT
  // constants (world-geography.ts itself is untouched by this),
  // splitting the requested 8-12% target at 10%: dividing the natural
  // aspect ratio by 1.10 makes the container 10% TALLER for the same
  // width. Below sm (640px, this app's own existing breakpoint
  // convention) the SVG's box becomes taller than its own viewBox's
  // natural ratio; with the default preserveAspectRatio ("xMidYMid
  // meet"), the unchanged world still renders at the same width and
  // is simply centered with equal empty margin above and below —
  // exactly "more breathing room," never a bigger or distorted world.
  // A plain <style> tag with a real media query, not JS layout logic
  // (no ResizeObserver/matchMedia needed for this) — Tailwind's own
  // arbitrary-value classes can't embed a value computed at runtime
  // from these constants, so a scoped rule is the correct minimal
  // CSS-only tool here.
  const desktopAspectRatio = WORLD_VIEW_WIDTH / WORLD_VIEW_HEIGHT;
  const mobileAspectRatio = WORLD_VIEW_WIDTH / (WORLD_VIEW_HEIGHT * 1.1);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl border border-[#C6CAC5]/50 bg-[#EAF3F7] p-1"
    >
      <style>{`
        .coffee-passport-travel-map-svg {
          aspect-ratio: ${mobileAspectRatio};
        }
        @media (min-width: 640px) {
          .coffee-passport-travel-map-svg {
            aspect-ratio: ${desktopAspectRatio};
          }
        }
      `}</style>
      <svg
        viewBox={WORLD_VIEWBOX}
        className="coffee-passport-travel-map-svg block w-full rounded-xl"
        role="img"
        aria-label={`Map of ${points.length} visited ${points.length === 1 ? "location" : "locations"}`}
        onClick={() => setActiveId(null)}
      >
        {worldCountryPaths.map((d, i) => (
          <path key={i} d={d} fill="#D3D4CF" stroke="#C6CAC5" strokeOpacity={0.5} strokeWidth={0.35} />
        ))}

        {points.map((p) => {
          const projected = projectPoint(p.latitude, p.longitude);
          if (!projected) return null;
          const [x, y] = projected;

          const isDisplayed = p.locationId === displayedId;
          const diameterPx = baseDotDiameterPx(containerWidth ?? ASSUMED_INITIAL_WIDTH_PX) + activityBonusPx(p.drinkCount);
          const radiusUnits = roundSvgNumber(diameterPx / 2 / pxPerViewBoxUnit);

          return (
            <circle
              key={p.locationId}
              cx={x}
              cy={y}
              r={isDisplayed ? roundSvgNumber(radiusUnits * 1.25) : radiusUnits}
              fill="#42281C"
              fillOpacity={isDisplayed ? 1 : 0.97}
              stroke="#FAF8F4"
              strokeWidth={Math.max(1.25 / pxPerViewBoxUnit, 0.35)}
              style={{ cursor: "pointer", transition: "r 120ms ease" }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveId(p.locationId === activeId ? null : p.locationId);
              }}
              onMouseEnter={() => setHoveredId(p.locationId)}
              onMouseLeave={() => setHoveredId(null)}
              role="button"
              tabIndex={0}
              aria-label={`${p.city}${p.region ? `, ${p.region}` : ""}, ${p.country}, ${p.cafeCount} ${
                p.cafeCount === 1 ? "café" : "cafés"
              }, ${p.drinkCount} ${p.drinkCount === 1 ? "drink" : "drinks"}`}
              onFocus={() => setHoveredId(p.locationId)}
              onBlur={() => setHoveredId(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveId(p.locationId === activeId ? null : p.locationId);
                } else if (e.key === "Escape") {
                  setActiveId(null);
                  setHoveredId(null);
                }
              }}
            />
          );
        })}
      </svg>

      {displayed && displayedProjected && (
        <div
          className="pointer-events-none w-max max-w-[75%] rounded-lg bg-espresso px-2.5 py-1.5 text-center text-xs text-crema shadow-card"
          style={getTooltipStyle(displayedProjected[0], displayedProjected[1])}
        >
          <p className="font-medium">
            {displayed.city}
            {displayed.region ? `, ${displayed.region}` : ""}, {displayed.country}
          </p>
          <p className="text-crema/70">
            {displayed.cafeCount} {displayed.cafeCount === 1 ? "café" : "cafés"} · {displayed.drinkCount}{" "}
            {displayed.drinkCount === 1 ? "drink" : "drinks"}
          </p>
        </div>
      )}
    </div>
  );
}
