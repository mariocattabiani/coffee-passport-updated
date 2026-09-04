"use server";

import { createClient } from "@/lib/supabase/server";

export interface LeaderboardRow {
  userId: string;
  username: string | null;
  firstName: string | null;
  avatarUrl: string | null;
  drinkCount: number;
  rank: number;
  isCurrentUser: boolean;
}

interface LeaderboardRpcRow {
  user_id: string;
  username: string | null;
  first_name: string | null;
  avatar_url: string | null;
  drink_count: number;
  rank: number;
  is_current_user: boolean;
}

function mapRow(r: LeaderboardRpcRow): LeaderboardRow {
  return {
    userId: r.user_id,
    username: r.username,
    firstName: r.first_name,
    avatarUrl: r.avatar_url,
    drinkCount: r.drink_count,
    rank: r.rank,
    isCurrentUser: r.is_current_user,
  };
}

/** Every user with at least one drink log, ranked by total count —
 *  get_global_leaderboard derives auth.uid() itself for is_current_user,
 *  no parameter here could ever be used to ask for a different scope. */
export async function getGlobalLeaderboard(): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_global_leaderboard", { result_limit: 100 });

  if (error) {
    console.error("get_global_leaderboard failed:", error.message);
    throw new Error("Unable to load the leaderboard.");
  }

  return ((data ?? []) as LeaderboardRpcRow[]).map(mapRow);
}

/** The current user's accepted friends plus the user themselves —
 *  get_friends_leaderboard derives the friend list from auth.uid()
 *  server-side, never from a client-supplied id. */
export async function getFriendsLeaderboard(): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_friends_leaderboard", { result_limit: 100 });

  if (error) {
    console.error("get_friends_leaderboard failed:", error.message);
    throw new Error("Unable to load your friends leaderboard.");
  }

  return ((data ?? []) as LeaderboardRpcRow[]).map(mapRow);
}

export interface MyGlobalRank {
  drinkCount: number;
  rank: number;
}

/**
 * Degrades to null on failure rather than throwing — this only powers
 * an optional "Your rank" footer shown when the caller isn't already
 * visible in the top-100 list; a failure here shouldn't take down the
 * whole leaderboard page over a non-essential supplementary stat.
 */
export async function getMyGlobalRank(): Promise<MyGlobalRank | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_global_rank");

  if (error) {
    console.error("get_my_global_rank failed:", error.message);
    return null;
  }

  const rows = (data ?? []) as { drink_count: number; rank: number }[];
  const row = rows[0];
  return row ? { drinkCount: row.drink_count, rank: row.rank } : null;
}
