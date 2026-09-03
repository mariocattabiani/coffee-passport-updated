import Link from "next/link";
import { MapPin } from "lucide-react";

import { StarDisplay } from "@/components/logs/star-display";
import { LogCardMedia } from "@/components/logs/log-card-media";
import { CollapsibleCaption } from "@/components/logs/collapsible-caption";
import { SocialActions } from "@/components/logs/social-actions";

export interface LogCardBodyData {
  drinkName: string;
  drinkRating: number;
  shopId: string;
  shopName: string;
  caption: string | null;
  category: "coffee" | "tea";
  temperature: "hot" | "iced" | null;
  photoUrl: string | null;
  photoPositionX?: number | null;
  photoPositionY?: number | null;
}

export interface LogCardBodySocialActionsData {
  logId: string;
  drinkId: string;
  ownerUserId: string;
  currentUserId: string;
  initialLikeCount: number;
  initialViewerHasLiked: boolean;
  initialViewerHasSaved: boolean;
  initialCommentCount: number;
  commentsHref?: string;
}

interface LogCardBodyProps {
  data: LogCardBodyData;
  /** Compact `★ 4.5` below `sm`, full 5-star row from `sm` up. Neutral
   *  default (off): LogCardBody itself makes no assumption about
   *  which surface is rendering it, since it's shared by both the
   *  public social feed (FeedCard) and the owner's own private
   *  Passport Coffee Trail (LogCard) — two different products with
   *  different needs, not one feed with two entry points. Callers
   *  that actually want the fast-scan social treatment (FeedCard) opt
   *  in explicitly; Passport's own LogCard deliberately does not, and
   *  keeps its pre-existing full-star presentation unchanged. */
  compactRatingOnMobile?: boolean;
  /** When provided, the final row merges Like/Comment/Save into the
   *  same row as the category/temperature tags — beverage metadata on
   *  the left, actions on the right — instead of a separate dedicated
   *  row below. Omit entirely for private/owner contexts (LogCard):
   *  LogCardBody never adds social controls on its own, only when a
   *  caller explicitly opts in by supplying this. */
  socialActions?: LogCardBodySocialActionsData;
}

/**
 * The one shared social-log presentation used by both Discover/public
 * profiles (FeedCard) and the owner's own logs (LogCard). This is
 * deliberately just the body: media, drink+rating, café, caption,
 * coffee/tea + hot/iced tags (and, on social surfaces, actions merged
 * into that same final row). Identity headers and owner Edit/Delete
 * controls stay in the two thin wrapper components, since those are
 * the one meaningfully different piece between "someone else's public
 * post" and "my own log", everything else about how a coffee log
 * looks is now a single implementation, not two drifting copies.
 *
 * One consistent px-4 horizontal rhythm throughout (header, this body,
 * the merged final row all agree).
 *
 * Final row: metadata (category/temperature) takes min-w-0 on the
 * left so it can never force the row wider; SocialActions is
 * shrink-0 on the right so actions are never the thing that gets
 * squeezed — a long café/drink name up above can truncate, the tags
 * here are short controlled vocabulary anyway, but the row is built
 * defensively regardless.
 */
export function LogCardBody({ data, compactRatingOnMobile = false, socialActions }: LogCardBodyProps) {
  return (
    <>
      <LogCardMedia
        photoUrl={data.photoUrl}
        alt={`${data.drinkName} at ${data.shopName}`}
        positionX={data.photoPositionX}
        positionY={data.photoPositionY}
      />

      <div className="min-w-0 px-4 py-3">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-charcoal">{data.drinkName}</p>
            <Link
              href={`/shops/${data.shopId}`}
              className="flex min-w-0 items-center gap-1 text-xs text-charcoal/50 hover:text-espresso hover:underline"
            >
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{data.shopName}</span>
            </Link>
          </div>
          <div className="shrink-0">
            <StarDisplay
              rating={data.drinkRating}
              size="h-3 w-3"
              showValue
              compactOnMobile={compactRatingOnMobile}
            />
          </div>
        </div>

        {data.caption && <CollapsibleCaption text={data.caption} />}

        <div className="mt-2 flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-xs text-charcoal/40">
            <span className="capitalize">{data.category}</span>
            {data.temperature && (
              <>
                <span aria-hidden="true">•</span>
                <span className="capitalize">{data.temperature}</span>
              </>
            )}
          </div>

          {socialActions && (
            <SocialActions
              logId={socialActions.logId}
              shopId={data.shopId}
              drinkId={socialActions.drinkId}
              shopName={data.shopName}
              drinkName={data.drinkName}
              ownerUserId={socialActions.ownerUserId}
              currentUserId={socialActions.currentUserId}
              initialLikeCount={socialActions.initialLikeCount}
              initialViewerHasLiked={socialActions.initialViewerHasLiked}
              initialViewerHasSaved={socialActions.initialViewerHasSaved}
              initialCommentCount={socialActions.initialCommentCount}
              commentsHref={socialActions.commentsHref}
            />
          )}
        </div>
      </div>
    </>
  );
}
