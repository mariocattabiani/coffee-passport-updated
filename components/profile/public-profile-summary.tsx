import type { PublicProfile } from "@/lib/profile/public-actions";

/**
 * Deliberately a single line of profile identity metadata, not a card.
 * The previous PublicStats component (a bordered panel with a divider
 * and a favorite-drink/café row) read as a small dashboard sitting
 * right under the header; this reads as part of who the person is,
 * the same way a follower count or bio reads on other social profiles.
 * Renders nothing if there's no public activity yet.
 */
export function PublicProfileSummary({ profile }: { profile: PublicProfile }) {
  const hasAnyStats = profile.publicCoffeesLogged > 0 || profile.publicCafesVisited > 0;
  if (!hasAnyStats) return null;

  return (
    <p className="text-center text-sm text-charcoal/60 sm:text-left">
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
    </p>
  );
}
