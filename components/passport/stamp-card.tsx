"use client";

import { useState } from "react";
import {
  Award,
  Camera,
  Coffee,
  Compass,
  Layers3,
  Lock,
  Map,
  MessageCircle,
  Star,
  Store,
} from "lucide-react";

import type { AchievementCategory, AchievementIcon, StampDisplayItem } from "@/lib/passport/achievements";
import { formatRemainingPhrase } from "@/lib/passport/achievements";

// Shape varies by category, so the collection reads as a real set of
// distinct stamps rather than one repeated badge with different text,
// circular for milestones and drink exploration, a soft oval for shop
// exploration, a softened rectangle for city exploration.
const SHAPE_BY_CATEGORY: Record<AchievementCategory, string> = {
  milestone: "rounded-full",
  explore: "rounded-[50%/38%]",
  loyalty: "rounded-2xl",
  content: "rounded-full",
  drink: "rounded-full",
};

const ICON_BY_NAME = {
  coffee: Coffee,
  cup: Coffee,
  compass: Compass,
  store: Store,
  camera: Camera,
  message: MessageCircle,
  star: Star,
  layers: Layers3,
  map: Map,
} satisfies Record<AchievementIcon, typeof Award>;

const RARITY_STYLE = {
  Common: "text-crema/65",
  Uncommon: "text-sage",
  Rare: "text-gold",
  Legendary: "text-amber-200",
};

function formatShortDate(earnedAt: string): string {
  return new Date(earnedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();
}

function formatFullDate(earnedAt: string): string {
  return new Date(earnedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

interface StampCardProps {
  item: StampDisplayItem;
  /** Shows a small NEW pill until the person opens the full stamps
   *  collection, backed by passport_achievements.seen_at. */
  isNew?: boolean;
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
 * Component (for the flip state), and AchievementProgress embeds the
 * full AchievementDefinition, which includes a getProgress function.
 * Next.js cannot serialize a function across the Server -> Client
 * boundary, so only the plain, serializable display fields ever reach
 * this file.
 */
export function StampCard({ item, isNew = false }: StampCardProps) {
  const [flipped, setFlipped] = useState(false);
  const shapeClass = SHAPE_BY_CATEGORY[item.category];
  const remaining = item.threshold - item.progress;
  const Icon = ICON_BY_NAME[item.icon];

  return (
    <button
      type="button"
      onClick={() => setFlipped((v) => !v)}
      aria-expanded={flipped}
      aria-label={
        item.earned
          ? `${item.name}, earned${isNew ? ", new" : ""}, tap for details`
          : `${item.name}, locked, tap for details`
      }
      className="relative w-32 shrink-0 rounded-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-espresso focus-visible:ring-offset-2"
      style={{ perspective: "1000px" }}
    >
      {isNew && (
        <span className="absolute right-2 top-2 z-20 rounded-full bg-sage px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white shadow-soft">
          New
        </span>
      )}

      <div
        className={`relative h-40 w-32 transition-transform duration-500 motion-reduce:transition-none [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* FRONT */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center border-2 px-3 text-center [backface-visibility:hidden] ${shapeClass} ${
            item.earned ? "border-gold/80 bg-espresso shadow-card" : "border-dashed border-charcoal/20 bg-crema/40"
          }`}
        >
          {item.earned ? (
            <>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gold/60 bg-crema/10">
                <Icon className="h-6 w-6 text-gold" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold leading-tight text-crema">{item.name}</p>
              <p className={`mt-2 text-[9px] font-semibold uppercase tracking-[0.16em] ${RARITY_STYLE[item.difficulty]}`}>
                {item.difficulty}
              </p>
              {item.earnedAt && <p className="mt-0.5 text-[9px] text-crema/60">{formatShortDate(item.earnedAt)}</p>}
            </>
          ) : (
            <>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-charcoal/15 bg-white/70">
                <Icon className="h-5 w-5 text-charcoal/25" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold leading-tight text-charcoal/55">{item.name}</p>
              <div className="mt-2 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-charcoal/35">
                <Lock className="h-3 w-3" aria-hidden="true" />
                {item.difficulty}
              </div>
            </>
          )}
        </div>

        {/* BACK */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center border-2 px-3 text-center [backface-visibility:hidden] [transform:rotateY(180deg)] ${shapeClass} ${
            item.earned ? "border-gold bg-espresso" : "border-charcoal/20 bg-crema/40"
          }`}
        >
          {item.earned ? (
            <>
              <p className="text-xs font-semibold leading-tight text-crema">{item.name}</p>
              <p className="mt-2 text-[10px] leading-snug text-crema/75">{item.description}</p>
              {item.earnedAt && (
                <p className="mt-1.5 text-[8px] font-medium text-gold">Earned {formatFullDate(item.earnedAt)}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs font-semibold leading-tight text-charcoal">{item.name}</p>
              <p className="mt-2 text-[10px] leading-snug text-charcoal/60">{item.description}</p>
              <p className="mt-2 text-[10px] font-semibold text-sage">
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
