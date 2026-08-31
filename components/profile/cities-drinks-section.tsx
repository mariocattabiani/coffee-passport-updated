"use client";

import { useState } from "react";

import type { PublicCityRow, PublicDrinkRow } from "@/lib/profile/public-map-actions";

interface CitiesDrinksSectionProps {
  cities: PublicCityRow[];
  drinks: PublicDrinkRow[];
}

type Tab = "cities" | "drinks";

/**
 * A compact, scannable breakdown, not a ranking dashboard. Both lists
 * are already ordered most-active-first by their RPC and already
 * scoped to this user's public logs only — this component just
 * renders rows, it doesn't recompute or re-filter anything.
 */
export function CitiesDrinksSection({ cities, drinks }: CitiesDrinksSectionProps) {
  const [tab, setTab] = useState<Tab>("cities");

  if (cities.length === 0 && drinks.length === 0) return null;

  return (
    <div>
      <div className="mb-3 inline-flex rounded-full border border-border bg-white p-1">
        <button
          type="button"
          onClick={() => setTab("cities")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "cities" ? "bg-espresso text-crema" : "text-charcoal hover:text-espresso"
          }`}
        >
          Cities
        </button>
        <button
          type="button"
          onClick={() => setTab("drinks")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "drinks" ? "bg-espresso text-crema" : "text-charcoal hover:text-espresso"
          }`}
        >
          Drinks
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
        {tab === "cities" ? (
          cities.length === 0 ? (
            <p className="p-5 text-center text-sm text-charcoal/50">No public cities yet.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {cities.map((c) => (
                <div key={`${c.city}-${c.state ?? ""}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <p className="min-w-0 truncate font-medium text-charcoal">
                    {c.city}
                    {c.state && <span className="text-charcoal/50">, {c.state}</span>}
                  </p>
                  <p className="shrink-0 whitespace-nowrap text-xs text-charcoal/50">
                    {c.coffeeCount} {c.coffeeCount === 1 ? "coffee" : "coffees"}
                    <span className="mx-1 text-charcoal/30">·</span>
                    {c.cafeCount} {c.cafeCount === 1 ? "café" : "cafés"}
                  </p>
                </div>
              ))}
            </div>
          )
        ) : drinks.length === 0 ? (
          <p className="p-5 text-center text-sm text-charcoal/50">No public drinks yet.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {drinks.map((d) => (
              <div key={`${d.drinkName}-${d.category}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <p className="min-w-0 truncate font-medium text-charcoal">{d.drinkName}</p>
                <p className="shrink-0 whitespace-nowrap text-xs text-charcoal/50">
                  {d.logCount} logged
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
