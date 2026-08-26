import { MapPin } from "lucide-react";

import type { ExternalCafeResult } from "@/lib/explore/nearby-search-actions";

interface ExternalResultCardProps {
  item: ExternalCafeResult;
  distanceMiles: number | null;
  selected?: boolean;
  opening: boolean;
  onOpen: (item: ExternalCafeResult) => void;
}

/**
 * Deliberately sparser than ResultCard: no rating, no Top Drink, no
 * friend count, none of that exists for a café Coffee Passport hasn't
 * seen yet, showing a fake or blank version of those fields would be
 * worse than omitting them. "View café" is a real, explicit action,
 * not the whole card, clicking anywhere else only selects/highlights,
 * it never persists or navigates on its own.
 */
export function ExternalResultCard({ item, distanceMiles, selected, opening, onOpen }: ExternalResultCardProps) {
  const locationLine =
    distanceMiles !== null ? `${distanceMiles.toFixed(1)} mi away` : [item.city, item.state].filter(Boolean).join(", ");

  return (
    <div
      className={`flex w-full min-w-0 max-w-full gap-3 overflow-hidden rounded-xl border border-dashed p-4 transition-shadow ${
        selected ? "border-espresso bg-crema/50 shadow-card" : "border-charcoal/25 bg-white/70"
      }`}
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-charcoal/5">
        <MapPin className="h-5 w-5 text-charcoal/30" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-charcoal">{item.name}</p>
        {locationLine && <p className="truncate text-xs text-charcoal/50">{locationLine}</p>}

        <div className="mt-1.5 flex flex-col gap-0.5 text-xs">
          <span className="font-medium text-sage">Not yet explored on Coffee Passport</span>
          <span className="text-charcoal/40">New to you</span>
        </div>

        <button
          type="button"
          onClick={() => onOpen(item)}
          disabled={opening}
          className="mt-2 text-xs font-semibold text-espresso hover:underline disabled:opacity-50"
        >
          {opening ? "Opening..." : "View café"}
        </button>
      </div>
    </div>
  );
}
