"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { StampDisplayItem } from "@/lib/passport/achievements";
import { StampCard } from "@/components/passport/stamp-card";

const MAX_LOCKED_PREVIEW = 2;
const LAST_SEEN_STORAGE_KEY = "coffee-passport:last-seen-stamp";

/**
 * Earned stamps first (most recently earned first — achievements can
 * only ever be earned once, never re-earned, so earnedAt is a stable
 * sort key), then up to 2 locked stamps as a preview of what's next,
 * picked by closest-to-unlocking rather than definition order, for a
 * genuine "almost there" sense of momentum. The full set (everything
 * beyond those 2 locked stamps) lives at /passport/stamps, reachable
 * via "View all" below the rail, not hidden — just not loaded up
 * front on the main Passport page.
 */
function selectRailItems(items: StampDisplayItem[]): StampDisplayItem[] {
  const earned = [...items.filter((i) => i.earned)].sort((a, b) => {
    if (!a.earnedAt || !b.earnedAt) return 0;
    return a.earnedAt > b.earnedAt ? -1 : 1;
  });
  const locked = [...items.filter((i) => !i.earned)].sort(
    (a, b) => b.progress / b.threshold - a.progress / a.threshold
  );
  return [...earned, ...locked.slice(0, MAX_LOCKED_PREVIEW)];
}

/**
 * Deliberately not a grid of identical dashboard cards, and no longer
 * the full wrapped wall of every stamp at once (that lived here
 * before; the same visual treatment now lives at /passport/stamps).
 * This is a compact horizontal rail instead: earned first, a couple
 * of locked previews after, scrollable rather than tall — the whole
 * point of this pass was reclaiming the vertical space the old full
 * grid used regardless of how many stamps existed.
 *
 * "New" badge: there's no backend "seen" state for achievements (V1
 * intentionally keeps evaluate_passport_achievements() dumb and
 * idempotent, with no read/unread concept), so this uses a lightweight
 * localStorage flag instead — the single most recently earned stamp's
 * key is compared against what was last recorded, and if it's
 * different (a new achievement since the last Passport visit), the
 * pill shows once and the key is recorded, so it won't show again on
 * the next visit. Wrapped in try/catch since localStorage can throw in
 * some private-browsing contexts; worst case on failure is the pill
 * simply doesn't show or reappears once more later, never a crash.
 */
export function Stamps({ items }: { items: StampDisplayItem[] }) {
  const railItems = useMemo(() => selectRailItems(items), [items]);
  const mostRecentEarnedKey = railItems.find((i) => i.earned)?.key ?? null;
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    if (!mostRecentEarnedKey) return;
    try {
      const lastSeen = window.localStorage.getItem(LAST_SEEN_STORAGE_KEY);
      if (lastSeen !== mostRecentEarnedKey) {
        setNewKey(mostRecentEarnedKey);
        window.localStorage.setItem(LAST_SEEN_STORAGE_KEY, mostRecentEarnedKey);
      }
    } catch {
      // Private-browsing/storage-disabled: no "New" pill this session,
      // not worth failing the page over.
    }
  }, [mostRecentEarnedKey]);

  if (railItems.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold text-espresso">Stamps</h2>
        <Link
          href="/passport/stamps"
          className="flex items-center gap-0.5 text-xs font-medium text-charcoal/50 hover:text-espresso"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {railItems.map((item) => (
          <div key={item.key} className="snap-start">
            <StampCard item={item} isNew={item.key === newKey} />
          </div>
        ))}
      </div>
    </section>
  );
}
