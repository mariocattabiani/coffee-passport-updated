"use client";

import { useEffect, useState } from "react";

import { FeedCard, type FeedItem } from "@/components/discover/feed-card";
import { distributeIntoColumns } from "@/lib/drink-logs/masonry";

interface FeedColumnsProps {
  items: FeedItem[];
}

// Same breakpoints and hydration-safe approach already proven in
// LogCardColumns, reused rather than reimplemented: columnCount starts
// at 1 on both server and the client's first render, the real
// breakpoint is only read after mount, so hydration always compares
// identical single-column markup.
const MEDIUM_QUERY = "(min-width: 640px)";
const LARGE_QUERY = "(min-width: 1024px)";

function resolveColumnCount(): number {
  if (typeof window === "undefined") return 1;
  if (window.matchMedia(LARGE_QUERY).matches) return 3;
  if (window.matchMedia(MEDIUM_QUERY).matches) return 2;
  return 1;
}

export function FeedColumns({ items }: FeedColumnsProps) {
  const [columnCount, setColumnCount] = useState(1);

  useEffect(() => {
    const mediumQuery = window.matchMedia(MEDIUM_QUERY);
    const largeQuery = window.matchMedia(LARGE_QUERY);

    function updateColumnCount() {
      setColumnCount(resolveColumnCount());
    }

    updateColumnCount();
    mediumQuery.addEventListener("change", updateColumnCount);
    largeQuery.addEventListener("change", updateColumnCount);

    return () => {
      mediumQuery.removeEventListener("change", updateColumnCount);
      largeQuery.removeEventListener("change", updateColumnCount);
    };
  }, []);

  const columns = distributeIntoColumns(items, columnCount);

  return (
    <div className="flex min-w-0 gap-3">
      {columns.map((column, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col gap-3">
          {column.map((item) => (
            <FeedCard key={item.logId} item={item} />
          ))}
        </div>
      ))}
    </div>
  );
}
