import { MapPin } from "lucide-react";

import type { PlaceExplored } from "@/lib/passport/achievements";

/**
 * places is already sorted by shopCount descending (see
 * computePlacesExplored), so the first entry is always the person's
 * most-explored city, given quiet typographic distinction rather than
 * a fake completion percentage or a second card style.
 */
export function PlacesExplored({ places }: { places: PlaceExplored[] }) {
  if (places.length === 0) return null;

  const [mostExplored, ...rest] = places;
  const cityCount = places.length;
  const stateCount = new Set(places.map((p) => p.state.toLowerCase())).size;

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-heading text-xl font-semibold text-espresso">Places Explored</h2>
        <p className="text-sm text-charcoal/60">
          {cityCount} {cityCount === 1 ? "city" : "cities"}
          <span className="mx-1.5 text-charcoal/30" aria-hidden="true">
            &middot;
          </span>
          {stateCount} {stateCount === 1 ? "state" : "states"}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
        <div className="border-b border-border/60 px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gold">Most explored</p>
          <p className="mt-1 font-heading text-lg font-semibold text-espresso">
            {mostExplored.city}, {mostExplored.state}
          </p>
          <p className="text-sm text-charcoal/50">
            {mostExplored.shopCount} {mostExplored.shopCount === 1 ? "café" : "cafés"}
          </p>
        </div>

        {rest.map((place, i) => (
          <div
            key={`${place.city}-${place.state}`}
            className={`flex items-center justify-between px-5 py-3.5 ${i > 0 ? "border-t border-border/60" : ""}`}
          >
            <p className="flex items-center gap-2 text-sm font-medium text-charcoal">
              <MapPin className="h-3.5 w-3.5 text-sage" />
              {place.city}, {place.state}
            </p>
            <p className="text-xs text-charcoal/50">
              {place.shopCount} {place.shopCount === 1 ? "café" : "cafés"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
