"use client";

import { useState } from "react";
import { Heart, Bookmark, MessageCircle } from "lucide-react";

import { toggleLike, toggleSave } from "@/lib/social/actions";
import { CommentSheet } from "@/components/social/comment-sheet";

interface SocialActionsProps {
  logId: string;
  shopId: string;
  drinkId: string;
  shopName: string;
  drinkName: string;
  ownerUserId: string;
  currentUserId: string;
  initialLikeCount: number;
  initialViewerHasLiked: boolean;
  initialViewerHasSaved: boolean;
  initialCommentCount: number;
  /** When set, the comment button becomes a plain anchor link to this
   *  href instead of opening CommentSheet — used on /logs/[id], where
   *  the full comment thread already renders inline on the same page,
   *  so opening a second overlay on top of it would just be
   *  redundant. Omit (the default, used by FeedCard) to open the
   *  sheet as normal. */
  commentsHref?: string;
}

/**
 * Just the action cluster — Like, Comment, Save, in that order, one
 * consistent gap, no outer row/border/padding of its own. Previously
 * (SocialActionRow) this component owned a full-width row with its
 * own internal justify-between splitting Like+Comment from Save; now
 * that the product direction merges social actions into the same
 * final row as the beverage metadata (see LogCardBody's
 * `socialActions` prop), the LEFT/RIGHT split happens one level up,
 * in that merged row, not inside this component. This is presentation
 * restructuring only — every behavior below is unchanged from
 * SocialActionRow: optimistic Like/Save, CommentSheet, aria-pressed/
 * aria-label, notifications, server reconciliation.
 *
 * Deliberately lives on FeedCard (via LogCardBody's socialActions
 * prop) only, never on LogCard/the owner's private Passport history —
 * LogCardBody never renders this on its own, only when a caller
 * explicitly supplies the socialActions prop.
 *
 * TOUCH TARGETS: each control's icon stays small (h-4 w-4) to keep the
 * compact visual footprint the merged row is for, but each button/link
 * uses py-3 (12px top+bottom) paired with an equal -my-3 to cancel it
 * back out. Padding is part of an element's own hit-testable box, so
 * py-3 genuinely gives ~40px of real tappable height; the matching
 * negative margin only affects how much cross-axis space that box
 * contributes to the flex row's height (per the flexbox spec, a flex
 * item's margin box — not just its padding box — is what's used to
 * size the line), so the row's rendered height doesn't grow even
 * though each control's actual tap area does. A small px-1.5 adds a
 * bit of horizontal breathing room the same way, uncompensated since
 * a few extra px of row width is fine at 320px and not worth
 * complicating with horizontal margin math too.
 */
export function SocialActions({
  logId,
  shopId,
  drinkId,
  shopName,
  drinkName,
  ownerUserId,
  currentUserId,
  initialLikeCount,
  initialViewerHasLiked,
  initialViewerHasSaved,
  initialCommentCount,
  commentsHref,
}: SocialActionsProps) {
  const [liked, setLiked] = useState(initialViewerHasLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [likePending, setLikePending] = useState(false);

  const [saved, setSaved] = useState(initialViewerHasSaved);
  const [savePending, setSavePending] = useState(false);

  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [commentsOpen, setCommentsOpen] = useState(false);

  async function handleLike() {
    if (likePending) return;
    const prevLiked = liked;
    const prevCount = likeCount;

    setLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
    setLikePending(true);

    try {
      const result = await toggleLike(logId);
      setLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setLikePending(false);
    }
  }

  async function handleSave() {
    if (savePending) return;
    const prevSaved = saved;

    setSaved(!prevSaved);
    setSavePending(true);

    try {
      const result = await toggleSave(shopId, drinkId, logId);
      setSaved(result.saved);
    } catch {
      setSaved(prevSaved);
    } finally {
      setSavePending(false);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={handleLike}
        disabled={likePending}
        aria-pressed={liked}
        aria-label={liked ? "Unlike this coffee" : "Like this coffee"}
        className={`flex shrink-0 items-center gap-1 px-1.5 py-3 -my-3 text-xs font-medium transition-colors ${
          liked ? "text-espresso" : "text-charcoal/50 hover:text-espresso"
        }`}
      >
        <Heart className={`h-4 w-4 shrink-0 ${liked ? "fill-espresso" : ""}`} />
        {likeCount > 0 && <span className="shrink-0 tabular-nums">{likeCount}</span>}
      </button>

      {commentsHref ? (
        <a
          href={commentsHref}
          aria-label="Jump to comments"
          className="flex shrink-0 items-center gap-1 px-1.5 py-3 -my-3 text-xs font-medium text-charcoal/50 transition-colors hover:text-espresso"
        >
          <MessageCircle className="h-4 w-4 shrink-0" />
          {commentCount > 0 && <span className="shrink-0 tabular-nums">{commentCount}</span>}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => setCommentsOpen(true)}
          aria-label="View comments"
          className="flex shrink-0 items-center gap-1 px-1.5 py-3 -my-3 text-xs font-medium text-charcoal/50 transition-colors hover:text-espresso"
        >
          <MessageCircle className="h-4 w-4 shrink-0" />
          {commentCount > 0 && <span className="shrink-0 tabular-nums">{commentCount}</span>}
        </button>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={savePending}
        aria-pressed={saved}
        aria-label={saved ? "Remove from Wishlist" : "Save this drink to Wishlist"}
        className={`flex shrink-0 items-center px-1.5 py-3 -my-3 transition-colors ${
          saved ? "text-espresso" : "text-charcoal/50 hover:text-espresso"
        }`}
      >
        <Bookmark className={`h-4 w-4 ${saved ? "fill-espresso" : ""}`} />
      </button>

      {commentsOpen && !commentsHref && (
        <CommentSheet
          logId={logId}
          currentUserId={currentUserId}
          ownerUserId={ownerUserId}
          drinkName={drinkName}
          shopName={shopName}
          onClose={() => setCommentsOpen(false)}
          onCountChange={setCommentCount}
        />
      )}
    </div>
  );
}
