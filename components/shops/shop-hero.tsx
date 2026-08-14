import Link from "next/link";
import { Compass, MapPin, Plus, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StarDisplay } from "@/components/logs/star-display";
import type { Shop } from "@/lib/supabase/types";

interface ShopHeroProps {
  shop: Shop;
  avgRating: number | null;
  ratingCount: number;
}

/**
 * A light, editorial destination hero, not a two-column card with a
 * dark half. The café name is the true focal point, a thin gold-to-
 * transparent rule marks it like a page spine, and the rating lives in
 * a small, intentionally-placed module rather than stretching across
 * half the panel. One faint ring in the corner (the same restrained
 * treatment already used on Passport) adds quiet depth without ever
 * becoming a repeating texture. Every line of supporting text sits on
 * a light background at full, readable contrast.
 */
export function ShopHero({ shop, avgRating, ratingCount }: ShopHeroProps) {
  const location = [shop.city, shop.state].filter(Boolean).join(", ");

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-white shadow-soft">
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border-[14px] border-espresso/[0.04] sm:h-96 sm:w-96"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-10 p-6 sm:p-10 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
        {/* IDENTITY */}
        <div className="flex gap-5 lg:max-w-xl">
          <div
            className="hidden w-px shrink-0 self-stretch bg-gradient-to-b from-gold via-espresso/15 to-transparent sm:block"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sage">
              Coffee Passport destination
            </p>

            <h1 className="mt-2 font-heading text-4xl font-semibold leading-[1.05] text-espresso sm:text-5xl lg:text-6xl">
              {shop.name}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
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

            <Button asChild size="lg" className="mt-8 gap-2">
              <Link href={`/log?shopId=${shop.id}`}>
                <Plus className="h-4 w-4" />
                Log a drink
              </Link>
            </Button>
          </div>
        </div>

        {/* RATING, a self-contained module, not a stretched panel. */}
        <div className="shrink-0 self-start lg:mt-1">
          <div className="w-full rounded-2xl bg-espresso px-6 py-5 text-center shadow-card sm:w-52">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-crema/70">
              Coffee Passport rating
            </p>
            {avgRating !== null ? (
              <>
                <p className="mt-2 font-heading text-4xl font-semibold text-crema">{avgRating.toFixed(1)}</p>
                <div className="mt-2 flex justify-center">
                  <StarDisplay rating={avgRating} size="h-3.5 w-3.5" />
                </div>
                <p className="mt-2 text-xs text-crema/70">
                  {ratingCount} {ratingCount === 1 ? "rating" : "ratings"}
                </p>
              </>
            ) : ratingCount === 1 ? (
              <>
                <p className="mt-3 font-heading text-base font-semibold text-crema">1 rating logged</p>
                <p className="mt-1 text-xs text-crema/70">More ratings needed for a community score</p>
              </>
            ) : (
              <p className="mt-3 font-heading text-base font-semibold text-crema">Not yet rated</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
