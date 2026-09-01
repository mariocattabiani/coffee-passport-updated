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
}

interface CommentRow {
  comment_id: string;
  user_id: string;
  username: string | null;
  first_name: string | null;
  avatar_url: string | null;
  body: string;
  created_at: string;
}

export interface CommentsPage {
  items: CommentItem[];
  /** created_at of the oldest comment currently loaded, or null when
   *  there's nothing earlier to load. */
  nextCursor: string | null;
}

const PAGE_SIZE = 30;

/**
 * One page of a log's comments. get_log_comments returns the most
 * recent page (created_at DESC); this reverses it into the display
 * order a comment thread actually reads in (oldest at top, newest at
 * the bottom near the input) — see get_log_comments in
 * supabase/log_comments.sql for why that direction is deliberate.
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
  const items: CommentItem[] = rows
    .map((r) => ({
      commentId: r.comment_id,
      userId: r.user_id,
      username: r.username,
      firstName: r.first_name,
      avatarUrl: r.avatar_url,
      body: r.body,
      createdAt: r.created_at,
    }))
    .reverse();

  const nextCursor = rows.length === PAGE_SIZE ? rows[rows.length - 1].created_at : null;

  return { items, nextCursor };
}

export interface CreateCommentResult {
  commentId: string;
  createdAt: string;
}

/**
 * Auth, public-log eligibility, and the length limit are all enforced
 * inside create_comment itself — this function only shapes the result
 * and turns a real RPC failure into a sanitized error, it never
 * re-validates anything the database already owns.
 */
export async function createComment(logId: string, body: string): Promise<CreateCommentResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_comment", { target_log_id: logId, body_text: body });

  if (error) {
    console.error("create_comment failed:", error.message);
    throw new Error("Couldn't post your comment. Please try again.");
  }

  const rows = (data ?? []) as { comment_id: string; created_at: string }[];
  const row = rows[0];
  if (!row) {
    console.error("create_comment returned no row");
    throw new Error("Couldn't post your comment. Please try again.");
  }

  return { commentId: row.comment_id, createdAt: row.created_at };
}

/** Auth and the "author or post owner" check both happen inside
 *  delete_comment/its RLS policy — never trust the client's own
 *  judgment about whether it's allowed to delete a given comment. */
export async function deleteComment(commentId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_comment", { target_comment_id: commentId });

  if (error) {
    console.error("delete_comment failed:", error.message);
    throw new Error("Couldn't delete that comment. Please try again.");
  }
}
