import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { UserPlus, MapPinned } from "lucide-react";

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

  const [{ items, nextCursor }, { data: pendingCount }] = await Promise.all([
    getPublicFeedPage(null),
    supabase.rpc("get_pending_request_count"),
  ]);
  const hasPending = typeof pendingCount === "number" && pendingCount > 0;

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-clip bg-crema pb-24 lg:pb-10">
      <AuthenticatedHeader active="discover" />

      <main className="mx-auto w-full max-w-5xl min-w-0 space-y-5 px-4 py-5 sm:space-y-6 sm:px-6 sm:py-10">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-semibold text-espresso sm:text-3xl">Discover</h1>
            <p className="text-sm text-charcoal/60">What people are drinking, across Coffee Passport</p>
          </div>

          {/* Explore and Friends both live here as the mobile entry
              points for destinations that aren't in the four-item
              bottom tab bar. Icon-only below sm so the pair doesn't
              crowd the header on narrow screens. */}
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/explore"
              className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-2 text-sm font-medium text-charcoal shadow-soft hover:border-espresso/40"
              aria-label="Explore cafés"
            >
              <MapPinned className="h-4 w-4" />
              <span className="hidden sm:inline">Explore</span>
            </Link>
            <Link
              href="/friends"
              className="relative flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-2 text-sm font-medium text-charcoal shadow-soft hover:border-espresso/40"
              aria-label="Friends"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Friends</span>
              {hasPending && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 rounded-full bg-sage ring-2 ring-white"
                  aria-hidden="true"
                />
              )}
            </Link>
          </div>
        </div>

        <DiscoverFeed initialItems={items} initialCursor={nextCursor} currentUserId={user.id} />
      </main>
    </div>
  );
}
