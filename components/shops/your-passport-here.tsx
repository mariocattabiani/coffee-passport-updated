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
 * Same four facts as before, logic untouched, but composed as one
 * integrated card rather than four identical white boxes: "Visits
 * logged" is the clear anchor (a larger number with a small gold
 * accent bar, the same treatment PassportHeader's own primary stat
 * uses), the other three sit beside it as a divided secondary row.
 * Reuses LogCardColumns unchanged for the history itself.
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
          <div className="mb-6 flex flex-col gap-6 rounded-2xl border border-border bg-white p-6 shadow-soft sm:flex-row sm:items-center">
            <div className="relative shrink-0 pl-4 sm:pr-8">
              <div className="absolute inset-y-0 left-0 w-1 rounded-full bg-gold" aria-hidden="true" />
              <p className="font-heading text-4xl font-semibold text-espresso">{stats.logCount}</p>
              <p className="mt-0.5 text-xs font-medium text-charcoal/60">
                {stats.logCount === 1 ? "Visit logged" : "Visits logged"}
              </p>
            </div>

            <div className="grid grid-cols-3 divide-x divide-border/60 border-t border-border/60 pt-5 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
              <div className="pr-3">
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

              <div className="px-3">
                <p className="font-heading text-xl font-semibold text-espresso">
                  {stats.mostRecentLoggedAt ? formatRelativeDate(stats.mostRecentLoggedAt) : "Never"}
                </p>
                <p className="mt-0.5 text-xs text-charcoal/60">Last visit</p>
              </div>

              <div className="pl-3">
                <p className="line-clamp-2 break-words font-heading text-base font-semibold leading-snug text-espresso sm:text-lg">
                  {stats.favoriteDrinkName ?? "Still exploring"}
                </p>
                <p className="mt-0.5 text-xs text-charcoal/60">Your favorite here</p>
              </div>
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
