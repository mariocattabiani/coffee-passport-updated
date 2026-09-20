"use client";

import { useEffect, useMemo, useState } from "react";

import { markPassportAchievementsSeen } from "@/lib/passport/actions";
import type { AchievementCategory, StampDisplayItem } from "@/lib/passport/achievements";
import { StampCard } from "@/components/passport/stamp-card";

type Filter = "all" | AchievementCategory;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "drink", label: "Drinks" },
  { value: "explore", label: "Explore" },
  { value: "loyalty", label: "Loyalty" },
  { value: "content", label: "Content" },
  { value: "milestone", label: "Milestones" },
];

export function StampsGrid({ items }: { items: StampDisplayItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const hasNew = items.some((item) => item.isNew);

  useEffect(() => {
    if (!hasNew) return;
    void markPassportAchievementsSeen().catch(() => {
      // The cards remain marked NEW and the next collection visit can
      // safely retry. Seen state never blocks browsing the collection.
    });
  }, [hasNew]);

  const visibleItems = useMemo(() => {
    const filtered = filter === "all" ? items : items.filter((item) => item.category === filter);
    return [...filtered].sort((a, b) => {
      if (a.earned !== b.earned) return a.earned ? -1 : 1;
      if (a.earnedAt && b.earnedAt) return a.earnedAt > b.earnedAt ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [filter, items]);

  return (
    <section>
      <div
        className="mb-7 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Filter stamps"
      >
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            aria-pressed={filter === option.value}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
              filter === option.value
                ? "border-espresso bg-espresso text-crema"
                : "border-border bg-white/70 text-charcoal/55 hover:border-espresso/30 hover:text-espresso"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 justify-items-center gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
        {visibleItems.map((item) => (
          <StampCard key={item.key} item={item} isNew={item.isNew} />
        ))}
      </div>
    </section>
  );
}
