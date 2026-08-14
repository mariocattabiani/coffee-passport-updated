"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { FeedColumns } from "@/components/discover/feed-columns";
import { FeedEmptyState } from "@/components/discover/feed-empty-state";
import { Button } from "@/components/ui/button";
import { getPublicFeedPage, type FeedCursor } from "@/lib/discover/actions";
import type { FeedItem } from "@/components/discover/feed-card";

interface DiscoverFeedProps {
  initialItems: FeedItem[];
  initialCursor: FeedCursor | null;
}

export function DiscoverFeed({ initialItems, initialCursor }: DiscoverFeedProps) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);

  async function handleLoadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const page = await getPublicFeedPage(cursor);
    setItems((prev) => [...prev, ...page.items]);
    setCursor(page.nextCursor);
    setLoadingMore(false);
  }

  if (items.length === 0) {
    return <FeedEmptyState />;
  }

  return (
    <div>
      <FeedColumns items={items} />

      {cursor && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore} className="gap-2">
            {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
