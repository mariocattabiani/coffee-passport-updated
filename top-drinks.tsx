import Link from "next/link";
import { Coffee, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StarDisplay } from "@/components/logs/star-display";
import { SectionKicker } from "@/components/shops/section-kicker";

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

/**
 * Same ranking rules as before: 2+ ratings earns a place on the ranked
 * board and a numbered medallion, exactly 1 rating shows only as
 * "New here" with no number and no exposed average, never both tiers
 * mixed together as if they were equally proven. Tier 2 is deliberately
 * styled as loose tags rather than full rows, both to keep the ranked
 * board feeling substantial and earned, and to give the section real
 * visual variety rather than one long list with a badge swapped out.
 */
export function TopDrinks({ drinks, shopId }: TopDrinksProps) {
  if (drinks.length === 0) {
    return (
      <section>
        <SectionKicker label="What to order" />
        <h2 className="mt-1 font-heading text-2xl font-semibold text-espresso sm:text-3xl">Top drinks</h2>
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border bg-white/60 px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-espresso/10">
            <Sparkles className="h-6 w-6 text-espresso" />
          </div>
          <p className="mt-5 font-heading text-lg font-semibold text-espresso">
            Be the first to put this café on the Passport.
          </p>
          <p className="mt-1 max-w-xs text-sm text-charcoal/60">
            Log a drink here and it will show up as this café's first recommendation.
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

  return (
    <section>
      <SectionKicker label="What to order" />
      <div className="mt-1 flex items-end justify-between gap-4">
        <h2 className="font-heading text-2xl font-semibold text-espresso sm:text-3xl">Top drinks</h2>
        <p className="hidden text-sm text-charcoal/50 sm:block">The Passport's own tasting board</p>
      </div>

      {ranked.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
          {ranked.map((drink, i) => (
            <div
              key={drink.drinkId}
              className={`flex items-center gap-4 px-5 py-5 ${
                i > 0 ? "border-t border-dashed border-border" : ""
              } ${i === 0 ? "bg-gradient-to-r from-gold/[0.1] to-transparent" : ""}`}
            >
              <div
                className={`flex shrink-0 items-center justify-center rounded-full font-heading font-semibold ${
                  i === 0
                    ? "h-11 w-11 border-2 border-gold bg-gold/10 text-lg text-espresso"
                    : "h-9 w-9 bg-espresso/5 text-sm text-espresso/60"
                }`}
              >
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate font-medium text-charcoal ${i === 0 ? "text-base" : "text-sm"}`}>
                  {drink.drinkName}
                </p>
                <p className="text-xs capitalize text-charcoal/50">{drink.category}</p>
              </div>
              <div className="shrink-0 text-right">
                <StarDisplay rating={drink.avgRating!} size="h-3.5 w-3.5" showValue />
                <p className="mt-0.5 text-xs text-charcoal/40">
                  {drink.ratingCount} {drink.ratingCount === 1 ? "rating" : "ratings"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {newHere.length > 0 && (
        <div className={ranked.length > 0 ? "mt-6" : "mt-6"}>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sage">Also on the Passport</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {newHere.map((drink) => (
              <div
                key={drink.drinkId}
                className="flex items-center gap-2 rounded-full border border-sage/30 bg-sage/[0.06] py-1.5 pl-1.5 pr-3.5"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sage/15 text-sage">
                  <Coffee className="h-3 w-3" />
                </span>
                <span className="text-sm font-medium text-charcoal">{drink.drinkName}</span>
                <span className="text-xs text-sage">New here</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
