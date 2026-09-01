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
  shopCity: string | null;
  shopState: string | null;
  ownerUserId: string;
  username: string | null;
  firstName: string | null;
  avatarUrl: string | null;
  likeCount: number;
  viewerHasLiked: boolean;
  viewerHasSaved: boolean;
  commentCount: number;
}

interface FeedCardProps {
  item: FeedItem;
  currentUserId: string;
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
 *
 * RESPONSIVE CARD TREATMENT: below `sm`, this renders with no border,
 * no radius, no shadow, no background of its own — just padding. Post
 * separation on mobile comes entirely from the parent list's own
 * `divide-y` (see FeedColumns/ProfileActivityGrid), a continuous
 * stream rather than a stack of boxed cards floating on the page
 * background. From `sm` up, where posts sit side-by-side in a
 * multi/near-multi-column layout, the traditional bordered white card
 * returns, because neighboring columns genuinely need that visual
 * separation a plain divider can't provide across columns. One
 * component, two responsive presentations, not a fork.
 *
 * HEADER: two lines — name + relative time up top, then @username +
 * café LOCATION (city, state — already persisted on the shop record,
 * never a Google call) beneath. Café NAME is deliberately not
 * repeated here: it's the first, prominent line of the details block
 * right below the photo, showing it again in the header just to
 * establish "where" was redundant when location does that job without
 * duplicating the one piece of info the details block already owns.
 * Falls back gracefully: city-only when state is missing, no location
 * segment at all when neither is stored — never a placeholder like
 * "Unknown" or "Location unavailable".
 */
function formatShopLocation(city: string | null, state: string | null): string | null {
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  return null;
}

export function FeedCard({ item, currentUserId }: FeedCardProps) {
  const displayName = item.firstName || item.username || "Someone";
  const location = formatShopLocation(item.shopCity, item.shopState);
  const metaParts = [item.username ? `@${item.username}` : null, location].filter(
    (part): part is string => !!part
  );

  const headerContent = (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-latte/30">
        {item.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <User className="h-4 w-4 text-espresso/40" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-charcoal">{displayName}</p>
          <span className="shrink-0 whitespace-nowrap text-xs text-charcoal/40">
            {formatRelativeDate(item.loggedAt)}
          </span>
        </div>
        {metaParts.length > 0 && (
          <p className="truncate text-xs text-charcoal/50">{metaParts.join(" · ")}</p>
        )}
      </div>
    </>
  );

  return (
    <div className="w-full min-w-0 py-3 sm:overflow-hidden sm:rounded-xl sm:border sm:border-border sm:bg-white sm:py-0 sm:shadow-soft">
      {item.username ? (
        <Link
          href={`/users/${item.username}`}
          className="flex min-w-0 items-start gap-2.5 px-4 pb-3 hover:opacity-80 sm:pt-4"
        >
          {headerContent}
        </Link>
      ) : (
        <div className="flex min-w-0 items-start gap-2.5 px-4 pb-3 sm:pt-4">{headerContent}</div>
      )}

      <LogCardBody
        compactRatingOnMobile
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
        shopName={item.shopName}
        drinkName={item.drinkName}
        ownerUserId={item.ownerUserId}
        currentUserId={currentUserId}
        initialLikeCount={item.likeCount}
        initialViewerHasLiked={item.viewerHasLiked}
        initialViewerHasSaved={item.viewerHasSaved}
        initialCommentCount={item.commentCount}
      />
    </div>
  );
}
