"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import type { ExploreFilters } from "@/lib/explore/types";

interface FiltersPopoverProps {
  filters: ExploreFilters;
  onChange: (filters: ExploreFilters) => void;
  hasLocation: boolean;
}

const DISTANCE_OPTIONS = [1, 3, 5];

/** Houses just the distance filter, the one control that needed a
 *  home after removing the permanent distance row from the main
 *  layout. Only relevant, and only rendered, once location is known,
 *  same as the old inline distance chips were. */
export function FiltersPopover({ filters, onChange, hasLocation }: FiltersPopoverProps) {
  const [open, setOpen] = useState(false);
  if (!hasLocation) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-charcoal hover:border-espresso/40"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        Distance{filters.maxDistanceMiles ? `: ${filters.maxDistanceMiles} mi` : ""}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-40 rounded-xl border border-border bg-white p-2 shadow-card">
          {[null, ...DISTANCE_OPTIONS].map((mi) => (
            <button
              key={mi ?? "any"}
              type="button"
              onClick={() => {
                onChange({ ...filters, maxDistanceMiles: mi });
                setOpen(false);
              }}
              className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium ${
                filters.maxDistanceMiles === mi ? "bg-espresso text-crema" : "text-charcoal hover:bg-crema"
              }`}
            >
              {mi === null ? "Any distance" : `${mi} mi`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
