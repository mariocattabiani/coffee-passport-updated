import Link from "next/link";
import { MapPin, ChevronRight } from "lucide-react";

import type { BeenCafe } from "@/lib/passport/been";
import { formatRelativeDate } from "@/lib/drink-logs/format";

const MAX_VISIBLE_DRINKS = 3;

interface BeenListProps {
  cafes: BeenCafe[];
}

/**
 * One row per café, not per log — this answers "where have I been,
 * and what have I tried there", not "show me every individual coffee"
 * (that's Coffee Trail's job). No photos, no ratings, no captions:
 * this is a personal library/reference view, deliberately compact.
 */
export function BeenList({ cafes }: BeenListProps) {
  if (cafes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white/60 p-8 text-center">
        <p className="text-sm text-charcoal/60">
          No cafés yet. Log your first coffee to start building your Passport.
        </p>
        <Link
          href="/log"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-espresso px-4 py-2 text-sm font-medium text-crema hover:bg-espresso/90"
        >
          Log Coffee
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
      <div className="divide-y divide-border/60">
        {cafes.map((cafe) => {
          const visibleDrinks = cafe.drinkNames.slice(0, MAX_VISIBLE_DRINKS);
          const extraCount = cafe.drinkNames.length - visibleDrinks.length;

          return (
            <Link
              key={cafe.shopId}
              href={`/shops/${cafe.shopId}`}
              className="block px-4 py-4 transition-colors hover:bg-crema/60"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-charcoal">{cafe.shopName}</p>
                  {(cafe.city || cafe.state) && (
                    <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-charcoal/50">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{[cafe.city, cafe.state].filter(Boolean).join(", ")}</span>
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="whitespace-nowrap text-xs text-charcoal/40">
                    {formatRelativeDate(cafe.lastLoggedAt)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-charcoal/30" aria-hidden="true" />
                </div>
              </div>

              <p className="mt-2 text-xs text-charcoal/50">
                {cafe.logCount} {cafe.logCount === 1 ? "coffee" : "coffees"} logged
                <span className="mx-1 text-charcoal/30">·</span>
                {cafe.drinkNames.length} {cafe.drinkNames.length === 1 ? "drink" : "drinks"} tried
              </p>

              <p className="mt-1.5 truncate text-sm text-charcoal/70">
                {visibleDrinks.join(", ")}
                {extraCount > 0 && ` +${extraCount} more`}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
