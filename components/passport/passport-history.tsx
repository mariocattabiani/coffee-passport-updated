"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { type LogCardData } from "@/components/logs/log-card";
import { PassportLogGrid } from "@/components/passport/passport-log-grid";

type FilterValue = "all" | "coffee" | "tea" | "hot" | "iced";
type SortValue = "newest" | "oldest" | "highest" | "lowest";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "coffee", label: "Coffee" },
  { value: "tea", label: "Tea" },
  { value: "hot", label: "Hot" },
  { value: "iced", label: "Iced" },
];

const SORTS: { value: SortValue; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
];

/**
 * A visual collection grid, not the old long card-per-log list.
 * Editing/deleting now lives on /logs/[id] (every tile is one tap
 * target straight there), so this component no longer needs to track
 * local removal state the way the old LogCardColumns wiring did — a
 * delete elsewhere redirects back here and a fresh page load already
 * has the correct data, no client-side patching required.
 */
export function PassportHistory({ initialLogs }: { initialLogs: LogCardData[] }) {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [sort, setSort] = useState<SortValue>("newest");

  const visibleLogs = useMemo(() => {
    let result = initialLogs;
    if (filter === "coffee") result = result.filter((l) => l.beverageCategory === "coffee");
    else if (filter === "tea") result = result.filter((l) => l.beverageCategory === "tea");
    else if (filter === "hot") result = result.filter((l) => l.temperature === "hot");
    else if (filter === "iced") result = result.filter((l) => l.temperature === "iced");

    const sorted = [...result];
    if (sort === "newest") {
      sorted.sort((a, b) => {
        const diff = new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime();
        return diff !== 0 ? diff : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else if (sort === "oldest") {
      sorted.sort((a, b) => {
        const diff = new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime();
        return diff !== 0 ? diff : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    } else if (sort === "highest") {
      sorted.sort((a, b) => b.drinkRating - a.drinkRating);
    } else if (sort === "lowest") {
      sorted.sort((a, b) => a.drinkRating - b.drinkRating);
    }
    return sorted;
  }, [initialLogs, filter, sort]);

  return (
    <section>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold text-espresso">Your coffee trail</h2>
          <p className="text-sm text-charcoal/50">Every cup along the way</p>
        </div>

        <div className="relative shrink-0">
          <label htmlFor="passport-sort" className="sr-only">
            Sort history
          </label>
          <select
            id="passport-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortValue)}
            className="appearance-none rounded-lg border border-border bg-white py-2 pl-3.5 pr-9 text-base font-medium text-charcoal shadow-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-espresso sm:text-sm"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-charcoal/40"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Compact, horizontally-scrollable on mobile rather than
          wrapping onto multiple lines — the gallery below is meant to
          be the visual focus, not a filter toolbar competing for
          attention above it. No page-level scroll: this scrolls
          independently within its own row. */}
      <div
        className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Filter history"
      >
        {FILTERS.map(({ value, label }) => {
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={active}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-espresso bg-espresso text-crema"
                  : "border-border bg-white text-charcoal hover:border-espresso/40"
              }`}
            >
              {active && <Check className="h-3 w-3" aria-hidden="true" />}
              {label}
            </button>
          );
        })}
      </div>

      {visibleLogs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-white/50 p-8 text-center text-sm text-charcoal/40">
          No logs match this filter.
        </p>
      ) : (
        <PassportLogGrid logs={visibleLogs} />
      )}
    </section>
  );
}
