import { Coffee, MapPin } from "lucide-react";

import type { PublicProfile } from "@/lib/profile/public-actions";

/**
 * One unified card rather than four separate boxes, deliberately, to
 * avoid another stack of generic stat tiles. Renders nothing at all if
 * there's simply no public activity to summarize yet.
 */
export function PublicStats({ profile }: { profile: PublicProfile }) {
  const hasAnyStats = profile.publicCoffeesLogged > 0 || profile.publicCafesVisited > 0;
  if (!hasAnyStats) return null;

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-center justify-around text-center">
        <div>
          <p className="font-heading text-2xl font-semibold text-espresso">{profile.publicCoffeesLogged}</p>
          <p className="text-xs text-charcoal/50">Coffees logged</p>
        </div>
        <div className="h-8 w-px bg-border" aria-hidden="true" />
        <div>
          <p className="font-heading text-2xl font-semibold text-espresso">{profile.publicCafesVisited}</p>
          <p className="text-xs text-charcoal/50">Cafés visited</p>
        </div>
      </div>

      {(profile.favoriteDrinkName || profile.favoriteShopName) && (
        <div className="mt-5 flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-around">
          {profile.favoriteDrinkName && (
            <p className="flex items-center justify-center gap-1.5 text-sm text-charcoal/70">
              <Coffee className="h-3.5 w-3.5 text-sage" />
              Favorite: <span className="font-medium text-charcoal">{profile.favoriteDrinkName}</span>
            </p>
          )}
          {profile.favoriteShopName && (
            <p className="flex items-center justify-center gap-1.5 text-sm text-charcoal/70">
              <MapPin className="h-3.5 w-3.5 text-sage" />
              At <span className="font-medium text-charcoal">{profile.favoriteShopName}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
