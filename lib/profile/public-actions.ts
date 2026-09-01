"use server";

import { createClient } from "@/lib/supabase/server";
import type { FriendshipState } from "@/lib/friends/actions";
import type { FeedCursor } from "@/lib/discover/actions";
import type { FeedItem } from "@/components/discover/feed-card";

const SIGNED_URL_TTL_SECONDS = 5 * 60;
const PAGE_SIZE = 20;

export interface PublicProfile {
  userId: string;
  username: string;
  firstName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  friendshipState: FriendshipState;
  publicCoffeesLogged: number;
  publicCafesVisited: number;
  publicCitiesVisited: number;
  favoriteDrinkName: string | null;
  favoriteShopName: string | null;
}

interface PublicProfileRow {
  user_id: string;
  username: string;
  first_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  friendship_state: string;
  public_coffees_logged: number;
  public_cafes_visited: number;
  public_cities_visited: number;
  favorite_drink_name: string | null;
  favorite_shop_name: string | null;
}

/** Returns null for a username that doesn't exist, the page turns that
 *  into notFound(). Identity, friendship state, and every stat here
 *  are resolved in one round trip, entirely server-side. */
export async function getPublicUserProfile(username: string): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_user_profile", { target_username: username });
  if (error) return null;

  const rows = (data ?? []) as PublicProfileRow[];
  const row = rows[0];
  if (!row) return null;

  return {
    userId: row.user_id,
    username: row.username,
    firstName: row.first_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    friendshipState: row.friendship_state as FriendshipState,
    publicCoffeesLogged: row.public_coffees_logged,
    publicCafesVisited: row.public_cafes_visited,
    publicCitiesVisited: row.public_cities_visited,
    favoriteDrinkName: row.favorite_drink_name,
    favoriteShopName: row.favorite_shop_name,
  };
}

interface UserActivityRow {
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
  shop_city: string | null;
  shop_state: string | null;
  owner_user_id: string;
  like_count: number;
  viewer_has_liked: boolean;
  viewer_has_saved: boolean;
  comment_count: number;
}

export interface UserActivityPageResult {
  items: FeedItem[];
  nextCursor: FeedCursor | null;
}

/**
 * get_public_user_activity deliberately doesn't repeat identity fields
 * per row (the profile page already has them once), so this fills them
 * in from the already-fetched profile, reusing FeedCard as-is rather
 * than building a separate card component for one section.
 */
export async function getPublicUserActivityPage(
  username: string,
  cursor: FeedCursor | null,
  identity: { username: string; firstName: string | null; avatarUrl: string | null }
): Promise<UserActivityPageResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_public_user_activity", {
    target_username: username,
    cursor_logged_at: cursor?.loggedAt ?? null,
    cursor_created_at: cursor?.createdAt ?? null,
    cursor_id: cursor?.id ?? null,
    page_size: PAGE_SIZE,
  });

  if (error) {
    console.error("get_public_user_activity failed:", error.message);
    throw new Error("Unable to load this profile's coffees right now.");
  }

  const results = (data ?? []) as UserActivityRow[];

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
    drinkId: r.drink_id,
    drinkName: r.drink_name,
    category: r.category,
    shopId: r.shop_id,
    shopName: r.shop_name,
    shopCity: r.shop_city,
    shopState: r.shop_state,
    ownerUserId: r.owner_user_id,
    username: identity.username,
    firstName: identity.firstName,
    avatarUrl: identity.avatarUrl,
    likeCount: r.like_count,
    viewerHasLiked: r.viewer_has_liked,
    viewerHasSaved: r.viewer_has_saved,
    commentCount: r.comment_count,
  }));

  const last = results[results.length - 1];
  const nextCursor: FeedCursor | null =
    results.length === PAGE_SIZE && last
      ? { loggedAt: last.logged_at, createdAt: last.created_at, id: last.log_id }
      : null;

  return { items, nextCursor };
}
