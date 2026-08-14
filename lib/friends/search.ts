"use server";

import { createClient } from "@/lib/supabase/server";
import type { FriendshipState } from "@/lib/friends/actions";

export interface UserSearchResult {
  userId: string;
  username: string;
  firstName: string | null;
  avatarUrl: string | null;
  friendshipState: FriendshipState;
}

interface SearchUserRow {
  user_id: string;
  username: string;
  first_name: string | null;
  avatar_url: string | null;
  friendship_state: string;
}

/** Client also debounces and enforces the 2-character minimum, this is
 *  the second, authoritative guard, the RPC itself enforces it a third
 *  time server-side. */
export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const supabase = await createClient();
  const { data } = await supabase.rpc("search_users", { query: trimmed, result_limit: 20 });
  const rows = (data ?? []) as SearchUserRow[];

  return rows.map((r) => ({
    userId: r.user_id,
    username: r.username,
    firstName: r.first_name,
    avatarUrl: r.avatar_url,
    friendshipState: r.friendship_state as FriendshipState,
  }));
}
