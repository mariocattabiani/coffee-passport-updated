import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getPublicUserProfile, getPublicUserActivityPage } from "@/lib/profile/public-actions";
import { AuthenticatedHeader } from "@/components/dashboard/authenticated-header";
import { PublicProfileHero } from "@/components/profile/public-profile-hero";
import { PublicStats } from "@/components/profile/public-stats";
import { PublicActivity } from "@/components/profile/public-activity";

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
 * from get_public_user_profile / get_public_user_activity, which only
 * ever look at visibility = 'public' logs.
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

  const identity = { username: profile.username, firstName: profile.firstName, avatarUrl: profile.avatarUrl };
  const { items, nextCursor } = await getPublicUserActivityPage(profile.username, null, identity);

  return (
    <div className="min-h-screen bg-crema pb-24 sm:pb-10">
      <AuthenticatedHeader />

      <main className="container max-w-3xl space-y-8 py-8 sm:py-12">
        <PublicProfileHero profile={profile} />
        <PublicStats profile={profile} />

        <section>
          <h2 className="mb-4 font-heading text-xl font-semibold text-espresso">Recent coffees</h2>
          <PublicActivity
            username={profile.username}
            identity={identity}
            initialItems={items}
            initialCursor={nextCursor}
          />
        </section>
      </main>
    </div>
  );
}
