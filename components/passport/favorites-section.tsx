import Link from "next/link";
import { Coffee, MapPin, Star } from "lucide-react";

export interface FavoriteSummary {
  title: string;
  subtitle: string;
  rating: number;
  /** Present only for the favorite café, used to link to its page. */
  shopId?: string;
  /** A photo pulled from one of the user's own logs — the most recent
   *  matching log that has one, see app/passport/page.tsx. Only ever
   *  populated for the favorite drink; the favorite café's redesigned
   *  compact row never shows a photo (see FavoriteCafeRow). */
  photoUrl: string | null;
  photoPositionX?: number | null;
  photoPositionY?: number | null;
  logCount?: number;
}

interface FavoritesSectionProps {
  favoriteDrink: FavoriteSummary | null;
  favoriteShop: FavoriteSummary | null;
}

/**
 * Favorite Drink is a wide 16:9 editorial photo — a profile highlight,
 * not another feed/grid card, deliberately a third distinct ratio from
 * Discover's 4:3 and the Passport grid's 4:5. object-position reads
 * the same focal point every other photo surface already uses; no new
 * crop system. When there's no photo, a compact branded fallback (icon
 * + gradient) holds the same approximate footprint so the section
 * doesn't jump in height between users who do and don't have a photo
 * for their favorite drink.
 */
function FavoriteDrinkFeature({ data }: { data: FavoriteSummary | null }) {
  if (!data) return null;

  const objectPosition = `${data.photoPositionX ?? 50}% ${data.photoPositionY ?? 50}%`;

  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-sage">Favorite drink</p>

      {data.photoUrl ? (
        <div className="relative mt-2 aspect-[16/9] w-full overflow-hidden rounded-lg bg-charcoal/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.photoUrl}
            alt=""
            className="h-full w-full object-cover"
            style={{ objectPosition }}
          />
        </div>
      ) : (
        <div className="relative mt-2 flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-crema to-latte/30">
          <Coffee className="h-8 w-8 text-espresso/25" aria-hidden="true" />
        </div>
      )}

      <p className="mt-2.5 truncate font-heading text-lg font-semibold text-espresso">{data.title}</p>
      <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-charcoal/60">
        {data.subtitle && <span className="min-w-0 truncate">{data.subtitle}</span>}
        {data.subtitle && <span aria-hidden="true">·</span>}
        <span className="flex shrink-0 items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden="true" />
          {data.rating.toFixed(1)}
        </span>
      </div>
      {typeof data.logCount === "number" && (
        <p className="mt-0.5 text-xs text-charcoal/40">
          Logged {data.logCount} {data.logCount === 1 ? "time" : "times"}
        </p>
      )}
    </div>
  );
}

/**
 * A single compact horizontal row, not a card — café name (linking to
 * its shop page when we have shop_id), rating, city/state + log count.
 * No photo: this is the intentionally quieter of the two favorites,
 * deliberately distinct from the drink's editorial treatment above it.
 */
function FavoriteCafeRow({ data }: { data: FavoriteSummary | null }) {
  if (!data) return null;

  const content = (
    <>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sage">
        <MapPin className="h-3 w-3" aria-hidden="true" />
        Favorite café
      </div>
      <div className="mt-1.5 flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-charcoal">{data.title}</p>
          <p className="truncate text-xs text-charcoal/50">
            {data.subtitle}
            {data.subtitle && typeof data.logCount === "number" && " · "}
            {typeof data.logCount === "number" &&
              `${data.logCount} ${data.logCount === 1 ? "coffee" : "coffees"} logged`}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-charcoal/70">
          <Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden="true" />
          {data.rating.toFixed(1)}
        </span>
      </div>
    </>
  );

  if (data.shopId) {
    return (
      <Link href={`/shops/${data.shopId}`} className="block min-w-0 hover:opacity-80">
        {content}
      </Link>
    );
  }

  return <div className="min-w-0">{content}</div>;
}

export function FavoritesSection({ favoriteDrink, favoriteShop }: FavoritesSectionProps) {
  if (!favoriteDrink && !favoriteShop) return null;

  return (
    <section className="border-t border-border/60 pt-6">
      <h2 className="mb-3 font-heading text-lg font-semibold text-espresso">Your favorites</h2>
      <div className="space-y-5">
        <FavoriteDrinkFeature data={favoriteDrink} />
        {favoriteDrink && favoriteShop && <div className="border-t border-border/60" />}
        <FavoriteCafeRow data={favoriteShop} />
      </div>
    </section>
  );
}
