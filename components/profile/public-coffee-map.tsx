import { TravelMap } from "@/components/maps/travel-map";
import type { PublicMapLocation } from "@/lib/profile/public-map-actions";

interface PublicCoffeeMapProps {
  firstName: string | null;
  locations: PublicMapLocation[];
}

/**
 * City-level travel map, not a per-café Google pin map — see
 * components/maps/travel-map.tsx for the full rationale, including why
 * TravelMap still uses Google Maps as its renderer (a real, licensed,
 * already-working map, kept in place until a real bundled geographic
 * asset can be sourced with actual network access — see that
 * component's own doc comment). What changed from the previous version
 * of THIS component is the data it plots: canonical locations (one dot
 * per city, via shops.location_id), not individual shop coordinates
 * that, per location_model.sql, almost no shop actually has — the map
 * appearing empty despite a person clearly having public activity
 * elsewhere on the page (Cities, stats) was the actual reported bug,
 * not a rendering-technology issue.
 */
export function PublicCoffeeMap({ firstName, locations }: PublicCoffeeMapProps) {
  const displayName = firstName ? `${firstName}'s` : "Their";
  const cafeCount = locations.reduce((sum, l) => sum + l.cafeCount, 0);

  if (locations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-white/50 p-6 text-center">
        <p className="text-sm text-charcoal/50">No public café locations to show yet.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm text-charcoal/60">
        <span className="font-medium text-charcoal">{displayName} Coffee Map</span> — {locations.length}{" "}
        {locations.length === 1 ? "city" : "cities"} · {cafeCount} {cafeCount === 1 ? "café" : "cafés"}
      </p>
      <TravelMap points={locations} />
    </div>
  );
}
