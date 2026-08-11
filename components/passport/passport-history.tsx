"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";

import { LogCard, type LogCardData } from "@/components/logs/log-card";

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

export function PassportHistory({ initialLogs }: { initialLogs: LogCardData[] }) {
  const [logs, setLogs] = useState(initialLogs);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [sort, setSort] = useState<SortValue>("newest");
  const router = useRouter();

  function handleDeleted(logId: string) {
    // Same pattern established on Dashboard: the card disappears the
    // moment the server confirms the delete, then a background refresh
    // catches up everything derived from the full history (stats,
    // favorites, this list) without blocking that visual removal.
    setLogs((prev) => prev.filter((log) => log.id !== logId));
    router.refresh();
  }

  const visibleLogs = useMemo(() => {
    let result = logs;
    if (filter === "coffee") result = result.filter((l) => l.beverageCategory === "coffee");
    else if (filter === "tea") result = result.filter((l) => l.beverageCategory === "tea");
    else if (filter === "hot") result = result.filter((l) => l.temperature === "hot");
    else if (filter === "iced") result = result.filter((l) => l.temperature === "iced");

    const sorted = [...result];
    if (sort === "newest") {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === "oldest") {
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sort === "highest") {
      sorted.sort((a, b) => b.drinkRating - a.drinkRating);
    } else if (sort === "lowest") {
      sorted.sort((a, b) => a.drinkRating - b.drinkRating);
    }
    return sorted;
  }, [logs, filter, sort]);

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold text-espresso">Your coffee trail</h2>
          <p className="text-sm text-charcoal/50">Every cup along the way</p>
        </div>

        <div className="relative">
          <label htmlFor="passport-sort" className="sr-only">
            Sort history
          </label>
          <select
            id="passport-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortValue)}
            className="appearance-none rounded-lg border border-border bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-charcoal shadow-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-espresso"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40"
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter history">
        {FILTERS.map(({ value, label }) => {
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-espresso bg-espresso text-crema"
                  : "border-border bg-white text-charcoal hover:border-espresso/40"
              }`}
            >
              {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleLogs.map((log) => (
            <LogCard key={log.id} log={log} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </section>
  );
}
