"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart, Send, Trash2, User, X } from "lucide-react";

import {
  getLogComments,
  createComment,
  deleteComment,
  toggleCommentLike,
  type CommentItem,
} from "@/lib/social/comments-actions";
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
  /** Called with the server's authoritative total comment count after
   *  a create or delete actually happens — never on load, since a
   *  loaded page's length is never guaranteed to equal the post's
   *  true total (get_log_comments paginates by top-level thread). */
  onCountChange?: (count: number) => void;
}

interface ReplyTarget {
  commentId: string;
  displayName: string;
  username: string | null;
}

/**
 * The list + input, with no open/close chrome of its own — CommentSheet
 * wraps this for the Discover/profile feed context, and /logs/[id]
 * renders it directly inline. One implementation, two presentations,
 * not a fork.
 *
 * One indentation level, not a general thread viewer: every comment is
 * either top-level or a reply (grouped here by parentCommentId, which
 * the server always resolves to the thread's ROOT — see create_comment
 * in comment_replies_likes.sql), rendered as root-then-its-replies,
 * never nested further.
 *
 * Fetches its own first page on mount rather than being preloaded with
 * the feed: feed rows only ever carry a comment_count, never the
 * actual comment list, so opening a post's comments is the one moment
 * an extra request happens, once, for exactly the post being opened.
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
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const loadInitial = useCallback(async () => {
    setLoadError(false);
    try {
      const page = await getLogComments(logId, null);
      setComments(page.items);
      setCursor(page.nextCursor);
      setHasMore(page.nextCursor !== null);
      // Deliberately no onCountChange here: loading is not a mutation.
      // get_log_comments is paginated by top-level thread, so
      // page.items.length (only the loaded roots + their replies) is
      // never guaranteed to equal the post's true total comment
      // count — the feed/profile RPC's own count remains authoritative
      // until an actual create/delete happens below.
    } catch {
      setLoadError(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logId]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // One-level grouping: top-level comments (sorted oldest-first),
  // each with its own replies (also sorted oldest-first) attached.
  const { roots, repliesByRoot } = useMemo(() => {
    const all = comments ?? [];
    const rootItems = all.filter((c) => !c.parentCommentId).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    const byRoot = new Map<string, CommentItem[]>();
    for (const c of all) {
      if (!c.parentCommentId) continue;
      const arr = byRoot.get(c.parentCommentId) ?? [];
      arr.push(c);
      byRoot.set(c.parentCommentId, arr);
    }
    byRoot.forEach((arr) => arr.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)));
    return { roots: rootItems, repliesByRoot: byRoot };
  }, [comments]);

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

  function handleReplyTap(c: CommentItem) {
    setReplyTarget({
      commentId: c.commentId,
      displayName: c.firstName || c.username || "Someone",
      username: c.username,
    });
    inputRef.current?.focus();
  }

  function clearReply() {
    setReplyTarget(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || posting) return;

    setPosting(true);
    setPostError(null);
    const activeReplyTarget = replyTarget;
    try {
      const result = await createComment(logId, trimmed, activeReplyTarget?.commentId ?? null);
      setComments((prev) => [
        ...(prev ?? []),
        {
          commentId: result.commentId,
          userId: currentUserId,
          username: null,
          firstName: "You",
          avatarUrl: null,
          body: trimmed,
          createdAt: result.createdAt,
          parentCommentId: result.parentCommentId,
          replyToUserId: result.replyToUserId,
          replyToUsername: activeReplyTarget?.username ?? null,
          replyToFirstName: activeReplyTarget?.displayName ?? null,
          likeCount: 0,
          viewerHasLiked: false,
        },
      ]);
      // Authoritative: the database's own total after this insert, not
      // the locally-loaded array's length (which only ever reflects
      // whatever page(s) have been fetched so far). Applies identically
      // to a top-level comment and a reply.
      onCountChange?.(result.commentCount);
      setDraft("");
      setReplyTarget(null);
    } catch {
      setPostError("Couldn't post your comment. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(commentId: string) {
    const prev = comments;
    setComments((c) => (c ?? []).filter((item) => item.commentId !== commentId && item.parentCommentId !== commentId));
    try {
      const result = await deleteComment(commentId);
      // Authoritative: the database's own remaining total, which
      // correctly accounts for cascade-deleted replies even when not
      // all of them were currently loaded locally.
      onCountChange?.(result.commentCount);
    } catch {
      setComments(prev);
    }
  }

  async function handleToggleLike(commentId: string) {
    const target = (comments ?? []).find((c) => c.commentId === commentId);
    if (!target) return;
    const prevLiked = target.viewerHasLiked;
    const prevCount = target.likeCount;

    setComments((prev) =>
      (prev ?? []).map((c) =>
        c.commentId === commentId
          ? { ...c, viewerHasLiked: !prevLiked, likeCount: prevLiked ? prevCount - 1 : prevCount + 1 }
          : c
      )
    );

    try {
      const result = await toggleCommentLike(commentId);
      setComments((prev) =>
        (prev ?? []).map((c) =>
          c.commentId === commentId ? { ...c, viewerHasLiked: result.liked, likeCount: result.likeCount } : c
        )
      );
    } catch {
      setComments((prev) =>
        (prev ?? []).map((c) =>
          c.commentId === commentId ? { ...c, viewerHasLiked: prevLiked, likeCount: prevCount } : c
        )
      );
    }
  }

  function renderComment(c: CommentItem, isReply: boolean) {
    const canDelete = c.userId === currentUserId || currentUserId === ownerUserId;
    const displayName = c.firstName || c.username || "Someone";
    const replyToName = c.replyToFirstName || c.replyToUsername;

    return (
      <div key={c.commentId} className={`flex min-w-0 items-start gap-2 ${isReply ? "mt-3 pl-8" : ""}`}>
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-latte/30 ${
            isReply ? "h-6 w-6" : "h-7 w-7"
          }`}
        >
          {c.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className={isReply ? "h-3 w-3 text-espresso/40" : "h-3.5 w-3.5 text-espresso/40"} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate text-sm font-medium text-charcoal">{displayName}</span>
            <span className="shrink-0 whitespace-nowrap text-[11px] text-charcoal/40">
              {formatRelativeDate(c.createdAt)}
            </span>
          </p>
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-charcoal/80">
            {isReply && replyToName && (
              <span className="font-medium text-espresso/70">@{replyToName} </span>
            )}
            {c.body}
          </p>
          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleReplyTap(c)}
              className="text-xs font-medium text-charcoal/40 hover:text-espresso"
            >
              Reply
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDelete(c.commentId)}
                aria-label="Delete comment"
                className="flex items-center gap-1 text-xs font-medium text-charcoal/40 hover:text-error"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleToggleLike(c.commentId)}
          aria-pressed={c.viewerHasLiked}
          aria-label={c.viewerHasLiked ? "Unlike this comment" : "Like this comment"}
          className={`flex shrink-0 flex-col items-center gap-0.5 pt-0.5 transition-colors ${
            c.viewerHasLiked ? "text-espresso" : "text-charcoal/30 hover:text-espresso"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${c.viewerHasLiked ? "fill-espresso" : ""}`} />
          {c.likeCount > 0 && <span className="text-[10px] tabular-nums">{c.likeCount}</span>}
        </button>
      </div>
    );
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
          {roots.map((root) => (
            <div key={root.commentId}>
              {renderComment(root, false)}
              {(repliesByRoot.get(root.commentId) ?? []).map((reply) => renderComment(reply, true))}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-border/60 px-4 py-3">
        {replyTarget && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-crema/70 px-3 py-1.5">
            <p className="min-w-0 truncate text-xs text-charcoal/60">
              Replying to <span className="font-medium text-espresso">@{replyTarget.username ?? replyTarget.displayName}</span>
            </p>
            <button
              type="button"
              onClick={clearReply}
              aria-label="Cancel reply"
              className="shrink-0 rounded-full p-0.5 text-charcoal/40 hover:text-charcoal"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {postError && <p className="mb-2 text-xs text-error">{postError}</p>}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
            placeholder={replyTarget ? `Reply to ${replyTarget.displayName}...` : "Add a comment..."}
            disabled={posting}
            className="min-w-0 flex-1 rounded-full border border-border bg-white px-4 py-2 text-base text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-espresso/20 sm:text-sm"
            aria-label={replyTarget ? `Reply to ${replyTarget.displayName}` : "Add a comment"}
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
