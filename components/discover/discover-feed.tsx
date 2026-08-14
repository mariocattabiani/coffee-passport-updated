"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { FeedColumns } from "@/components/discover/feed-columns";
import { FeedEmptyState } from "@/components/discover/feed-empty-state";
import { Button } from "@/components/ui/button";
import { getPublicFeedPage, getFriendsFeedPage, type FeedCursor } from "@/lib/discover/actions";
import type { FeedItem } from "@/components/discover/feed-card";

interface DiscoverFeedProps {
  initialItems: FeedItem[];
  initialCursor: FeedCursor | null;
}

type Tab = "for-you" | "friends";

/**
 * Two independent feeds sharing one component: For You keeps the
 * existing global public-feed behavior exactly as it was, its first
 * page arrives with the initial server render, same as before. Friends
 * is lazy: nothing is fetched until the person actually switches to
 * that tab, then it's fetched once and kept in state for the rest of
 * the session. Both tabs use the exact same FeedColumns/FeedCard, the
 * same 3-key cursor, and the same short-lived signed URLs, this is not
 * a second feed architecture.
 */
export function DiscoverFeed({ initialItems, initialCursor }: DiscoverFeedProps) {
  const [tab, setTab] = useState<Tab>("for-you");

  const [forYouItems, setForYouItems] = useState(initialItems);
  const [forYouCursor, setForYouCursor] = useState(initialCursor);

  const [friendsItems, setFriendsItems] = useState<FeedItem[]>([]);
  const [friendsCursor, setFriendsCursor] = useState<FeedCursor | null>(null);
  const [friendsLoaded, setFriendsLoaded] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);

  const [loadingMore, setLoadingMore] = useState(false);

  async function handleTabChange(next: Tab) {
    setTab(next);
    if (next === "friends" && !friendsLoaded) {
      setFriendsLoading(true);
      const page = await getFriendsFeedPage(null);
      setFriendsItems(page.items);
      setFriendsCursor(page.nextCursor);
      setFriendsLoaded(true);
      setFriendsLoading(false);
    }
  }

  async function handleLoadMore() {
    setLoadingMore(true);
    if (tab === "for-you") {
      if (forYouCursor) {
        const page = await getPublicFeedPage(forYouCursor);
        setForYouItems((prev) => [...prev, ...page.items]);
        setForYouCursor(page.nextCursor);
      }
    } else {
      if (friendsCursor) {
        const page = await getFriendsFeedPage(friendsCursor);
        setFriendsItems((prev) => [...prev, ...page.items]);
        setFriendsCursor(page.nextCursor);
      }
    }
    setLoadingMore(false);
  }

  const items = tab === "for-you" ? forYouItems : friendsItems;
  const cursor = tab === "for-you" ? forYouCursor : friendsCursor;
  const showingFriendsLoading = tab === "friends" && friendsLoading;

  return (
    <div>
      <div className="mb-5 flex gap-2">
        <button
          type="button"
          onClick={() => handleTabChange("for-you")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === "for-you"
              ? "bg-espresso text-crema"
              : "border border-border bg-white text-charcoal hover:border-espresso/40"
          }`}
        >
          For You
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("friends")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === "friends"
              ? "bg-espresso text-crema"
              : "border border-border bg-white text-charcoal hover:border-espresso/40"
          }`}
        >
          Friends
        </button>
      </div>

      {showingFriendsLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-charcoal/30" aria-hidden="true" />
        </div>
      ) : items.length === 0 ? (
        tab === "friends" ? (
          <p className="rounded-xl border border-dashed border-border bg-white/60 p-8 text-center text-sm text-charcoal/50">
            No public logs from friends yet.
          </p>
        ) : (
          <FeedEmptyState />
        )
      ) : (
        <>
          <FeedColumns items={items} />
          {cursor && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore} className="gap-2">
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
