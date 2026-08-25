"use client";

import type { ExploreFilters, ShopTypeFilter, QuickFilter } from "@/lib/explore/types";

interface FilterBarProps {
  filters: ExploreFilters;
  onChange: (filters: ExploreFilters) => void;
  hasLocation: boolean;
}

const SHOP_TYPE_OPTIONS: { value: ShopTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "independent", label: "Independent" },
  { value: "chain", label: "Chain" },
];

const QUICK_FILTER_OPTIONS: { value: QuickFilter; label: string }[] = [
  { value: "new", label: "New to me" },
  { value: "visited", label: "Visited" },
  { value: "highly_rated", label: "Highly rated" },
  { value: "friends", label: "Friends have been" },
];

const DISTANCE_OPTIONS = [1, 3, 5];

/**
 * Explicit three-state shop-type control, not an on/off Independent
 * toggle, an "off" state on a binary toggle can't distinguish "show
 * everything" from "show me chains specifically".
 */
export function FilterBar({ filters, onChange, hasLocation }: FilterBarProps) {
  function toggleQuick(value: QuickFilter) {
    const has = filters.quick.includes(value);
    onChange({
      ...filters,
      quick: has ? filters.quick.filter((q) => q !== value) : [...filters.quick, value],
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-full border border-border bg-white p-0.5" role="group" aria-label="Shop type">
        {SHOP_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={filters.shopType === opt.value}
            onClick={() => onChange({ ...filters, shopType: opt.value })}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filters.shopType === opt.value ? "bg-espresso text-crema" : "text-charcoal hover:bg-crema"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {QUICK_FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={filters.quick.includes(opt.value)}
          onClick={() => toggleQuick(opt.value)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            filters.quick.includes(opt.value)
              ? "border-espresso bg-espresso text-crema"
              : "border-border bg-white text-charcoal hover:border-espresso/40"
          }`}
        >
          {opt.label}
        </button>
      ))}

      {hasLocation && (
        <div className="flex rounded-full border border-border bg-white p-0.5" role="group" aria-label="Distance">
          <button
            type="button"
            aria-pressed={filters.maxDistanceMiles === null}
            onClick={() => onChange({ ...filters, maxDistanceMiles: null })}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filters.maxDistanceMiles === null ? "bg-espresso text-crema" : "text-charcoal hover:bg-crema"
            }`}
          >
            Any
          </button>
          {DISTANCE_OPTIONS.map((mi) => (
            <button
              key={mi}
              type="button"
              aria-pressed={filters.maxDistanceMiles === mi}
              onClick={() => onChange({ ...filters, maxDistanceMiles: mi })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filters.maxDistanceMiles === mi ? "bg-espresso text-crema" : "text-charcoal hover:bg-crema"
              }`}
            >
              {mi} mi
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
