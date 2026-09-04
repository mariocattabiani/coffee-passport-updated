"use client";

import { useState } from "react";

import { LeaderboardList } from "@/components/leaderboard/leaderboard-list";
import type { LeaderboardRow, MyGlobalRank } from "@/lib/leaderboard/actions";

interface LeaderboardTabsProps {
  globalRows: LeaderboardRow[];
  friendsRows: LeaderboardRow[];
  myGlobalRank: MyGlobalRank | null;
}

type Tab = "everyone" | "friends";

/**
 * Both scopes are already loaded server-side (two RPC calls on page
 * load, no per-tab fetch) — switching tabs is instant, pure client
 * state, no loading flash.
 *
 * "Your rank" footer only ever appears on Everyone, and only when the
 * caller isn't already visible in the top-100 rows — if they're
 * already in the list, its own highlighted row already shows them
 * where they stand, a second summary would be redundant. Friends
 * never needs this: the caller is always included in that scope by
 * design, so they're always visible there already.
 */
export function LeaderboardTabs({ globalRows, friendsRows, myGlobalRank }: LeaderboardTabsProps) {
  const [tab, setTab] = useState<Tab>("everyone");

  const userVisibleInGlobal = globalRows.some((r) => r.isCurrentUser);
  const showMyRankFooter = tab === "everyone" && !userVisibleInGlobal && myGlobalRank !== null;

  return (
    <div>
      <div className="mb-4 inline-flex rounded-full border border-border bg-white p-1">
        <button
          type="button"
          onClick={() => setTab("everyone")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "everyone" ? "bg-espresso text-crema" : "text-charcoal hover:text-espresso"
          }`}
        >
          Everyone
        </button>
        <button
          type="button"
          onClick={() => setTab("friends")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "friends" ? "bg-espresso text-crema" : "text-charcoal hover:text-espresso"
          }`}
        >
          Friends
        </button>
      </div>

      {tab === "everyone" ? (
        <LeaderboardList rows={globalRows} emptyMessage="No one has logged a drink yet." />
      ) : (
        <LeaderboardList
          rows={friendsRows}
          emptyMessage="No friends on your leaderboard yet."
          emptyCta={{ href: "/friends", label: "Find Friends" }}
        />
      )}

      {showMyRankFooter && myGlobalRank && (
        <div className="mt-4 rounded-xl border border-espresso/20 bg-espresso/5 px-4 py-3 text-center text-sm font-medium text-espresso">
          Your rank: #{myGlobalRank.rank} · {myGlobalRank.drinkCount}{" "}
          {myGlobalRank.drinkCount === 1 ? "drink" : "drinks"}
        </div>
      )}
    </div>
  );
}
