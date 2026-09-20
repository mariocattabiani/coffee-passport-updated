import Link from "next/link";
import { Compass, MapPin, Navigation, Plus, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/shops/share-button";
import { StarDisplay } from "@/components/logs/star-display";
import type { Shop } from "@/lib/supabase/types";

interface ShopHeroProps {
  shop: Shop;
  avgRating: number | null;
  ratingCount: number;
}

function directionsUrl(shop: Shop): string {
  const destination =
    shop.latitude !== null && shop.longitude !== null
      ? `${shop.latitude},${shop.longitude}`
      : [shop.name, shop.address, shop.city, shop.state].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

const SECONDARY_ACTION_CLASSES =
  "inline-flex items-center gap-1.5 rounded-lg border border-espresso/20 px-4 py-2 text-sm font-medium text-espresso transition-colors hover:bg-espresso/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-espresso focus-visible:ring-offset-2 focus-visible:ring-offset-crema";

/**
 * V2.1: the SAME branded header for every café, with or without any
 * community activity — no UGC photo band (a random public log photo
 * isn't a business's identity, it belongs in "From the community"
 * only) and no camera-icon placeholder for the no-photo case, since
 * both of those looked unfinished and made cafés with no activity
 * look broken. This one open, editorial block — no white card, no
 * border, no shadow, just a bottom rule before the next section, per
 * the "reduce card-heaviness" direction — replaces the previous
 * photo-band + identity-card + large standalone rating module with a
 * single compact section, so "What should I order?" arrives much
 * sooner on mobile. The rating that used to be its own large brown
 * module is now one inline line here instead.
 */
export function ShopHero({ shop, avgRating, ratingCount }: ShopHeroProps) {
  const location = [shop.city, shop.state].filter(Boolean).join(", ");

  return (
    <div className="border-b border-border/60 pb-6 sm:pb-8">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sage">Coffee Passport destination</p>
      <div className="mt-1.5 h-0.5 w-8 rounded-full bg-gold" aria-hidden="true" />

      <h1 className="mt-3 font-heading text-3xl font-semibold leading-[1.1] text-espresso sm:text-4xl">
        {shop.name}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {location && (
          <span className="flex items-center gap-1.5 text-sm font-medium uppercase tracking-wide text-charcoal/70">
            <Compass className="h-3.5 w-3.5 text-sage" />
            {location}
          </span>
        )}
        <span className="flex items-center gap-1.5 rounded-full border border-sage/30 bg-sage/[0.06] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-sage">
          <Store className="h-3 w-3" />
          {shop.is_chain ? "Chain café" : "Independent café"}
        </span>
      </div>

      {shop.address && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-charcoal/60">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-charcoal/40" />
          {shop.address}
        </p>
      )}

      {/* RATING: one compact inline line, not a standalone module. */}
      <div className="mt-3 flex items-center gap-2">
        {avgRating !== null ? (
          <>
            <span className="font-heading text-xl font-semibold text-espresso">{avgRating.toFixed(1)}</span>
            <StarDisplay rating={avgRating} size="h-4 w-4" />
            <span className="text-sm text-charcoal/60">
              {ratingCount} {ratingCount === 1 ? "Passport rating" : "Passport ratings"}
            </span>
          </>
        ) : ratingCount === 1 ? (
          <span className="text-sm font-medium text-charcoal/60">
            1 rating logged. More ratings needed for a community score.
          </span>
        ) : (
          <span className="text-sm font-medium text-charcoal/60">Not rated yet</span>
        )}
      </div>

      {/* ACTIONS: one primary, two real secondary actions. No Save or
          Website button — neither is backed by any actual data or
          functionality yet. */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Button asChild className="gap-2">
          <Link href={`/log?shopId=${shop.id}`}>
            <Plus className="h-4 w-4" />
            Log a drink
          </Link>
        </Button>
        <a href={directionsUrl(shop)} target="_blank" rel="noopener noreferrer" className={SECONDARY_ACTION_CLASSES}>
          <Navigation className="h-4 w-4" />
          Directions
        </a>
        <ShareButton
          title={shop.name}
          text={`${shop.name} on Coffee Passport`}
          url={`/shops/${shop.id}`}
          className={SECONDARY_ACTION_CLASSES}
        />
      </div>
    </div>
  );
}
