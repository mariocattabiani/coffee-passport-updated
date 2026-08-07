"use client";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DRINK_OPTIONS, type DrinkOption } from "@/lib/onboarding/drink-options";
import type { WizardData } from "@/lib/onboarding/types";

interface StepDrinksProps {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const COFFEE_DRINKS = DRINK_OPTIONS.filter((d) => d.category === "coffee");
const TEA_DRINKS = DRINK_OPTIONS.filter((d) => d.category === "tea");

export function StepDrinks({ data, update, onNext, onBack }: StepDrinksProps) {
  function toggle(drink: string) {
    const has = data.favoriteDrinks.includes(drink);
    update({
      favoriteDrinks: has
        ? data.favoriteDrinks.filter((d) => d !== drink)
        : [...data.favoriteDrinks, drink],
    });
  }

  function renderChip(option: DrinkOption, size: "default" | "small") {
    const selected = data.favoriteDrinks.includes(option.name);
    const isSmall = size === "small";
    return (
      <button
        key={`${option.category}-${option.name}`}
        type="button"
        onClick={() => toggle(option.name)}
        className={`flex items-center gap-1.5 rounded-full border font-medium transition-colors ${
          isSmall ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
        } ${
          selected
            ? isSmall
              ? "border-sage bg-sage/15 text-espresso"
              : "border-espresso bg-espresso text-crema"
            : "border-border bg-white text-charcoal hover:border-espresso/40"
        }`}
      >
        {selected && <Check className={isSmall ? "h-3 w-3" : "h-3.5 w-3.5"} />}
        {option.name}
      </button>
    );
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-semibold text-espresso">Favorite coffee drinks</h2>
      <p className="mt-1.5 text-sm text-charcoal/60">
        Pick as many as you like. This helps us show better recommendations later.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {COFFEE_DRINKS.map((option) => renderChip(option, "default"))}
      </div>

      <div className="mt-8 border-t border-border/60 pt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/40">
          Tea, if that's your thing too
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TEA_DRINKS.map((option) => renderChip(option, "small"))}
        </div>
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
