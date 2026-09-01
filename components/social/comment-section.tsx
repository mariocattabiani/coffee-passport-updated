"use client";

import { useCallback, useEffect, useState } from "react";
import { Send, Trash2, User } from "lucide-react";

import { getLogComments, createComment, deleteComment, type CommentItem } from "@/lib/social/comments-actions";
import { formatRelativeDate } from "@/lib/drink-logs/format";

const MAX_COMMENT_LENGTH = 500;

interface CommentSectionProps {
  logId: string;
  currentUserId: string;
  /** The log owner's id, so their own comments-moderation right (any
   *  comment on their own post, not just their own) can be shown —
   *  purely a UI decision, delete_comment enforces the real rule
   *  server-side regardless of what this component shows or hides. */
  ownerUserId: string;
  onCountChange?: (count: number) => void;
}

/**
 * The list + input, with no open/close chrome of its own — CommentSheet
 * wraps this for the Discover/profile feed context, and /logs/[id]
 * renders it directly inline. One implementation, two presentations,
 * not a fork.
 *
 * Fetches its own first page on mount rather than being preloaded with
 * the feed: feed rows only ever carry a comment_count (see
 * social_feed_v3.sql), never the actual comment list, so opening a
 * post's comments is the one moment an extra request happens, and it
 * happens once, for exactly the post being opened, never for every
 * card in a feed.
 */
export function CommentSection({ logId, currentUserId, ownerUserId, onCountChange }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    setLoadError(false);
    try {
      const page = await getLogComments(logId, null);
      setComments(page.items);
      setCursor(page.nextCursor);
      setHasMore(page.nextCursor !== null);
      onCountChange?.(page.items.length);
    } catch {
      setLoadError(true);
    }
    // onCountChange is expected to be referentially stable enough for
    // this one-time-per-log load; re-running this on every parent
    // render would refetch comments unnecessarily.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logId]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  async function handleLoadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getLogComments(logId, cursor);
      setComments((prev) => [...page.items, ...(prev ?? [])]);
      setCursor(page.nextCursor);
      setHasMore(page.nextCursor !== null);
    } catch {
      // Leave the already-loaded comments visible; just stop offering
      // "load earlier" for this attempt rather than replacing a
      // working list with an error.
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || posting) return;

    setPosting(true);
    setPostError(null);
    try {
      const result = await createComment(logId, trimmed);
      setComments((prev) => {
        const next = [
          ...(prev ?? []),
          {
            commentId: result.commentId,
            userId: currentUserId,
            username: null,
            firstName: "You",
            avatarUrl: null,
            body: trimmed,
            createdAt: result.createdAt,
          },
        ];
        onCountChange?.(next.length);
        return next;
      });
      setDraft("");
    } catch {
      setPostError("Couldn't post your comment. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(commentId: string) {
    const prev = comments;
    setComments((c) => {
      const next = (c ?? []).filter((item) => item.commentId !== commentId);
      onCountChange?.(next.length);
      return next;
    });
    try {
      await deleteComment(commentId);
    } catch {
      setComments(prev);
      onCountChange?.(prev?.length ?? 0);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {hasMore && (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="mb-3 w-full text-center text-xs font-medium text-charcoal/50 hover:text-espresso"
          >
            {loadingMore ? "Loading..." : "Load earlier comments"}
          </button>
        )}

        {loadError && (
          <p className="py-6 text-center text-sm text-charcoal/50">
            Couldn&apos;t load comments. Please try again.
          </p>
        )}

        {!loadError && comments === null && (
          <p className="py-6 text-center text-sm text-charcoal/40">Loading comments...</p>
        )}

        {!loadError && comments !== null && comments.length === 0 && (
          <p className="py-6 text-center text-sm text-charcoal/40">No comments yet. Say something!</p>
        )}

        <div className="space-y-4">
          {(comments ?? []).map((c) => {
            const canDelete = c.userId === currentUserId || currentUserId === ownerUserId;
            const displayName = c.firstName || c.username || "Someone";
            return (
              <div key={c.commentId} className="flex min-w-0 items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-latte/30">
                  {c.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-espresso/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-baseline gap-1.5">
                    <span className="truncate text-sm font-medium text-charcoal">{displayName}</span>
                    <span className="shrink-0 whitespace-nowrap text-[11px] text-charcoal/40">
                      {formatRelativeDate(c.createdAt)}
                    </span>
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-charcoal/80">{c.body}</p>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(c.commentId)}
                    aria-label="Delete comment"
                    className="shrink-0 rounded-full p-1 text-charcoal/30 hover:bg-crema hover:text-error"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-border/60 px-4 py-3">
        {postError && <p className="mb-2 text-xs text-error">{postError}</p>}
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
            placeholder="Add a comment..."
            disabled={posting}
            className="min-w-0 flex-1 rounded-full border border-border bg-white px-4 py-2 text-sm text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-espresso/20"
            aria-label="Add a comment"
          />
          <button
            type="submit"
            disabled={posting || draft.trim().length === 0}
            aria-label="Send comment"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-espresso text-crema disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
