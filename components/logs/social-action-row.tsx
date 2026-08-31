"use client";

import { useState } from "react";
import { Heart, Bookmark } from "lucide-react";

import { toggleLike, toggleSave } from "@/lib/social/actions";

interface SocialActionRowProps {
  logId: string;
  shopId: string;
  drinkId: string;
  initialLikeCount: number;
  initialViewerHasLiked: boolean;
  initialViewerHasSaved: boolean;
}

/**
 * The one shared action row for a public social post: Like on the
 * left (with count), Save on the right. Deliberately lives on FeedCard
 * only, never on LogCard/LogCardBody — these actions only make sense
 * on someone else's public post, not the owner's own private Passport
 * history, so this component is never rendered there.
 *
 * Genuinely optimistic: the icon/count flips immediately on tap, then
 * reconciles with the server's real response, and rolls back to the
 * prior state if the mutation fails. Database uniqueness (log_likes'
 * primary key, saves' partial unique indexes) is the final authority
 * either way — this is only ever a responsiveness layer on top of
 * that, never a source of truth itself.
 *
 * Save's identity is (shop, drink), not this specific post — see
 * lib/social/actions.ts — so toggling Save here reflects and affects
 * the same underlying "want to try" intent regardless of which post
 * the person is looking at when they save or unsave it.
 */
export function SocialActionRow({
  logId,
  shopId,
  drinkId,
  initialLikeCount,
  initialViewerHasLiked,
  initialViewerHasSaved,
}: SocialActionRowProps) {
  const [liked, setLiked] = useState(initialViewerHasLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [likePending, setLikePending] = useState(false);

  const [saved, setSaved] = useState(initialViewerHasSaved);
  const [savePending, setSavePending] = useState(false);

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
    <div className="flex min-w-0 items-center justify-between border-t border-border/60 px-3.5 py-2">
      <button
        type="button"
        onClick={handleLike}
        disabled={likePending}
        aria-pressed={liked}
        aria-label={liked ? "Unlike this coffee" : "Like this coffee"}
        className={`flex min-w-0 items-center gap-1.5 py-1 pr-2 text-xs font-medium transition-colors ${
          liked ? "text-espresso" : "text-charcoal/50 hover:text-espresso"
        }`}
      >
        <Heart className={`h-4 w-4 shrink-0 ${liked ? "fill-espresso" : ""}`} />
        {likeCount > 0 && <span className="shrink-0">{likeCount}</span>}
      </button>

      <button
        type="button"
        onClick={handleSave}
        disabled={savePending}
        aria-pressed={saved}
        aria-label={saved ? "Remove from Wishlist" : "Save this drink to Wishlist"}
        className={`flex shrink-0 items-center py-1 pl-2 transition-colors ${
          saved ? "text-espresso" : "text-charcoal/50 hover:text-espresso"
        }`}
      >
        <Bookmark className={`h-4 w-4 ${saved ? "fill-espresso" : ""}`} />
      </button>
    </div>
  );
}
