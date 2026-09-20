"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Coffee, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StarDisplay } from "@/components/logs/star-display";

export interface TopDrink {
  drinkId: string;
  drinkName: string;
  category: "coffee" | "tea";
  avgRating: number | null;
  ratingCount: number;
}

interface TopDrinksProps {
  drinks: TopDrink[];
  shopId: string;
}

const PROMINENT_COUNT = 3;

/**
 * Drinks with 2+ ratings earn a place on the ranked list and a numbered
 * badge, #1 gets a solid gold medallion plus a truthful "Top rated"
 * label (it's genuinely the highest-rated ranked drink here, not an
 * invented badge), everyone else a quiet neutral one. A drink with
 * exactly one log stays in the same card, visually secondary, no
 * number, no exposed average, just "New here". The top 3 are always
 * shown; anything beyond that starts collapsed behind "See all N
 * drinks" so the section reads as a focused recommendation, not a
 * full menu dump, while everything still lives in the same card.
 */
export function TopDrinks({ drinks, shopId }: TopDrinksProps) {
  const [expanded, setExpanded] = useState(false);

  if (drinks.length === 0) {
    return (
      <section>
        <h2 className="mb-4 font-heading text-xl font-semibold text-espresso">What should I order?</h2>
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white/60 px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-espresso/10">
            <Sparkles className="h-6 w-6 text-espresso" />
          </div>
          <p className="mt-5 font-heading text-lg font-semibold text-espresso">Help build the menu</p>
          <p className="mt-1 max-w-xs text-sm text-charcoal/60">
            Be the first to log what you ordered here, and it becomes this café&apos;s first recommendation.
          </p>
          <Button asChild className="mt-6">
            <Link href={`/log?shopId=${shopId}`}>Log a drink</Link>
          </Button>
        </div>
      </section>
    );
  }

  const ranked = drinks.filter((d) => d.avgRating !== null);
  const newHere = drinks.filter((d) => d.avgRating === null);
  const combined = [...ranked.map((d) => ({ ...d, ranked: true as const })), ...newHere.map((d) => ({ ...d, ranked: false as const }))];
  const visible = expanded ? combined : combined.slice(0, PROMINENT_COUNT);
  const hiddenCount = combined.length - visible.length;

  // "Top rated" only ever labels the actual #1 ranked drink (highest
  // average among drinks with 2+ ratings) — never applied when there
  // is no ranked drink at all, so it's never a claim without data
  // behind it.
  const topRatedDrinkId = ranked[0]?.drinkId ?? null;

  return (
    <section>
      <div className="mb-5">
        <h2 className="font-heading text-xl font-semibold text-espresso">What should I order?</h2>
        <p className="text-sm text-charcoal/60">Top picks, according to the Passport</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
        {visible.map((drink, i) => {
          if (!drink.ranked) {
            return (
              <div
                key={drink.drinkId}
                className={`flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5 ${i > 0 ? "border-t border-border/60" : ""}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage/10 text-sage">
                  <Coffee className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-charcoal/80">{drink.drinkName}</p>
                  <p className="text-xs capitalize text-charcoal/50">{drink.category}</p>
                </div>
                <p className="shrink-0 text-xs font-medium text-sage">New here</p>
              </div>
            );
          }

          const rank = ranked.findIndex((d) => d.drinkId === drink.drinkId);
          return (
            <div
              key={drink.drinkId}
              className={`flex items-start gap-3 px-4 py-4 sm:items-center sm:gap-4 sm:px-5 sm:py-5 ${i > 0 ? "border-t border-border/60" : ""}`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-heading text-sm font-semibold sm:h-10 sm:w-10 sm:text-base ${
                  rank === 0 ? "bg-gold text-espresso" : "bg-espresso/5 text-espresso/60"
                }`}
              >
                {rank + 1}
              </div>
              {/* No truncation anywhere in this row: the drink name is
                  the most important thing here, so it wraps freely
                  (break-words, no line-clamp) rather than ever cutting
                  off to an unreadable fragment. Everything else wraps
                  onto its own line via flex-wrap when the name takes
                  more than one, instead of forcing a fixed two-column
                  layout that starves the name of width on narrow
                  screens. */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className={`break-words font-medium text-charcoal ${rank === 0 ? "text-base" : "text-sm"}`}>
                    {drink.drinkName}
                  </p>
                  {drink.drinkId === topRatedDrinkId && (
                    <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-espresso">
                      Top rated
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-charcoal/60">
                  <span className="capitalize">{drink.category}</span>
                  <span className="text-charcoal/30" aria-hidden="true">
                    ·
                  </span>
                  <StarDisplay rating={drink.avgRating!} size="h-3.5 w-3.5" showValue />
                  <span className="text-charcoal/30" aria-hidden="true">
                    ·
                  </span>
                  <span>
                    {drink.ratingCount} {drink.ratingCount === 1 ? "rating" : "ratings"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex w-full items-center justify-center gap-1.5 border-t border-border/60 py-3.5 text-sm font-medium text-espresso hover:bg-crema/60"
          >
            See all {combined.length} drinks
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </section>
  );
}
