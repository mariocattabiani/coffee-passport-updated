import type { PublicProfile } from "@/lib/profile/public-actions";
import { PublicProfileFriendsLine } from "@/components/profile/public-profile-friends-line";

/**
 * Deliberately a single line of profile identity metadata, not a card.
 * The previous PublicStats component (a bordered panel with a divider
 * and a favorite-drink/café row) read as a small dashboard sitting
 * right under the header; this reads as part of who the person is,
 * the same way a follower count or bio reads on other social profiles.
 * Renders nothing if there's no public activity yet.
 */
export function PublicProfileSummary({ profile }: { profile: PublicProfile }) {
  // Friend count is its own real profile metric, independent of
  // whether this person has logged any public coffees yet — a brand
  // new user can already have friends — so it alone is now enough to
  // keep this line from disappearing entirely.
  const hasAnyStats =
    profile.publicCoffeesLogged > 0 || profile.publicCafesVisited > 0 || profile.friendCount > 0;
  if (!hasAnyStats) return null;

  const isSelf = profile.friendshipState === "self";

  return (
    <div className="text-center text-sm text-charcoal/60 sm:text-left">
      <span className="font-semibold text-espresso">{profile.publicCoffeesLogged}</span>{" "}
      {profile.publicCoffeesLogged === 1 ? "coffee" : "coffees"}
      <span className="mx-1.5 text-charcoal/30">·</span>
      <span className="font-semibold text-espresso">{profile.publicCafesVisited}</span>{" "}
      {profile.publicCafesVisited === 1 ? "café" : "cafés"}
      {profile.publicCitiesVisited > 0 && (
        <>
          <span className="mx-1.5 text-charcoal/30">·</span>
          <span className="font-semibold text-espresso">{profile.publicCitiesVisited}</span>{" "}
          {profile.publicCitiesVisited === 1 ? "city" : "cities"}
        </>
      )}
      <PublicProfileFriendsLine
        userId={profile.userId}
        username={profile.username}
        firstName={profile.firstName}
        friendCount={profile.friendCount}
        mutualFriendCount={profile.mutualFriendCount}
        isSelf={isSelf}
      />
    </div>
  );
}
