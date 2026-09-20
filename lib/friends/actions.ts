"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type FriendshipState = "self" | "none" | "outgoing_pending" | "incoming_pending" | "friends";

export interface FriendshipActionResult {
  success: boolean;
  message: string;
}

interface RpcOutcomeRow {
  success: boolean;
  message: string;
}

/**
 * Every mutation RPC returns a structured (success, message) result
 * rather than raising, so this just forwards it, with one fallback for
 * the (unexpected) case where the RPC call itself fails at the
 * transport level rather than returning its own row.
 */
async function callFriendshipRpc(
  name: "send_friend_request" | "accept_friend_request" | "decline_friend_request" | "cancel_friend_request" | "remove_friend",
  targetUserId: string
): Promise<FriendshipActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(name, { target_user_id: targetUserId });

  if (error) {
    return { success: false, message: "Something went wrong. Please try again." };
  }

  const rows = (data ?? []) as RpcOutcomeRow[];
  const outcome = rows[0];
  if (!outcome) {
    return { success: false, message: "Something went wrong. Please try again." };
  }

  revalidatePath("/friends");
  revalidatePath("/discover");

  return { success: outcome.success, message: outcome.message };
}

export async function sendFriendRequest(targetUserId: string) {
  return callFriendshipRpc("send_friend_request", targetUserId);
}

export async function acceptFriendRequest(targetUserId: string) {
  return callFriendshipRpc("accept_friend_request", targetUserId);
}

export async function declineFriendRequest(targetUserId: string) {
  return callFriendshipRpc("decline_friend_request", targetUserId);
}

export async function cancelFriendRequest(targetUserId: string) {
  return callFriendshipRpc("cancel_friend_request", targetUserId);
}

export async function removeFriend(targetUserId: string) {
  return callFriendshipRpc("remove_friend", targetUserId);
}

export async function getFriendshipState(targetUserId: string): Promise<FriendshipState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_friendship_state", { target_user_id: targetUserId });
  if (error || !data) return "none";
  return data as FriendshipState;
}

export async function getPendingRequestCount(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_pending_request_count");
  if (error || typeof data !== "number") return 0;
  return data;
}

/**
 * Total accepted friends for ANY user, not just the caller — this is
 * what backs both the owner's own Passport stat and a public profile's
 * "X friends" line. get_friend_count has no privacy check beyond
 * "must be signed in", matching the existing public-profile stats.
 */
export async function getFriendCount(targetUserId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_friend_count", { target_user_id: targetUserId });
  if (error || typeof data !== "number") return 0;
  return data;
}

export interface FriendListItem {
  userId: string;
  username: string;
  firstName: string | null;
  avatarUrl: string | null;
  city: string | null;
  friendshipState: FriendshipState;
  /** True when this person is directly friends with the current
   *  viewer too — i.e. a real mutual friend between the viewer and
   *  the profile whose list this is. NOT derived from mutualCount:
   *  a person can be a direct friend of the viewer (isMutual: true)
   *  while sharing zero other connections (mutualCount: 0), and can
   *  share several third-party connections with the viewer without
   *  being mutual at all (isMutual: false). On the viewer's own list
   *  this is trivially true for every row, so callers should suppress
   *  it there rather than rely on the value. */
  isMutual: boolean;
  /** How many friends the viewer and this person have in common
   *  through third parties. A distinct, complementary number from
   *  isMutual — see above. */
  mutualCount: number;
}

interface FriendListRow {
  user_id: string;
  username: string;
  first_name: string | null;
  avatar_url: string | null;
  city: string | null;
  friendship_state: string;
  is_mutual: boolean;
  mutual_count: number;
}

/**
 * The full friend list for ANY user (target_user_id = the caller's own
 * id from Passport, or someone else's id from a public profile) — one
 * round trip, mutual counts (relative to the caller) and each row's
 * friendship_state already resolved server-side. Used by
 * FriendListSheet only, fetched on demand when the sheet actually
 * opens, never eagerly on page load.
 */
export async function getFriendList(targetUserId: string): Promise<FriendListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_friend_list", { target_user_id: targetUserId });
  if (error) return [];

  const rows = (data ?? []) as FriendListRow[];
  return rows.map((r) => ({
    userId: r.user_id,
    username: r.username,
    firstName: r.first_name,
    avatarUrl: r.avatar_url,
    city: r.city,
    friendshipState: r.friendship_state as FriendshipState,
    isMutual: r.is_mutual,
    mutualCount: r.mutual_count,
  }));
}
