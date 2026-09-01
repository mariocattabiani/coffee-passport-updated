import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getPublicUserProfile, getPublicUserActivityPage } from "@/lib/profile/public-actions";
import { getPublicUserMap, getPublicUserCities, getPublicUserDrinks } from "@/lib/profile/public-map-actions";
import { getMySaves } from "@/lib/profile/saved-actions";
import { AuthenticatedHeader } from "@/components/dashboard/authenticated-header";
import { PublicProfileHero } from "@/components/profile/public-profile-hero";
import { PublicProfileSummary } from "@/components/profile/public-profile-summary";
import { PublicCoffeeMap } from "@/components/profile/public-coffee-map";
import { CitiesDrinksSection } from "@/components/profile/cities-drinks-section";
import { PublicActivity } from "@/components/profile/public-activity";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { SavedList } from "@/components/profile/saved-list";

interface UserPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username} | Coffee Passport` };
}

/**
 * Not the same thing as /passport, that's the owner's own private
 * identity hub. This is the curated public view anyone (including the
 * owner themselves, viewing their own username) sees, derived entirely
 * from get_public_user_profile / get_public_user_activity /
 * get_public_user_map / get_public_user_cities / get_public_user_drinks,
 * which all independently filter to visibility = 'public' logs for this
 * user, so the summary line, the map, Cities, Drinks, and Recent
 * Coffees can never tell a different story from each other.
 *
 * Order: identity -> compact summary -> always-visible Coffee Map ->
 * Cities/Drinks -> Recent Coffees. The map is not behind a tab, it's
 * part of this person's coffee identity the same way the summary line
 * is.
 *
 * Saved is the one section that's genuinely different for the owner:
 * when friendshipState === "self" (i.e. this is the signed-in user's
 * own profile), the Recent Coffees section becomes a Posts | Saved
 * tab instead. Anyone else viewing this profile — friend or stranger —
 * sees exactly the plain "Recent coffees" section with no tab at all,
 * because Saved data is only ever fetched here when isSelf is true,
 * and get_my_saves itself is hardcoded to auth.uid() regardless, so
 * there's no path by which another viewer's request could return
 * someone else's saves even if this branch were somehow reached.
 */
export default async function UserProfilePage({ params }: UserPageProps) {
  const { username } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getPublicUserProfile(username);
  if (!profile) notFound();

  const isSelf = profile.friendshipState === "self";
  const identity = { username: profile.username, firstName: profile.firstName, avatarUrl: profile.avatarUrl };

  const [{ items, nextCursor }, mapShops, cities, drinks, savedItems] = await Promise.all([
    getPublicUserActivityPage(profile.username, null, identity),
    getPublicUserMap(profile.username),
    getPublicUserCities(profile.username),
    getPublicUserDrinks(profile.username),
    isSelf ? getMySaves() : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-crema pb-24 sm:pb-10">
      <AuthenticatedHeader />

      {/*
        Mobile/tablet (below lg): a single stacked column in the exact
        order product wants — identity, summary, map, Cities/Drinks,
        Recent Coffees. Nothing here is desktop-only markup wrapped in
        a media query, it's just two adjacent blocks that happen to sit
        side by side once there's room.

        Desktop (lg+): a deliberate two-column layout instead of one
        narrow centered column with a tall gap above a separately-wide
        feed. Left column (~40%) carries identity through Cities/Drinks;
        right column (~60%) carries Recent Coffees, starting at the
        same vertical position as the left column rather than far below
        it. A capped, centered max width (not the site's default
        unbounded `container`) is what actually makes this feel
        intentional on a large monitor instead of pinned to the left
        edge of the canvas.
      */}
      <main className="mx-auto w-full max-w-[1160px] px-6 py-8 sm:py-12">
        <div className="lg:grid lg:grid-cols-5 lg:items-start lg:gap-10">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <PublicProfileHero profile={profile} />
            <PublicProfileSummary profile={profile} />
            <PublicCoffeeMap firstName={profile.firstName} shops={mapShops} />
            <CitiesDrinksSection cities={cities} drinks={drinks} />
          </div>

          <section className="mt-6 min-w-0 lg:col-span-3 lg:mt-0">
            {isSelf ? (
              <ProfileTabs
                postsContent={
                  <PublicActivity
                    username={profile.username}
                    identity={identity}
                    initialItems={items}
                    initialCursor={nextCursor}
                    currentUserId={user.id}
                  />
                }
                savedContent={<SavedList initialItems={savedItems} />}
              />
            ) : (
              <>
                <h2 className="mb-4 font-heading text-xl font-semibold text-espresso">Recent coffees</h2>
                <PublicActivity
                  username={profile.username}
                  identity={identity}
                  initialItems={items}
                  initialCursor={nextCursor}
                  currentUserId={user.id}
                />
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
