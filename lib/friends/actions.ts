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
