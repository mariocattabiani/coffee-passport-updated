import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Trophy } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getGlobalLeaderboard, getFriendsLeaderboard, getMyGlobalRank } from "@/lib/leaderboard/actions";
import { AuthenticatedHeader } from "@/components/dashboard/authenticated-header";
import { LeaderboardTabs } from "@/components/leaderboard/leaderboard-tabs";

export const metadata: Metadata = {
  title: "Leaderboard | Coffee Passport",
};

/**
 * V1: one metric (total drinks logged, all time, regardless of
 * coffee/tea), two scopes (Everyone / Friends), no timeframe filters
 * yet. Reachable from the mobile hamburger drawer; the desktop header
 * isn't touched — this isn't a bottom-nav or primary-nav destination,
 * matching the explicit "not a sixth tab" decision.
 */
export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [globalRows, friendsRows, myGlobalRank] = await Promise.all([
    getGlobalLeaderboard(),
    getFriendsLeaderboard(),
    getMyGlobalRank(),
  ]);

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-clip bg-crema pb-24 lg:pb-10">
      <AuthenticatedHeader active="leaderboard" />

      <main className="mx-auto w-full max-w-2xl px-6 py-8 sm:py-12">
        <div className="mb-6 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-sage" aria-hidden="true" />
          <h1 className="font-heading text-2xl font-semibold text-espresso sm:text-3xl">Leaderboard</h1>
        </div>

        <LeaderboardTabs globalRows={globalRows} friendsRows={friendsRows} myGlobalRank={myGlobalRank} />
      </main>
    </div>
  );
}
