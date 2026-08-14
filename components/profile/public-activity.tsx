"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { FeedColumns } from "@/components/discover/feed-columns";
import { Button } from "@/components/ui/button";
import { getPublicUserActivityPage } from "@/lib/profile/public-actions";
import type { FeedCursor } from "@/lib/discover/actions";
import type { FeedItem } from "@/components/discover/feed-card";

interface PublicActivityProps {
  username: string;
  identity: { username: string; firstName: string | null; avatarUrl: string | null };
  initialItems: FeedItem[];
  initialCursor: FeedCursor | null;
}

/** Reuses FeedColumns exactly as Discover does, no separate masonry
 *  implementation for this one section. */
export function PublicActivity({ username, identity, initialItems, initialCursor }: PublicActivityProps) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);

  async function handleLoadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const page = await getPublicUserActivityPage(username, cursor, identity);
    setItems((prev) => [...prev, ...page.items]);
    setCursor(page.nextCursor);
    setLoadingMore(false);
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-white/60 p-8 text-center text-sm text-charcoal/50">
        No public coffees yet.
      </p>
    );
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
