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
        <div className="h-14 w-14 rounded-full bg-latte/50 ring-2 ring-white" />
        <div>
          <p className="font-heading text-base font-semibold text-espresso">Priya&apos;s Passport</p>
          <p className="flex items-center gap-1 text-xs text-charcoal/50">
            <MapPin className="h-3 w-3" /> Austin, TX
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["142", "Coffees"],
          ["37", "Cafés"],
          ["19", "Drinks"],
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
        <div className="h-10 w-10 rounded-md bg-espresso/10" />
        <div>
          <p className="text-sm font-medium text-charcoal">Iced Oat Cortado</p>
          <Stars rating={4.5} />
        </div>
      </div>
    </div>
  );
}

export function DiscoverScreen() {
  const drinks = [
    { name: "Honey Lavender Latte", shop: "Fern & Bloom", rating: 4.8, tag: "Trending" },
    { name: "Pour-Over — Ethiopia", shop: "Northside Roasters", rating: 4.6 },
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

export function LogScreen() {
  return (
    <div className="flex h-full flex-col justify-end bg-espresso/5">
      <div className="rounded-t-2xl bg-white p-5 shadow-[0_-8px_24px_rgba(43,20,10,0.08)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-charcoal/15" />
        <p className="font-heading text-sm font-semibold text-espresso">Log this coffee</p>

        <div className="mt-3 flex items-center gap-3 rounded-lg bg-crema p-3">
          <div className="h-11 w-11 rounded-md bg-latte/40" />
          <div>
            <p className="text-sm font-medium text-charcoal">Honey Lavender Latte</p>
            <p className="text-xs text-charcoal/50">Fern &amp; Bloom</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium text-charcoal/60">How was the drink?</p>
          <div className="mt-1 flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={i < 4 ? "h-5 w-5 fill-gold text-gold" : "h-5 w-5 text-charcoal/20"}
              />
            ))}
          </div>
        </div>

        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-espresso py-2.5 text-sm font-medium text-crema">
          <Plus className="h-4 w-4" />
          Add to passport
        </button>
      </div>
    </div>
  );
}
