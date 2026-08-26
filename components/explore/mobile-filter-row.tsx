"use client";

import type { ExploreFilters, QuickFilter } from "@/lib/explore/types";

interface MobileFilterRowProps {
  filters: ExploreFilters;
  onChange: (filters: ExploreFilters) => void;
}

type ChipValue = QuickFilter | "independent";

const CHIPS: { value: ChipValue; label: string }[] = [
  { value: "independent", label: "Independent" },
  { value: "new", label: "New to me" },
  { value: "visited", label: "Visited" },
  { value: "friends", label: "Friends" },
];

/**
 * Deliberately narrow: Independent, New to me, Visited, Friends only,
 * no Highly rated, no Chain, no distance, no sort in the primary
 * mobile strip. All of that filter logic still exists in ExploreClient
 * unchanged, this only changes which controls render here. One row,
 * horizontal scroll, no wrap, no visible scrollbar.
 */
export function MobileFilterRow({ filters, onChange }: MobileFilterRowProps) {
  function isActive(value: ChipValue) {
    if (value === "independent") return filters.shopType === "independent";
    return filters.quick.includes(value);
  }

  function toggle(value: ChipValue) {
    if (value === "independent") {
      onChange({ ...filters, shopType: filters.shopType === "independent" ? "all" : "independent" });
      return;
    }
    const has = filters.quick.includes(value);
    onChange({
      ...filters,
      quick: has ? filters.quick.filter((q) => q !== value) : [...filters.quick, value],
    });
  }

  return (
    <div
      className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="flex w-max gap-2">
        {CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            aria-pressed={isActive(chip.value)}
            onClick={() => toggle(chip.value)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              isActive(chip.value) ? "border-espresso bg-espresso text-crema" : "border-border bg-white text-charcoal"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
