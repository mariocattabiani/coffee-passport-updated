"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

import type { AchievementCategory, StampDisplayItem } from "@/lib/passport/achievements";
import { formatRemainingPhrase } from "@/lib/passport/achievements";

// Shape varies by category, so the collection reads as a real set of
// distinct stamps rather than one repeated badge with different text,
// circular for milestones and drink exploration, a soft oval for shop
// exploration, a softened rectangle for city exploration.
const SHAPE_BY_CATEGORY: Record<AchievementCategory, string> = {
  milestone: "rounded-full",
  shop: "rounded-[50%/38%]",
  city: "rounded-2xl",
  drink: "rounded-full",
};

function formatShortDate(earnedAt: string): string {
  return new Date(earnedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();
}

function formatFullDate(earnedAt: string): string {
  return new Date(earnedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/**
 * Every stamp uses the same flip interaction, earned or locked, so the
 * collection stays visually clean and exploring it is itself part of
 * the experience: tap, understand what it is, see how close you are.
 * Front and back are both always present in the DOM, only a transform
 * toggles which faces the viewer, so content is fully readable even
 * with prefers-reduced-motion, where the flip becomes an instant swap
 * instead of an animated rotation.
 *
 * Receives StampDisplayItem, not AchievementProgress: this is a Client
 * Component ("use client" above, for the flip state), and
 * AchievementProgress embeds the full AchievementDefinition, which
 * includes a getProgress function. Next.js cannot serialize a function
 * across the Server -> Client boundary, so only the plain, serializable
 * display fields ever reach this file.
 */
function StampCard({ item }: { item: StampDisplayItem }) {
  const [flipped, setFlipped] = useState(false);
  const shapeClass = SHAPE_BY_CATEGORY[item.category];
  const remaining = item.threshold - item.progress;

  return (
    <button
      type="button"
      onClick={() => setFlipped((v) => !v)}
      aria-expanded={flipped}
      aria-label={
        item.earned
          ? `${item.name}, earned, tap for details`
          : `${item.name}, locked, tap for details`
      }
      className="w-28 shrink-0 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-espresso focus-visible:ring-offset-2"
      style={{ perspective: "1000px" }}
    >
      <div
        className={`relative h-28 w-28 transition-transform duration-500 motion-reduce:transition-none [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* FRONT */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center border-2 px-2 text-center [backface-visibility:hidden] ${shapeClass} ${
            item.earned ? "border-gold bg-espresso shadow-card" : "border-dashed border-charcoal/25 bg-white"
          }`}
        >
          {item.earned ? (
            <>
              <p className="text-xs font-semibold leading-tight text-crema">{item.name}</p>
              <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-gold">Earned</p>
              {item.earnedAt && <p className="mt-0.5 text-[9px] text-crema/60">{formatShortDate(item.earnedAt)}</p>}
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 text-charcoal/30" aria-hidden="true" />
              <p className="mt-1.5 text-[10px] font-medium leading-tight text-charcoal/50">{item.name}</p>
            </>
          )}
        </div>

        {/* BACK */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center border-2 px-2.5 text-center [backface-visibility:hidden] [transform:rotateY(180deg)] ${shapeClass} ${
            item.earned ? "border-gold bg-espresso" : "border-charcoal/20 bg-white"
          }`}
        >
          {item.earned ? (
            <>
              <p className="text-[11px] font-semibold leading-tight text-crema">{item.name}</p>
              <p className="mt-1 text-[9px] leading-snug text-crema/70">{item.description}</p>
              {item.earnedAt && (
                <p className="mt-1.5 text-[8px] font-medium text-gold">Earned {formatFullDate(item.earnedAt)}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold leading-tight text-charcoal">{item.name}</p>
              <p className="mt-1 text-[9px] leading-snug text-charcoal/60">{item.description}</p>
              <p className="mt-1.5 text-[10px] font-semibold text-sage">
                {item.progress} of {item.threshold} {item.progressUnitPlural}
              </p>
              {remaining > 0 && (
                <p className="text-[8px] text-charcoal/50">
                  {formatRemainingPhrase(remaining, item.progressUnitSingular, item.progressUnitPlural, "to unlock")}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </button>
  );
}

/**
 * Deliberately not a grid of identical dashboard cards. Earned stamps
 * are solid espresso with a thin gold rule, unearned ones are muted
 * and dashed with a lock, no cartoon styling, no ambient animation.
 */
export function Stamps({ items }: { items: StampDisplayItem[] }) {
  return (
    <section>
      <h2 className="mb-4 font-heading text-xl font-semibold text-espresso">Stamps</h2>
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-6 rounded-2xl border border-border bg-white p-6 shadow-soft sm:justify-start">
        {items.map((item) => (
          <StampCard key={item.key} item={item} />
        ))}
      </div>
    </section>
  );
}
