"use server";

import { createClient } from "@/lib/supabase/server";

export interface PublicLogDetail {
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
  ownerUserId: string;
  username: string | null;
  firstName: string | null;
  avatarUrl: string | null;
  likeCount: number;
  viewerHasLiked: boolean;
  viewerHasSaved: boolean;
  commentCount: number;
}

interface PublicLogRow {
  log_id: string;
  logged_at: string;
  drink_rating: number;
  caption: string | null;
  temperature: "hot" | "iced" | null;
  photo_path: string | null;
  drink_id: string;
  drink_name: string;
  category: "coffee" | "tea";
  shop_id: string;
  shop_name: string;
  owner_user_id: string;
  username: string | null;
  first_name: string | null;
  avatar_url: string | null;
  like_count: number;
  viewer_has_liked: boolean;
  viewer_has_saved: boolean;
  comment_count: number;
}

const SIGNED_URL_TTL_SECONDS = 5 * 60;

/**
 * Returns null both when the log doesn't exist and when it exists but
 * isn't public — get_public_log itself returns an empty result set in
 * both cases, with no signal to tell them apart (see the SQL comment
 * in social_feed_v3.sql). The page calling this must turn a null into
 * a plain notFound(), never a "this post is private" message, which
 * would itself confirm the log's existence to someone who has no
 * business knowing that.
 */
export async function getPublicLog(logId: string): Promise<PublicLogDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_log", { target_log_id: logId });

  if (error) {
    console.error("get_public_log failed:", error.message);
    throw new Error("Unable to load this post.");
  }

  const rows = (data ?? []) as PublicLogRow[];
  const row = rows[0];
  if (!row) return null;

  let photoUrl: string | null = null;
  if (row.photo_path) {
    const { data: signed } = await supabase.storage
      .from("drink-photos")
      .createSignedUrl(row.photo_path, SIGNED_URL_TTL_SECONDS);
    photoUrl = signed?.signedUrl ?? null;
  }

  return {
    logId: row.log_id,
    loggedAt: row.logged_at,
    drinkRating: row.drink_rating,
    caption: row.caption,
    temperature: row.temperature,
    photoUrl,
    drinkId: row.drink_id,
    drinkName: row.drink_name,
    category: row.category,
    shopId: row.shop_id,
    shopName: row.shop_name,
    ownerUserId: row.owner_user_id,
    username: row.username,
    firstName: row.first_name,
    avatarUrl: row.avatar_url,
    likeCount: row.like_count,
    viewerHasLiked: row.viewer_has_liked,
    viewerHasSaved: row.viewer_has_saved,
    commentCount: row.comment_count,
  };
}
