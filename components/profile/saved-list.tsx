"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, X, Compass } from "lucide-react";

import { toggleSave } from "@/lib/social/actions";
import { formatRelativeDate } from "@/lib/drink-logs/format";
import type { SavedItem } from "@/lib/profile/saved-actions";

interface SavedListProps {
  initialItems: SavedItem[];
}

/**
 * A compact utility list, not another social photo feed — no photo,
 * no rating, no caption. Each row is drink + café (or, for a café-only
 * save, just the café with a "Café saved to try" note), when it was
 * saved, and where it came from if that source post is still public.
 *
 * Remove reuses toggle_save exactly as-is (see lib/social/actions.ts):
 * calling it again with the same (shop, drink) toggles the existing
 * save off, the same one code path Discover's bookmark button already
 * uses, not a second removal mechanism. Optimistic: the row disappears
 * immediately and is restored, in its original sorted position, if the
 * mutation fails.
 */
export function SavedList({ initialItems }: SavedListProps) {
  const [items, setItems] = useState(initialItems);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  async function handleRemove(item: SavedItem) {
    if (pendingIds.has(item.saveId)) return;

    setItems((prev) => prev.filter((i) => i.saveId !== item.saveId));
    setPendingIds((prev) => new Set(prev).add(item.saveId));

    try {
      await toggleSave(item.shopId, item.drinkId, null);
    } catch {
      setItems((prev) => [...prev, item].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)));
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.saveId);
        return next;
      });
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white/60 p-8 text-center">
        <p className="text-sm text-charcoal/60">
          Nothing saved yet. Discover coffees and tap the bookmark when you find something you want to
          try.
        </p>
        <Link
          href="/discover"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-espresso px-4 py-2 text-sm font-medium text-crema hover:bg-espresso/90"
        >
          <Compass className="h-3.5 w-3.5" />
          Discover coffees
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
      <div className="divide-y divide-border/60">
        {items.map((item) => (
          <div key={item.saveId} className="flex min-w-0 items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-charcoal">{item.drinkName ?? item.shopName}</p>
              <Link
                href={`/shops/${item.shopId}`}
                className="flex min-w-0 items-center gap-1 text-xs text-charcoal/50 hover:text-espresso hover:underline"
              >
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {item.drinkName
                    ? `${item.shopName}${item.city ? `, ${item.city}` : ""}`
                    : `Café saved to try${item.city ? ` · ${item.city}` : ""}`}
                </span>
              </Link>
              <p className="mt-1 truncate text-xs text-charcoal/40">
                Saved {formatRelativeDate(item.createdAt)}
                {item.sourceVisible && item.sourceFirstName
                  ? ` · from ${item.sourceFirstName}'s post`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleRemove(item)}
              disabled={pendingIds.has(item.saveId)}
              aria-label="Remove from Saved"
              className="shrink-0 rounded-full p-1.5 text-charcoal/40 transition-colors hover:bg-crema hover:text-error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
