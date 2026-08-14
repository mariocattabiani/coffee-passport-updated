"use server";

import { createClient } from "@/lib/supabase/server";
import type { FeedItem } from "@/components/discover/feed-card";

const PAGE_SIZE = 20;

/**
 * Deliberately short-lived. This governs how long a signed URL for a
 * public log's photo stays usable after being issued. The storage
 * policy that permits reading a public log's photo takes effect
 * immediately for any NEW signed URL request the moment a log goes
 * private or is deleted, but a URL already handed to a browser remains
 * usable until it expires, that's how signed URLs work, this can't be
 * revoked after the fact. Keeping this window short (5 minutes) limits
 * that exposure deliberately, it's a privacy choice, not a technical
 * requirement.
 */
const SIGNED_URL_TTL_SECONDS = 5 * 60;

export interface FeedCursor {
  loggedAt: string;
  createdAt: string;
  id: string;
}

export interface FeedPageResult {
  items: FeedItem[];
  nextCursor: FeedCursor | null;
}

interface PublicFeedRow {
  log_id: string;
  logged_at: string;
  created_at: string;
  drink_rating: number;
  caption: string | null;
  temperature: "hot" | "iced" | null;
  photo_path: string | null;
  drink_id: string;
  drink_name: string;
  category: "coffee" | "tea";
  shop_id: string;
  shop_name: string;
  username: string | null;
  first_name: string | null;
  avatar_url: string | null;
}

/**
 * One page of the public feed. Cursor is the (logged_at, created_at,
 * id) of the last item from the previous page, or null for the first
 * page. Every field returned here already passed through
 * get_public_feed's own approved-columns list, this function never
 * touches drink_logs directly.
 */
export async function getPublicFeedPage(cursor: FeedCursor | null): Promise<FeedPageResult> {
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_public_feed", {
    cursor_logged_at: cursor?.loggedAt ?? null,
    cursor_created_at: cursor?.createdAt ?? null,
    cursor_id: cursor?.id ?? null,
    page_size: PAGE_SIZE,
  });

  const results = (data ?? []) as PublicFeedRow[];

  const photoPaths = results.map((r) => r.photo_path).filter((p): p is string => !!p);
  const signedUrlByPath = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("drink-photos")
      .createSignedUrls(photoPaths, SIGNED_URL_TTL_SECONDS);
    signed?.forEach((s) => {
      if (s.signedUrl && !s.error) signedUrlByPath.set(s.path ?? "", s.signedUrl);
    });
  }

  const items: FeedItem[] = results.map((r) => ({
    logId: r.log_id,
    loggedAt: r.logged_at,
    drinkRating: r.drink_rating,
    caption: r.caption,
    temperature: r.temperature,
    photoUrl: r.photo_path ? signedUrlByPath.get(r.photo_path) ?? null : null,
    drinkName: r.drink_name,
    category: r.category,
    shopId: r.shop_id,
    shopName: r.shop_name,
    username: r.username,
    firstName: r.first_name,
    avatarUrl: r.avatar_url,
  }));

  const last = results[results.length - 1];
  const nextCursor: FeedCursor | null =
    results.length === PAGE_SIZE && last
      ? { loggedAt: last.logged_at, createdAt: last.created_at, id: last.log_id }
      : null;

  return { items, nextCursor };
}

/**
 * Same shape as getPublicFeedPage, deliberately not a separate
 * architecture: get_friends_feed already filters to accepted friends
 * server-side, and still filters to visibility = 'public' on top of
 * that, friendship never grants access to a private log. Same cursor
 * convention, same short-lived signed URL window, same field mapping.
 */
export async function getFriendsFeedPage(cursor: FeedCursor | null): Promise<FeedPageResult> {
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_friends_feed", {
    cursor_logged_at: cursor?.loggedAt ?? null,
    cursor_created_at: cursor?.createdAt ?? null,
    cursor_id: cursor?.id ?? null,
    page_size: PAGE_SIZE,
  });

  const results = (data ?? []) as PublicFeedRow[];

  const photoPaths = results.map((r) => r.photo_path).filter((p): p is string => !!p);
  const signedUrlByPath = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("drink-photos")
      .createSignedUrls(photoPaths, SIGNED_URL_TTL_SECONDS);
    signed?.forEach((s) => {
      if (s.signedUrl && !s.error) signedUrlByPath.set(s.path ?? "", s.signedUrl);
    });
  }

  const items: FeedItem[] = results.map((r) => ({
    logId: r.log_id,
    loggedAt: r.logged_at,
    drinkRating: r.drink_rating,
    caption: r.caption,
    temperature: r.temperature,
    photoUrl: r.photo_path ? signedUrlByPath.get(r.photo_path) ?? null : null,
    drinkName: r.drink_name,
    category: r.category,
    shopId: r.shop_id,
    shopName: r.shop_name,
    username: r.username,
    firstName: r.first_name,
    avatarUrl: r.avatar_url,
  }));

  const friendsLast = results[results.length - 1];
  const friendsNextCursor: FeedCursor | null =
    results.length === PAGE_SIZE && friendsLast
      ? { loggedAt: friendsLast.logged_at, createdAt: friendsLast.created_at, id: friendsLast.log_id }
      : null;

  return { items, nextCursor: friendsNextCursor };
}
