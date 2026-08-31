import Link from "next/link";
import { User } from "lucide-react";

import { LogCardBody } from "@/components/logs/log-card-body";
import { SocialActionRow } from "@/components/logs/social-action-row";
import { formatRelativeDate } from "@/lib/drink-logs/format";

export interface FeedItem {
  logId: string;
  loggedAt: string;
  drinkRating: number;
  caption: string | null;
  temperature: "hot" | "iced" | null;
  photoUrl: string | null;
  drinkId: string;
  drinkName: string;
  category: "coffee" | "tea";
  shopId: string;
  shopName: string;
  username: string | null;
  firstName: string | null;
  avatarUrl: string | null;
  likeCount: number;
  viewerHasLiked: boolean;
  viewerHasSaved: boolean;
}

interface FeedCardProps {
  item: FeedItem;
}

/**
 * Deliberately separate from LogCard: this represents someone else's
 * public post, not the owner's own log, so it carries an identity
 * header instead of Edit/Delete controls. The identity block links to
 * the person's public profile, not the whole card, that stays reserved
 * for the café link inside the shared body, so there's never a nested
 * or ambiguous click target.
 *
 * The body itself (media, drink/rating, café, caption, tags) is
 * LogCardBody, the exact same component LogCard uses, this card only
 * ever owns the identity header.
 */
export function FeedCard({ item }: FeedCardProps) {
  const displayName = item.firstName || item.username || "Someone";

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-border bg-white shadow-soft">
      <div className="flex items-center gap-2 px-3 py-2.5">
        {item.username ? (
          <Link href={`/users/${item.username}`} className="flex min-w-0 items-center gap-2 hover:opacity-80">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-latte/30">
              {item.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-3.5 w-3.5 text-espresso/40" />
              )}
            </div>
            <p className="truncate text-sm font-medium text-charcoal">
              {displayName}
              <span className="ml-1 font-normal text-charcoal/40">@{item.username}</span>
            </p>
          </Link>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-latte/30">
              {item.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-3.5 w-3.5 text-espresso/40" />
              )}
            </div>
            <p className="truncate text-sm font-medium text-charcoal">{displayName}</p>
          </div>
        )}
        <p className="ml-auto shrink-0 text-xs text-charcoal/40">{formatRelativeDate(item.loggedAt)}</p>
      </div>

      <LogCardBody
        data={{
          drinkName: item.drinkName,
          drinkRating: item.drinkRating,
          shopId: item.shopId,
          shopName: item.shopName,
          caption: item.caption,
          category: item.category,
          temperature: item.temperature,
          photoUrl: item.photoUrl,
        }}
      />

      <SocialActionRow
        logId={item.logId}
        shopId={item.shopId}
        drinkId={item.drinkId}
        initialLikeCount={item.likeCount}
        initialViewerHasLiked={item.viewerHasLiked}
        initialViewerHasSaved={item.viewerHasSaved}
      />
    </div>
  );
}
