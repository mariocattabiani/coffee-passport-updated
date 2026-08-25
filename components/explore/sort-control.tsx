"use client";

import type { SortOption } from "@/lib/explore/types";

interface SortControlProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  hasLocation: boolean;
}

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: "nearby", label: "Nearby" },
  { value: "top_rated", label: "Top rated" },
  { value: "most_logged", label: "Most logged" },
  { value: "new_to_me", label: "New to me" },
];

/** No "Recommended" option, every label describes exactly what the
 *  sort actually does, nothing here claims intelligence it doesn't
 *  have. */
export function SortControl({ value, onChange, hasLocation }: SortControlProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
      className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-charcoal focus:border-espresso focus:outline-none"
      aria-label="Sort results"
    >
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.value === "nearby" && !hasLocation}>
          {opt.label}
          {opt.value === "nearby" && !hasLocation ? " (needs location)" : ""}
        </option>
      ))}
    </select>
  );
}
