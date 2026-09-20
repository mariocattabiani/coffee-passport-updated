"use client";

import { useState } from "react";

import { FriendListSheet } from "@/components/friends/friend-list-sheet";

interface PublicProfileFriendsLineProps {
  userId: string;
  username: string;
  firstName: string | null;
  friendCount: number;
  mutualFriendCount: number;
  isSelf: boolean;
}

/**
 * Renders inline inside PublicProfileSummary's existing "X coffees ·
 * X cafés · X cities" line, as one more segment: "· X friends", plus,
 * only when this isn't the viewer's own profile and a mutual count
 * exists, a second clickable "Y mutual friends" segment right after
 * it. Both open the exact same sheet (this profile's full friend
 * list) — mutual friends aren't a separate list, just a way in.
 */
export function PublicProfileFriendsLine({
  userId,
  username,
  firstName,
  friendCount,
  mutualFriendCount,
  isSelf,
}: PublicProfileFriendsLineProps) {
  const [open, setOpen] = useState(false);
  const label = friendCount === 1 ? "friend" : "friends";

  return (
    <>
      <span className="mx-1.5 text-charcoal/30">·</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-medium text-charcoal/60 underline-offset-2 hover:text-espresso hover:underline"
      >
        <span className="font-semibold text-espresso">{friendCount}</span> {label}
      </button>

      {!isSelf && mutualFriendCount > 0 && (
        <>
          <span className="mx-1.5 text-charcoal/30">·</span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-medium text-sage underline-offset-2 hover:underline"
          >
            {mutualFriendCount} mutual {mutualFriendCount === 1 ? "friend" : "friends"}
          </button>
        </>
      )}

      {open && (
        <FriendListSheet
          targetUserId={userId}
          isOwnList={isSelf}
          ownerLabel={firstName || `@${username}`}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
