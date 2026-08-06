"use client";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DRINK_OPTIONS } from "@/lib/onboarding/drink-options";
import type { WizardData } from "@/lib/onboarding/types";

interface StepDrinksProps {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepDrinks({ data, update, onNext, onBack }: StepDrinksProps) {
  function toggle(drink: string) {
    const has = data.favoriteDrinks.includes(drink);
    update({
      favoriteDrinks: has
        ? data.favoriteDrinks.filter((d) => d !== drink)
        : [...data.favoriteDrinks, drink],
    });
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-semibold text-espresso">Favorite coffee drinks</h2>
      <p className="mt-1.5 text-sm text-charcoal/60">
        Pick as many as you like — this helps us show you better recommendations later.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {DRINK_OPTIONS.map((drink) => {
          const selected = data.favoriteDrinks.includes(drink);
          return (
            <button
              key={drink}
              type="button"
              onClick={() => toggle(drink)}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                selected
                  ? "border-espresso bg-espresso text-crema"
                  : "border-border bg-white text-charcoal hover:border-espresso/40"
              }`}
            >
              {selected && <Check className="h-3.5 w-3.5" />}
              {drink}
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}
