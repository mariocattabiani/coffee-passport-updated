import Link from "next/link";
import { User } from "lucide-react";

import { FriendActionButton } from "@/components/friends/friend-action-button";
import type { FriendshipState } from "@/lib/friends/actions";

interface PersonRowProps {
  userId: string;
  username: string;
  firstName: string | null;
  avatarUrl: string | null;
  friendshipState: FriendshipState;
}

/**
 * One shared row, reused across search results, incoming requests, and
 * the friends list, rather than three separate near-identical
 * components. FriendActionButton already renders the correct
 * accept/decline, request-sent, or friends treatment from
 * friendshipState alone.
 */
export function PersonRow({ userId, username, firstName, avatarUrl, friendshipState }: PersonRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-3.5 shadow-soft">
      <Link href={`/users/${username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-latte/30">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-5 w-5 text-espresso/40" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-charcoal">{firstName || username}</p>
          <p className="truncate text-sm text-charcoal/50">@{username}</p>
        </div>
      </Link>
      <FriendActionButton targetUserId={userId} initialState={friendshipState} />
    </div>
  );
}
