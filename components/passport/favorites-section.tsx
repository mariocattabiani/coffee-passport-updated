import { Coffee, MapPin, Flame, Snowflake } from "lucide-react";

import { StarDisplay } from "@/components/logs/star-display";

export interface FavoriteSummary {
  title: string;
  subtitle: string;
  rating: number;
  /** A photo pulled from one of the user's own logs of this drink. */
  photoUrl: string | null;
  logCount?: number;
  /** Reserved for a future canonical shop image (from a real shop data
   *  layer, e.g. Google Places), intentionally separate from photoUrl
   *  above since it comes from a different source. Not populated yet,
   *  the café card falls back to its current icon treatment until it
   *  is. */
  canonicalImageUrl?: string | null;
}

export interface HotIcedSummary {
  hotPercent: number;
  icedPercent: number;
}

interface FavoritesSectionProps {
  favoriteDrink: FavoriteSummary | null;
  favoriteShop: FavoriteSummary | null;
  hotIced: HotIcedSummary | null;
}

function FavoriteDrinkCard({ data }: { data: FavoriteSummary | null }) {
  if (!data) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-soft">
      {data.photoUrl ? (
        <div className="relative h-36 w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.photoUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-espresso/70 via-espresso/10 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-crema/70">
              Favorite drink
            </p>
            <p className="font-heading text-lg font-semibold text-crema">{data.title}</p>
          </div>
        </div>
      ) : (
        <div className="flex h-36 w-full flex-col items-center justify-center gap-2 bg-espresso/5">
          <Coffee className="h-8 w-8 text-espresso/20" aria-hidden="true" />
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-sage">Favorite drink</p>
            <p className="font-heading text-lg font-semibold text-espresso">{data.title}</p>
          </div>
        </div>
      )}
      <div className="p-4">
        {data.subtitle && <p className="text-sm text-charcoal/50">{data.subtitle}</p>}
        <div className="mt-2">
          <StarDisplay rating={data.rating} size="h-3.5 w-3.5" showValue />
        </div>
      </div>
    </div>
  );
}

function FavoriteCafeCard({ data }: { data: FavoriteSummary | null }) {
  if (!data) return null;

  // Not populated yet (no real shop data layer exists this sprint), so
  // this always falls through to the icon/location treatment today.
  // Once a canonical shop image is available, this card switches to a
  // photo treatment automatically, no redesign required.
  const hasCanonicalImage = Boolean(data.canonicalImageUrl);

  return (
    <div className="overflow-hidden rounded-xl border border-sage/25 bg-sage/[0.06] shadow-soft">
      {hasCanonicalImage ? (
        <div className="relative h-36 w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.canonicalImageUrl ?? undefined} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-espresso/70 via-espresso/10 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-crema/70">
              Favorite café
            </p>
            <p className="font-heading text-lg font-semibold text-crema">{data.title}</p>
          </div>
        </div>
      ) : (
        <div className="px-5 pt-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage text-crema">
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-sage">Favorite café</p>
          </div>
          <p className="mt-3 font-heading text-lg font-semibold text-espresso">{data.title}</p>
        </div>
      )}

      <div className="p-5 pt-3">
        {data.subtitle && <p className="text-sm text-charcoal/50">{data.subtitle}</p>}
        <div className="mt-3 flex items-center justify-between gap-2">
          <StarDisplay rating={data.rating} size="h-3.5 w-3.5" showValue />
          {typeof data.logCount === "number" && (
            <span className="text-xs font-medium text-charcoal/50">
              {data.logCount} {data.logCount === 1 ? "coffee" : "coffees"} logged here
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function HotIcedCard({ data }: { data: HotIcedSummary | null }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-wide text-sage">Your style</p>
      {data ? (
        <>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
            <div className="bg-latte" style={{ width: `${data.hotPercent}%` }} />
            <div className="bg-sage" style={{ width: `${data.icedPercent}%` }} />
          </div>
          <div className="mt-2.5 flex justify-between text-sm text-charcoal/70">
            <span className="flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-latte" aria-hidden="true" />
              {data.hotPercent}% Hot
            </span>
            <span className="flex items-center gap-1.5">
              <Snowflake className="h-3.5 w-3.5 text-sage" aria-hidden="true" />
              {data.icedPercent}% Iced
            </span>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-charcoal/40">Not enough data yet</p>
      )}
    </div>
  );
}

export function FavoritesSection({ favoriteDrink, favoriteShop, hotIced }: FavoritesSectionProps) {
  return (
    <section>
      <h2 className="mb-4 font-heading text-xl font-semibold text-espresso">Your favorites</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <FavoriteDrinkCard data={favoriteDrink} />
        <FavoriteCafeCard data={favoriteShop} />
      </div>
      <div className="mt-4">
        <HotIcedCard data={hotIced} />
      </div>
    </section>
  );
}
