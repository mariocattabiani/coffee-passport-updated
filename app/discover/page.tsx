import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getPublicFeedPage } from "@/lib/discover/actions";
import { AuthenticatedHeader } from "@/components/dashboard/authenticated-header";
import { DiscoverFeed } from "@/components/discover/discover-feed";

export const metadata: Metadata = {
  title: "Discover | Coffee Passport",
};

export default async function DiscoverPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { items, nextCursor } = await getPublicFeedPage(null);

  return (
    <div className="min-h-screen bg-crema pb-24 sm:pb-10">
      <AuthenticatedHeader active="discover" />

      <main className="container max-w-5xl space-y-6 py-6 sm:py-10">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-espresso sm:text-3xl">Discover</h1>
          <p className="text-sm text-charcoal/60">What people are drinking, across Coffee Passport</p>
        </div>

        <DiscoverFeed initialItems={items} initialCursor={nextCursor} />
      </main>
    </div>
  );
}
