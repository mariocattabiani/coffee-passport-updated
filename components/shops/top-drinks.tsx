import Link from "next/link";
import { Coffee, Sparkles } from "lucide-react";

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

/**
 * Drinks with 2+ ratings earn a place on the ranked list and a numbered
 * badge, #1 gets a solid gold medallion, everyone else a quiet neutral
 * one, that ranking claim needs real data behind it. A drink with
 * exactly one log stays in the same card, visually secondary, no
 * number, no exposed average, just "New here". Generous row padding
 * throughout so this reads like a tasting guide, not a settings list,
 * and holds up fine even with a single row.
 */
export function TopDrinks({ drinks, shopId }: TopDrinksProps) {
  if (drinks.length === 0) {
    return (
      <section>
        <h2 className="mb-4 font-heading text-xl font-semibold text-espresso">Top drinks</h2>
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white/60 px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-espresso/10">
            <Sparkles className="h-6 w-6 text-espresso" />
          </div>
          <p className="mt-5 font-heading text-lg font-semibold text-espresso">
            Be the first to put this café on the Passport.
          </p>
          <p className="mt-1 max-w-xs text-sm text-charcoal/60">
            Log a drink here and it will show up as this café&apos;s first recommendation.
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
      <div className="mb-5">
        <h2 className="font-heading text-xl font-semibold text-espresso">Top drinks</h2>
        <p className="text-sm text-charcoal/60">What to order, according to the Passport</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
        {ranked.map((drink, i) => (
          <div
            key={drink.drinkId}
            className={`flex items-center gap-4 px-5 py-6 ${i > 0 ? "border-t border-border/60" : ""}`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-heading text-base font-semibold ${
                i === 0 ? "bg-gold text-espresso" : "bg-espresso/5 text-espresso/60"
              }`}
            >
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`truncate font-medium text-charcoal ${i === 0 ? "text-base" : "text-sm"}`}>
                {drink.drinkName}
              </p>
              <p className="text-xs capitalize text-charcoal/60">{drink.category}</p>
            </div>
            <div className="shrink-0 text-right">
              <StarDisplay rating={drink.avgRating!} size="h-3.5 w-3.5" showValue />
              <p className="mt-0.5 text-xs text-charcoal/50">
                {drink.ratingCount} {drink.ratingCount === 1 ? "rating" : "ratings"}
              </p>
            </div>
          </div>
        ))}

        {newHere.length > 0 && (
          <div className={ranked.length > 0 ? "border-t border-border/60" : ""}>
            {newHere.map((drink) => (
              <div key={drink.drinkId} className="flex items-center gap-4 px-5 py-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage/10 text-sage">
                  <Coffee className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-charcoal/80">{drink.drinkName}</p>
                  <p className="text-xs capitalize text-charcoal/50">{drink.category}</p>
                </div>
                <p className="shrink-0 text-xs font-medium text-sage">New here</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
