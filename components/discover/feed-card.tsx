import Link from "next/link";
import { MapPin, User } from "lucide-react";

import { StarDisplay } from "@/components/logs/star-display";
import { formatRelativeDate } from "@/lib/drink-logs/format";

export interface FeedItem {
  logId: string;
  loggedAt: string;
  drinkRating: number;
  caption: string | null;
  temperature: "hot" | "iced" | null;
  photoUrl: string | null;
  drinkName: string;
  category: "coffee" | "tea";
  shopId: string;
  shopName: string;
  username: string | null;
  firstName: string | null;
  avatarUrl: string | null;
}

interface FeedCardProps {
  item: FeedItem;
}

/**
 * Deliberately separate from LogCard: this represents someone else's
 * public post, not the owner's own log, so it carries an identity
 * header instead of Edit/Delete controls. Username isn't linked yet,
 * full public profile pages are Sprint 3F's job.
 */
export function FeedCard({ item }: FeedCardProps) {
  const displayName = item.firstName || item.username || "Someone";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-soft">
      <div className="flex items-center gap-2.5 px-4 pt-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-latte/30">
          {item.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-4 w-4 text-espresso/40" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-charcoal">
            {displayName}
            {item.username && <span className="ml-1 font-normal text-charcoal/40">@{item.username}</span>}
          </p>
        </div>
        <p className="ml-auto shrink-0 text-xs text-charcoal/40">{formatRelativeDate(item.loggedAt)}</p>
      </div>

      {item.photoUrl && (
        <div className="relative mt-3 aspect-[4/3] w-full bg-charcoal/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.photoUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-charcoal">{item.drinkName}</p>
            <Link
              href={`/shops/${item.shopId}`}
              className="flex items-center gap-1 text-xs text-charcoal/50 hover:text-espresso hover:underline"
            >
              <MapPin className="h-3 w-3" />
              {item.shopName}
            </Link>
          </div>
          <StarDisplay rating={item.drinkRating} size="h-3 w-3" showValue />
        </div>

        {item.caption && <p className="mt-2 text-sm text-charcoal/70">{item.caption}</p>}

        <div className="mt-3 flex items-center gap-2 text-xs text-charcoal/40">
          <span className="capitalize">{item.category}</span>
          {item.temperature && (
            <>
              <span aria-hidden="true">•</span>
              <span className="capitalize">{item.temperature}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
