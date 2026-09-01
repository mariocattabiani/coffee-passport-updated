"use client";

import { useState } from "react";
import { Heart, Bookmark, MessageCircle } from "lucide-react";

import { toggleLike, toggleSave } from "@/lib/social/actions";
import { CommentSheet } from "@/components/social/comment-sheet";

interface SocialActionRowProps {
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
 * The one shared action row for a public social post: Like + Comment
 * on the left, Save on the right. Deliberately lives on FeedCard only,
 * never on LogCard/LogCardBody — these actions only make sense on a
 * public post, not the owner's own private Passport history, so this
 * component is never rendered there.
 *
 * Like and Save are genuinely optimistic (flip immediately, reconcile
 * with the server, roll back on failure). Comment is not optimistic in
 * the same way — tapping it opens CommentSheet, an overlay with its
 * own loading state, rather than instantly showing fabricated comment
 * content; the count itself still updates live as CommentSheet reports
 * back via onCountChange once real data loads or a comment is posted.
 */
export function SocialActionRow({
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
}: SocialActionRowProps) {
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
    <>
      <div className="flex min-w-0 items-center justify-between px-4 py-2.5 sm:border-t sm:border-border/60">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={handleLike}
            disabled={likePending}
            aria-pressed={liked}
            aria-label={liked ? "Unlike this coffee" : "Like this coffee"}
            className={`flex min-w-0 items-center gap-1.5 py-1 text-sm font-medium transition-colors ${
              liked ? "text-espresso" : "text-charcoal/50 hover:text-espresso"
            }`}
          >
            <Heart className={`h-5 w-5 shrink-0 ${liked ? "fill-espresso" : ""}`} />
            {likeCount > 0 && <span className="shrink-0 tabular-nums">{likeCount}</span>}
          </button>

          {commentsHref ? (
            <a
              href={commentsHref}
              aria-label="Jump to comments"
              className="flex min-w-0 items-center gap-1.5 py-1 text-sm font-medium text-charcoal/50 transition-colors hover:text-espresso"
            >
              <MessageCircle className="h-5 w-5 shrink-0" />
              {commentCount > 0 && <span className="shrink-0 tabular-nums">{commentCount}</span>}
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setCommentsOpen(true)}
              aria-label="View comments"
              className="flex min-w-0 items-center gap-1.5 py-1 text-sm font-medium text-charcoal/50 transition-colors hover:text-espresso"
            >
              <MessageCircle className="h-5 w-5 shrink-0" />
              {commentCount > 0 && <span className="shrink-0 tabular-nums">{commentCount}</span>}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={savePending}
          aria-pressed={saved}
          aria-label={saved ? "Remove from Wishlist" : "Save this drink to Wishlist"}
          className={`flex shrink-0 items-center py-1 transition-colors ${
            saved ? "text-espresso" : "text-charcoal/50 hover:text-espresso"
          }`}
        >
          <Bookmark className={`h-5 w-5 ${saved ? "fill-espresso" : ""}`} />
        </button>
      </div>

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
    </>
  );
}
