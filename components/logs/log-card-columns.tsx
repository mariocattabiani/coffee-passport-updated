"use client";

import { useEffect, useState } from "react";

import { LogCard, type LogCardData } from "@/components/logs/log-card";
import { distributeIntoColumns } from "@/lib/drink-logs/masonry";

interface LogCardColumnsProps {
  logs: LogCardData[];
  onDeleted: (logId: string) => void;
}

// Same breakpoints already used everywhere else in this codebase,
// Tailwind's sm and lg.
const MEDIUM_QUERY = "(min-width: 640px)";
const LARGE_QUERY = "(min-width: 1024px)";

function resolveColumnCount(): number {
  if (typeof window === "undefined") return 1;
  if (window.matchMedia(LARGE_QUERY).matches) return 3;
  if (window.matchMedia(MEDIUM_QUERY).matches) return 2;
  return 1;
}

/**
 * Lays LogCards out in independently-heighted columns instead of a
 * plain CSS grid, so a photo card next to a short text-only card
 * doesn't force a large blank gap under the shorter one, that's exactly
 * what happens in a normal grid, since a row's height is always set by
 * its tallest cell.
 *
 * Exactly one LogCard is rendered per log, always. Only the active
 * breakpoint's column count is ever computed, there is no 1/2/3-column
 * layout rendered simultaneously and no CSS-columns auto-flow (which
 * would read column-major, wrong for a chronological feed). Cards are
 * distributed round-robin, item i into column i % columnCount, so
 * within any single column order stays strictly newest-to-oldest, the
 * source list itself is never re-sorted here.
 *
 * Hydration safety: columnCount starts at 1 on both the server and the
 * client's first render (the server has no viewport to consult), so
 * hydration always compares identical single-column markup. The real
 * breakpoint is only read inside useEffect, which runs after hydration
 * completes, correcting to 2 or 3 columns is an ordinary post-mount
 * state update, not a hydration mismatch. The accepted tradeoff: a
 * desktop visitor sees a brief single-column flash before that effect
 * corrects it on first load.
 */
export function LogCardColumns({ logs, onDeleted }: LogCardColumnsProps) {
  const [columnCount, setColumnCount] = useState(1);

  useEffect(() => {
    const mediumQuery = window.matchMedia(MEDIUM_QUERY);
    const largeQuery = window.matchMedia(LARGE_QUERY);

    function updateColumnCount() {
      setColumnCount(resolveColumnCount());
    }

    // Correct the initial guess right after mount, then only react
    // again when a query's match state actually flips, not on every
    // resize pixel while dragging a window edge.
    updateColumnCount();
    mediumQuery.addEventListener("change", updateColumnCount);
    largeQuery.addEventListener("change", updateColumnCount);

    return () => {
      mediumQuery.removeEventListener("change", updateColumnCount);
      largeQuery.removeEventListener("change", updateColumnCount);
    };
  }, []);

  const columns = distributeIntoColumns(logs, columnCount);

  return (
    <div className="flex gap-4">
      {columns.map((column, i) => (
        <div key={i} className="flex flex-1 flex-col gap-4">
          {column.map((log) => (
            <LogCard key={log.id} log={log} onDeleted={onDeleted} />
          ))}
        </div>
      ))}
    </div>
  );
}
