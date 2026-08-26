"use client";

import { Locate, Loader2 } from "lucide-react";

import type { GeolocationStatus } from "@/lib/geolocation/use-geolocation";

interface FindCoffeeNearMeProps {
  status: GeolocationStatus;
  hasLocation: boolean;
  regionLabel: string | null;
  onFind: () => void;
  className?: string;
}

/**
 * The single primary location action, replaces the old separate
 * "Use my location" + implicit "Search this area" combo. Before
 * location: a strong CTA. After: a lighter "Near X" state. Every tap,
 * first or later, runs the exact same one-shot flow (a fresh
 * geolocation read plus one fresh Nearby Search), it's always fully
 * explicit, never fired on its own from anywhere else.
 */
export function FindCoffeeNearMe({ status, hasLocation, regionLabel, onFind, className = "" }: FindCoffeeNearMeProps) {
  if (hasLocation) {
    return (
      <button
        type="button"
        onClick={onFind}
        disabled={status === "pending"}
        className={`flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-2 text-sm font-medium text-charcoal hover:border-espresso/40 disabled:opacity-70 ${className}`}
      >
        {status === "pending" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Locate className="h-3.5 w-3.5 text-sage" aria-hidden="true" />
        )}
        {regionLabel ? `Near ${regionLabel}` : "Using your location"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onFind}
      disabled={status === "pending"}
      className={`flex items-center justify-center gap-2 rounded-full bg-espresso px-5 py-2.5 text-sm font-semibold text-crema shadow-soft transition-shadow hover:shadow-card disabled:opacity-70 ${className}`}
    >
      {status === "pending" ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Locate className="h-4 w-4" aria-hidden="true" />
      )}
      {status === "pending" ? "Finding coffee near you..." : "Find coffee near me"}
    </button>
  );
}
