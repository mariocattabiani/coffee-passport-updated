import { User } from "lucide-react";

import { FriendActionButton } from "@/components/friends/friend-action-button";
import type { PublicProfile } from "@/lib/profile/public-actions";

/**
 * Deliberately lighter than PassportHeader: no ring motif, no dark
 * stats panel, no vertical accent rule, just identity and an action.
 * This is someone else's social profile, not a personal identity hub,
 * it shouldn't compete visually with the owner's own Passport.
 */
export function PublicProfileHero({ profile }: { profile: PublicProfile }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-latte/30 ring-4 ring-white shadow-card sm:h-28 sm:w-28">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <User className="h-10 w-10 text-espresso/40" />
        )}
      </div>
      <div>
        {profile.firstName && (
          <h1 className="font-heading text-3xl font-semibold text-espresso sm:text-4xl">{profile.firstName}</h1>
        )}
        <p className="text-charcoal/50">@{profile.username}</p>
        {profile.bio && (
          <p className="mt-2 max-w-md text-sm italic text-charcoal/60">&ldquo;{profile.bio}&rdquo;</p>
        )}

        {profile.friendshipState !== "self" && (
          <div className="mt-4 flex justify-center sm:justify-start">
            <FriendActionButton targetUserId={profile.userId} initialState={profile.friendshipState} size="default" />
          </div>
        )}
      </div>
    </div>
  );
}
