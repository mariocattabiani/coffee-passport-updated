import { X, Users, Coffee, MapPin } from "lucide-react";

import { StarDisplay } from "@/components/logs/star-display";
import { GoogleAttribution } from "@/components/explore/google-attribution";
import type { ExploreResultItem } from "@/lib/explore/types";

interface MapCafePreviewProps {
  item: ExploreResultItem;
  distanceMiles: number | null;
  opening: boolean;
  onView: () => void;
  onDismiss: () => void;
  /** "embedded" (default) is the compact box in the desktop split view
   *  and the old mobile card. "fullscreen" additionally clears the
   *  device's own safe-area inset, since its bottom edge is the real
   *  physical viewport edge, not just a box inside the page. */
  variant?: "embedded" | "fullscreen";
}

/**
 * The mobile-only replacement for "tap a marker, get yanked to List."
 * Stays on the map, shows just enough to decide whether this café is
 * worth a closer look, "View café" is the only thing that navigates
 * or (for an external result) can trigger the Add to Coffee Passport
 * flow, tapping the marker itself never does either.
 */
export function MapCafePreview({ item, distanceMiles, opening, onView, onDismiss, variant = "embedded" }: MapCafePreviewProps) {
  const locationLine =
    distanceMiles !== null
      ? `${distanceMiles.toFixed(1)} mi away`
      : [item.data.city, item.data.state].filter(Boolean).join(", ");

  return (
    // Google's default attribution/logo strip and its zoom control
    // widget (zoomControl is never disabled on this map) both render
    // at the very bottom of the map, an 80px clearance keeps this
    // above both regardless of viewport width, since Google's own
    // controls don't resize with the viewport either. In fullscreen,
    // that same 80px is combined with the device's own safe-area
    // inset, since the map's bottom edge there is the real physical
    // screen edge, not just a box inside the page.
    <div
      className="absolute inset-x-3 z-10 rounded-2xl border border-border bg-white p-3.5 shadow-card"
      style={variant === "fullscreen" ? { bottom: "calc(env(safe-area-inset-bottom, 0px) + 5rem)" } : { bottom: "5rem" }}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Close preview"
        className="absolute right-2 top-2 rounded-full p-1 text-charcoal/40 hover:bg-crema hover:text-charcoal"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {item.source === "external" && (
        <div className="mb-2">
          <GoogleAttribution />
        </div>
      )}

      <div className="flex gap-3 pr-6">
        {item.source === "stored" ? (
          item.data.photoUrl ? (
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-charcoal/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.data.photoUrl} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-espresso/5">
              <Coffee className="h-5 w-5 text-espresso/30" aria-hidden="true" />
            </div>
          )
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-charcoal/5">
            <MapPin className="h-5 w-5 text-charcoal/30" aria-hidden="true" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-charcoal">{item.data.name}</p>
          {locationLine && <p className="truncate text-xs text-charcoal/50">{locationLine}</p>}

          {item.source === "stored" ? (
            <>
              <div className="mt-1 flex items-center gap-2">
                {item.data.ratingAvg !== null ? (
                  <StarDisplay rating={item.data.ratingAvg} size="h-3 w-3" showValue />
                ) : (
                  <span className="text-xs font-medium text-sage">New on Coffee Passport</span>
                )}
              </div>
              {item.data.topDrinkName && (
                <p className="mt-0.5 truncate text-xs text-charcoal/60">
                  Top drink: <span className="font-medium text-charcoal">{item.data.topDrinkName}</span>
                </p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                <span className={item.data.visitedByMe ? "font-medium text-espresso" : "text-charcoal/40"}>
                  {item.data.visitedByMe ? "In your Passport" : "New to you"}
                </span>
                {item.data.friendVisitCount > 0 && (
                  <span className="flex items-center gap-1 text-charcoal/50">
                    <Users className="h-3 w-3" aria-hidden="true" />
                    {item.data.friendVisitCount} {item.data.friendVisitCount === 1 ? "friend has" : "friends have"}{" "}
                    been here
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="mt-1 text-xs font-medium text-sage">Not yet explored on Coffee Passport</p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onView}
        disabled={opening}
        className="mt-3 w-full rounded-lg bg-espresso py-2 text-sm font-semibold text-crema disabled:opacity-60"
      >
        {opening ? "Opening..." : "View café"}
      </button>
    </div>
  );
}
