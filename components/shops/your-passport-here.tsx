"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { LogCardColumns } from "@/components/logs/log-card-columns";
import { formatRelativeDate } from "@/lib/drink-logs/format";
import type { LogCardData } from "@/components/logs/log-card";

export interface YourPassportStats {
  logCount: number;
  avgOwnRating: number | null;
  mostRecentLoggedAt: string | null;
  favoriteDrinkName: string | null;
}

interface YourPassportHereProps {
  initialLogs: LogCardData[];
  stats: YourPassportStats | null;
}

/**
 * Same four stats as before, but "Visits logged" is the clear anchor,
 * a larger number with a small gold accent bar, the other three stay
 * secondary through smaller type and a plain top border rather than an
 * accent, not four identical boxes. Reuses LogCardColumns unchanged for
 * the history itself.
 */
export function YourPassportHere({ initialLogs, stats }: YourPassportHereProps) {
  const [logs, setLogs] = useState(initialLogs);
  const router = useRouter();

  function handleDeleted(logId: string) {
    setLogs((prev) => prev.filter((log) => log.id !== logId));
    router.refresh();
  }

  return (
    <section>
      <h2 className="mb-5 font-heading text-xl font-semibold text-espresso">Your Passport here</h2>

      {stats ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="relative overflow-hidden rounded-xl border border-border bg-white p-5 shadow-soft">
              <div className="absolute inset-x-0 top-0 h-1 bg-gold" aria-hidden="true" />
              <p className="font-heading text-3xl font-semibold text-espresso">{stats.logCount}</p>
              <p className="mt-0.5 text-xs font-medium text-charcoal/60">
                {stats.logCount === 1 ? "Visit logged" : "Visits logged"}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
              {stats.avgOwnRating !== null ? (
                <>
                  <p className="font-heading text-xl font-semibold text-espresso">
                    {stats.avgOwnRating.toFixed(1)}
                  </p>
                  <p className="mt-0.5 text-xs text-charcoal/60">Your avg rating</p>
                </>
              ) : (
                <p className="text-sm text-charcoal/50">Not yet rated</p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
              <p className="font-heading text-xl font-semibold text-espresso">
                {stats.mostRecentLoggedAt ? formatRelativeDate(stats.mostRecentLoggedAt) : "Never"}
              </p>
              <p className="mt-0.5 text-xs text-charcoal/60">Last visit</p>
            </div>

            <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
              <p className="truncate font-heading text-xl font-semibold text-espresso">
                {stats.favoriteDrinkName ?? "Still exploring"}
              </p>
              <p className="mt-0.5 text-xs text-charcoal/60">Your favorite here</p>
            </div>
          </div>

          <LogCardColumns logs={logs} onDeleted={handleDeleted} />
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-white/60 p-6 text-center text-sm text-charcoal/60">
          You haven&apos;t logged anything here yet.
        </p>
      )}
    </section>
  );
}
