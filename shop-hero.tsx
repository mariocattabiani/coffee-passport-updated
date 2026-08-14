import Link from "next/link";
import { MapPin, Plus, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StarDisplay } from "@/components/logs/star-display";
import type { Shop } from "@/lib/supabase/types";

interface ShopHeroProps {
  shop: Shop;
  avgRating: number | null;
  ratingCount: number;
}

/**
 * A true full-bleed destination panel rather than another rounded card
 * inside the page's container, this is what gives the shop page its
 * own atmosphere instead of feeling like a Passport section reskin.
 * Renders as a full-width sibling of the page's main container (see
 * app/shops/[id]/page.tsx), with its own internal container for the
 * content so horizontal alignment still matches the rest of the page.
 *
 * There's no café photo in the data model, so the atmosphere is built
 * entirely from layered rings, a faint dot texture, warm gradient
 * light, and type, no fake imagery anywhere.
 */
export function ShopHero({ shop, avgRating, ratingCount }: ShopHeroProps) {
  const location = [shop.city, shop.state].filter(Boolean).join(", ");

  return (
    <section className="relative w-full overflow-hidden bg-espresso">
      {/* Tactile dot-grid texture, standing in for the absence of a
          café photograph, very low opacity, decorative only. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(circle, #FAF8F4 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
        aria-hidden="true"
      />

      {/* Layered rings, an atmosphere motif that quietly echoes both a
          coffee ring and a contour map, coffee and place, at once. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-32 -top-40 h-[30rem] w-[30rem] rounded-full border border-crema/[0.06]" />
        <div className="absolute -right-12 -top-16 h-80 w-80 rounded-full border border-crema/[0.08]" />
        <div className="absolute right-6 top-10 h-48 w-48 rounded-full border border-gold/10" />
        <div className="absolute -bottom-48 -left-24 h-96 w-96 rounded-full bg-sage/[0.08] blur-3xl" />
      </div>

      <div className="container relative max-w-5xl px-6 py-14 sm:px-10 sm:py-20 lg:px-6">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          {/* IDENTITY */}
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gold">
              <span className="h-px w-6 bg-gold/60" aria-hidden="true" />
              Coffee Passport destination
            </p>

            <h1 className="mt-4 font-heading text-4xl font-semibold leading-[1.05] text-crema sm:text-6xl lg:text-7xl">
              {shop.name}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-crema/60">
              {location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {location}
                </span>
              )}
              {shop.address && <span className="text-crema/40">{shop.address}</span>}
              <span className="flex items-center gap-1.5 rounded-full border border-crema/20 px-2.5 py-1 text-[11px] uppercase tracking-wide text-crema/70">
                <Store className="h-3 w-3" />
                {shop.is_chain ? "Chain café" : "Independent café"}
              </span>
            </div>

            <Button asChild size="lg" className="mt-8 gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.28)]">
              <Link href={`/log?shopId=${shop.id}`}>
                <Plus className="h-4 w-4" />
                Log a drink here
              </Link>
            </Button>
          </div>

          {/* RATING, as a stamp/seal rather than a plain stat box. */}
          <div className="shrink-0 self-center lg:self-end">
            <div className="relative flex h-36 w-36 -rotate-3 flex-col items-center justify-center rounded-full border-2 border-dashed border-gold/50 bg-espresso text-center sm:h-40 sm:w-40">
              <div className="absolute inset-2 rounded-full border border-gold/20" aria-hidden="true" />
              {avgRating !== null ? (
                <>
                  <p className="font-heading text-4xl font-semibold text-gold">{avgRating.toFixed(1)}</p>
                  <div className="mt-1 scale-90">
                    <StarDisplay rating={avgRating} size="h-3 w-3" />
                  </div>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-crema/50">
                    {ratingCount} {ratingCount === 1 ? "rating" : "ratings"}
                  </p>
                </>
              ) : ratingCount === 1 ? (
                <>
                  <p className="px-3 font-heading text-sm font-semibold leading-tight text-crema">
                    1 rating logged
                  </p>
                  <p className="mt-1 px-4 text-[10px] leading-tight text-crema/50">Needs more for a score</p>
                </>
              ) : (
                <p className="px-4 font-heading text-sm font-semibold leading-tight text-crema">Not yet rated</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
