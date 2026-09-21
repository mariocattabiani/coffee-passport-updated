import Image from "next/image";
import { Star, MapPin, Plus, Flame } from "lucide-react";

import { StampBadge } from "@/components/marketing/stamp-badge";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            i < Math.round(rating)
              ? "h-3 w-3 fill-gold text-gold"
              : "h-3 w-3 fill-transparent text-charcoal/20"
          }
        />
      ))}
    </div>
  );
}

export function PassportScreen() {
  return (
    <div className="flex h-full flex-col bg-crema px-5 pt-3">
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-white">
          <Image src="/images/alex-avatar.jpg" alt="Alex" fill sizes="56px" className="object-cover" />
        </div>
        <div>
          <p className="font-heading text-base font-semibold text-espresso">Alex&apos;s Passport</p>
          <p className="flex items-center gap-1 text-xs text-charcoal/50">
            <MapPin className="h-3 w-3" /> Austin, TX
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["142", "Drinks"],
          ["37", "Cafés"],
          ["19", "Cities"],
        ].map(([n, l]) => (
          <div key={l} className="rounded-lg bg-white py-2 shadow-soft">
            <p className="font-heading text-lg font-semibold text-espresso">{n}</p>
            <p className="text-[10px] uppercase tracking-wide text-charcoal/40">{l}</p>
          </div>
        ))}
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-charcoal/40">
        Recent stamps
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <StampBadge label="AUSTIN" rotate={-4} className="h-16 w-16" />
        <StampBadge label="COLD BREW" rotate={5} color="#6F8F72" className="h-16 w-16" />
        <StampBadge label="3RD WAVE" rotate={-2} color="#C89F7A" className="h-16 w-16" />
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-charcoal/40">
        Favorite drink
      </p>
      <div className="mt-2 flex items-center gap-3 rounded-lg bg-white p-3 shadow-soft">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
          <Image src="/images/drink-green-tea.jpg" alt="" fill sizes="40px" className="object-cover" />
        </div>
        <div>
          <p className="text-sm font-medium text-charcoal">Green Tea</p>
          <Stars rating={4.5} />
        </div>
      </div>
    </div>
  );
}

export function DiscoverScreen() {
  const drinks = [
    { name: "Honey Lavender Latte", shop: "Fern & Bloom", rating: 4.8, tag: "Trending" },
    { name: "Ethiopian Pour-Over", shop: "Northside Roasters", rating: 4.6 },
    { name: "Brown Sugar Oat Shaken", shop: "Cardinal Coffee Co.", rating: 4.9, tag: "Friends love this" },
  ];
  return (
    <div className="flex h-full flex-col bg-crema px-5 pt-3">
      <p className="font-heading text-base font-semibold text-espresso">Discover</p>
      <p className="text-xs text-charcoal/50">Near Austin, TX</p>

      <div className="mt-4 space-y-3">
        {drinks.map((d) => (
          <div key={d.name} className="rounded-lg bg-white p-3 shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-charcoal">{d.name}</p>
                <p className="text-xs text-charcoal/50">{d.shop}</p>
              </div>
              {d.tag && (
                <span className="flex items-center gap-1 rounded-full bg-sage/10 px-2 py-0.5 text-[10px] font-medium text-sage">
                  <Flame className="h-2.5 w-2.5" />
                  {d.tag}
                </span>
              )}
            </div>
            <div className="mt-2">
              <Stars rating={d.rating} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * V2.1 polish: the sheet now shows the real shape of the logging flow
 * (café, drink, hot/iced, drink rating, café rating, an optional
 * photo, a caption) instead of just a drink row and one rating, which
 * left the top half of the phone empty. The dimmed café header peeking
 * above the sheet reflects reality too: logging opens right from the
 * café page (see shop-hero.tsx's "Log a drink" button), not from a
 * blank screen, so that context filling the space above the sheet is
 * accurate, not decorative filler.
 */
export function LogScreen() {
  return (
    <div className="flex h-full flex-col justify-end bg-crema">
      <div className="flex-1 px-5 pt-5 opacity-40">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sage">Coffee Passport café</p>
        <p className="mt-1 font-heading text-base font-semibold text-espresso">Fern &amp; Bloom</p>
        <div className="mt-1.5">
          <Stars rating={4.5} />
        </div>
      </div>

      <div className="rounded-t-2xl bg-white p-5 shadow-[0_-8px_24px_rgba(43,20,10,0.08)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-charcoal/15" />
        <p className="font-heading text-sm font-semibold text-espresso">Log this coffee</p>

        <div className="mt-3 flex items-center gap-3 rounded-lg bg-crema p-2.5">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
            <Image src="/images/drink-pumpkin-pancake-cold-brew.jpg" alt="" fill sizes="40px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-charcoal">Pumpkin Pancake Cold Brew</p>
            <p className="truncate text-xs text-charcoal/50">Fern &amp; Bloom · Coffee</p>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <span className="rounded-full bg-espresso px-3 py-1 text-[11px] font-medium text-crema">Iced</span>
          <span className="rounded-full border border-border px-3 py-1 text-[11px] font-medium text-charcoal/50">Hot</span>
        </div>

        <div className="mt-3">
          <p className="text-[11px] font-medium text-charcoal/60">Drink rating</p>
          <div className="mt-1 flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={i < 4 ? "h-4 w-4 fill-gold text-gold" : "h-4 w-4 text-charcoal/20"} />
            ))}
          </div>
        </div>

        <div className="mt-2.5">
          <p className="text-[11px] font-medium text-charcoal/60">Café rating</p>
          <div className="mt-1">
            <Stars rating={5} />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg">
            <Image src="/images/drink-pumpkin-pancake-cold-brew.jpg" alt="" fill sizes="36px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1 rounded-lg bg-crema px-3 py-2">
            <p className="truncate text-xs text-charcoal/50">Tastes like October.</p>
          </div>
        </div>

        <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-espresso py-2.5 text-sm font-medium text-crema">
          <Plus className="h-4 w-4" />
          Add to passport
        </button>
      </div>
    </div>
  );
}

/**
 * Mirrors the real Café Page V2 structure (open hero, "What should I
 * order?", Friends who have been here, Your Passport here) at a small
 * scale, so the homepage's café-page showcase demonstrates the actual
 * shipped product rather than a generic review-app layout.
 */
export function CafePageScreen() {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-crema px-5 pt-4 pb-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sage">Coffee Passport café</p>
      <p className="mt-1 font-heading text-lg font-semibold text-espresso">Fern &amp; Bloom</p>
      <div className="mt-1.5 flex items-center gap-1.5">
        <Stars rating={4.5} />
        <span className="text-xs text-charcoal/50">4.5 · 31 ratings</span>
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-charcoal/40">
        What should I order?
      </p>
      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-2.5 rounded-lg bg-white p-2.5 shadow-soft">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-[11px] font-semibold text-espresso">
            1
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-charcoal">Honey Lavender Latte</p>
            <p className="text-[10px] text-charcoal/50">Coffee · Top rated</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg bg-white p-2.5 shadow-soft">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-espresso/10 text-[11px] font-semibold text-espresso/60">
            2
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-charcoal">Iced Oat Cortado</p>
            <p className="text-[10px] text-charcoal/50">Coffee</p>
          </div>
        </div>
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-charcoal/40">
        Friends who have been here
      </p>
      <div className="mt-2 flex items-center gap-2.5">
        <div className="flex -space-x-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-7 w-7 rounded-full border-2 border-crema bg-latte/50" />
          ))}
        </div>
        <p className="text-xs text-charcoal/60">Emma, Jake +1 have been here</p>
      </div>

      <div className="mt-5 rounded-lg border border-border/70 bg-white p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-sage">Your Passport here</p>
        <p className="mt-1 text-xs text-charcoal/60">3 visits · Favorite: Honey Lavender Latte</p>
      </div>
    </div>
  );
}
