import { Compass, NotebookPen, MapPin, Bookmark, Star } from "lucide-react";

import { cn } from "@/lib/utils";

function MiniMap() {
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full">
      <path
        d="M8 70 C 30 40, 45 85, 70 55 S 110 20, 152 38"
        fill="none"
        stroke="#C89F7A"
        strokeWidth="2"
        strokeDasharray="1 7"
        strokeLinecap="round"
      />
      {[
        [30, 62],
        [72, 50],
        [112, 30],
        [140, 44],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <circle r="9" fill={i === 2 ? "#5B3A29" : "#ffffff"} stroke="#5B3A29" strokeWidth="1.5" />
          <circle r="2.5" fill={i === 2 ? "#FAF8F4" : "#5B3A29"} />
        </g>
      ))}
    </svg>
  );
}

function StarTrail() {
  return (
    <div className="flex items-center gap-1">
      {[1, 1, 1, 1, 0.4].map((opacity, i) => (
        <Star key={i} className="h-4 w-4 fill-gold text-gold" style={{ opacity }} />
      ))}
    </div>
  );
}

const cardBase =
  "relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/60 p-6 shadow-soft";

export function FeatureBento() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
      {/* Discover — the anchor card, spans two columns */}
      <div className={cn(cardBase, "bg-espresso text-crema lg:col-span-2 lg:row-span-2")}>
        <div>
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-crema/15">
            <Compass className="h-5 w-5 text-crema" />
          </div>
          <h3 className="font-heading text-xl font-semibold">Discover</h3>
          <p className="mt-2 max-w-xs text-sm text-crema/70">
            See what friends ordered, what&apos;s trending nearby, and what&apos;s
            actually worth trying before you get in line.
          </p>
        </div>
        <div className="mt-8 rounded-lg bg-crema/10 p-3">
          <p className="text-[11px] uppercase tracking-wide text-crema/50">Friends&apos; pick this week</p>
          <p className="mt-1 text-sm font-medium">Honey Lavender Latte</p>
          <div className="mt-1.5">
            <StarTrail />
          </div>
        </div>
      </div>

      {/* Log Every Coffee */}
      <div className={cn(cardBase, "bg-white")}>
        <div>
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-espresso/10">
            <NotebookPen className="h-5 w-5 text-espresso" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-espresso">Log every coffee</h3>
          <p className="mt-2 text-sm text-charcoal/60">
            Rate the drink, rate the shop. Every cup joins your record.
          </p>
        </div>
        <StarTrail />
      </div>

      {/* Find What's Near You */}
      <div className={cn(cardBase, "bg-white")}>
        <div>
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-espresso/10">
            <MapPin className="h-5 w-5 text-espresso" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-espresso">Find what&apos;s near you</h3>
          <p className="mt-2 text-sm text-charcoal/60">
            An interactive map, ranked by the drinks people recommend.
          </p>
        </div>
        <div className="mt-4 h-16 w-full opacity-90">
          <MiniMap />
        </div>
      </div>

      {/* Keep a Wishlist — spans two columns for visual variety */}
      <div className={cn(cardBase, "bg-sage/10 border-sage/30 lg:col-span-2")}>
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-sage/15">
              <Bookmark className="h-5 w-5 text-sage" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-espresso">Keep a wishlist</h3>
            <p className="mt-2 max-w-xs text-sm text-charcoal/60">
              Save a drink or a shop for later. It stays put until you&apos;re ready for it.
            </p>
          </div>
          <div className="hidden shrink-0 flex-col gap-2 sm:flex">
            {["Fern & Bloom", "The Reading Room"].map((name) => (
              <div key={name} className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-charcoal shadow-soft">
                <Bookmark className="h-3 w-3 fill-sage text-sage" />
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
