"use server";

import { createClient } from "@/lib/supabase/server";

export interface CommentItem {
  commentId: string;
  userId: string;
  username: string | null;
  firstName: string | null;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
  /** Always the ROOT top-level comment's id when this item is a reply,
   *  null when this item is itself top-level — one indentation level,
   *  never a chain of parents. */
  parentCommentId: string | null;
  /** Who was actually being replied to — may differ from the root
   *  comment's author if this is a reply to another reply within the
   *  same thread. Null for top-level comments. */
  replyToUserId: string | null;
  replyToUsername: string | null;
  replyToFirstName: string | null;
  likeCount: number;
  viewerHasLiked: boolean;
}

interface CommentRow {
  comment_id: string;
  user_id: string;
  username: string | null;
  first_name: string | null;
  avatar_url: string | null;
  body: string;
  created_at: string;
  parent_comment_id: string | null;
  reply_to_user_id: string | null;
  reply_to_username: string | null;
  reply_to_first_name: string | null;
  like_count: number;
  viewer_has_liked: boolean;
}

export interface CommentsPage {
  items: CommentItem[];
  /** created_at of the oldest TOP-LEVEL comment currently loaded, or
   *  null when there's nothing earlier to load. Deliberately never
   *  derived from a reply's own created_at — see get_log_comments in
   *  supabase/comment_replies_likes.sql: pagination is by top-level
   *  comment only, so a thread's replies always arrive on the same
   *  page as their parent, never split across a "load earlier" call. */
  nextCursor: string | null;
}

const PAGE_SIZE = 30;

function mapRow(r: CommentRow): CommentItem {
  return {
    commentId: r.comment_id,
    userId: r.user_id,
    username: r.username,
    firstName: r.first_name,
    avatarUrl: r.avatar_url,
    body: r.body,
    createdAt: r.created_at,
    parentCommentId: r.parent_comment_id,
    replyToUserId: r.reply_to_user_id,
    replyToUsername: r.reply_to_username,
    replyToFirstName: r.reply_to_first_name,
    likeCount: r.like_count,
    viewerHasLiked: r.viewer_has_liked,
  };
}

/**
 * One page of a log's comments — a bounded set of top-level comments
 * plus every one of their replies, already in a safe render order
 * (oldest first). The caller groups by parentCommentId to build the
 * one-level visual tree (see CommentSection) rather than relying on
 * array order for structure.
 */
export async function getLogComments(logId: string, cursor: string | null): Promise<CommentsPage> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_log_comments", {
    target_log_id: logId,
    before_created_at: cursor,
    page_size: PAGE_SIZE,
  });

  if (error) {
    console.error("get_log_comments failed:", error.message);
    throw new Error("Unable to load comments.");
  }

  const rows = (data ?? []) as CommentRow[];
  const items = rows.map(mapRow);

  const topLevelRows = rows.filter((r) => r.parent_comment_id === null);
  const hasMore = topLevelRows.length === PAGE_SIZE;
  const oldestTopLevelCreatedAt = topLevelRows.reduce<string | null>(
    (min, r) => (min === null || r.created_at < min ? r.created_at : min),
    null
  );

  return { items, nextCursor: hasMore ? oldestTopLevelCreatedAt : null };
}

export interface CreateCommentResult {
  commentId: string;
  createdAt: string;
  parentCommentId: string | null;
  replyToUserId: string | null;
  /** Authoritative total comments (top-level + replies) for the log
   *  after this insert — from the database, never derived from how
   *  many comments happen to be loaded locally. */
  commentCount: number;
}

/**
 * Auth, public-log eligibility, and the length limit are all enforced
 * inside create_comment itself. replyToCommentId is the ONE id the
 * client ever needs to send — whichever comment or reply the person
 * tapped Reply on — the server resolves both the thread's root and
 * the specific person being replied to from that single id.
 */
export async function createComment(
  logId: string,
  body: string,
  replyToCommentId: string | null = null
): Promise<CreateCommentResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_comment", {
    target_log_id: logId,
    body_text: body,
    reply_to_comment_id: replyToCommentId,
  });

  if (error) {
    console.error("create_comment failed:", error.message);
    throw new Error("Couldn't post your comment. Please try again.");
  }

  const rows = (data ?? []) as {
    comment_id: string;
    created_at: string;
    parent_comment_id: string | null;
    reply_to_user_id: string | null;
    comment_count: number;
  }[];
  const row = rows[0];
  if (!row) {
    console.error("create_comment returned no row");
    throw new Error("Couldn't post your comment. Please try again.");
  }

  return {
    commentId: row.comment_id,
    createdAt: row.created_at,
    parentCommentId: row.parent_comment_id,
    replyToUserId: row.reply_to_user_id,
    commentCount: row.comment_count,
  };
}

export interface DeleteCommentResult {
  /** How many rows this delete actually removed — the comment itself,
   *  plus every reply under it if it was a top-level comment. Never
   *  assume 1; a top-level comment's replies may not all be loaded
   *  locally when it's deleted. */
  deletedCount: number;
  /** Authoritative total comments remaining for the log afterward. */
  commentCount: number;
}

/** Auth and the "author or post owner" check both happen inside
 *  delete_comment itself — never trust the client's own judgment about
 *  whether it's allowed to delete a given comment. Deleting a
 *  top-level comment cascades to its replies (the FK is ON DELETE
 *  CASCADE) — a deliberate V1 simplicity choice over a soft "comment
 *  deleted" placeholder: replies to a removed comment lose their
 *  context, so removing them together avoids orphaned, confusing
 *  fragments. Deleting a reply only removes that reply. */
export async function deleteComment(commentId: string): Promise<DeleteCommentResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_comment", { target_comment_id: commentId });

  if (error) {
    console.error("delete_comment failed:", error.message);
    throw new Error("Couldn't delete that comment. Please try again.");
  }

  const rows = (data ?? []) as { deleted_count: number; comment_count: number }[];
  const row = rows[0];
  if (!row) {
    console.error("delete_comment returned no row");
    throw new Error("Couldn't delete that comment. Please try again.");
  }

  return { deletedCount: row.deleted_count, commentCount: row.comment_count };
}

export interface ToggleCommentLikeResult {
  liked: boolean;
  likeCount: number;
}

/** Same toggle pattern as post likes (lib/social/actions.ts): auth and
 *  public-log eligibility enforced inside toggle_comment_like itself. */
export async function toggleCommentLike(commentId: string): Promise<ToggleCommentLikeResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_comment_like", { target_comment_id: commentId });

  if (error) {
    console.error("toggle_comment_like failed:", error.message);
    throw new Error("Couldn't update your like. Please try again.");
  }

  const rows = (data ?? []) as { liked: boolean; like_count: number }[];
  const row = rows[0];
  if (!row) {
    console.error("toggle_comment_like returned no row");
    throw new Error("Couldn't update your like. Please try again.");
  }

  return { liked: row.liked, likeCount: row.like_count };
}
