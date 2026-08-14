import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { UserPlus } from "lucide-react";

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
    <div className="min-h-screen bg-crema pb-24 sm:pb-10">
      <AuthenticatedHeader active="discover" />

      <main className="container max-w-5xl space-y-6 py-6 sm:py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-espresso sm:text-3xl">Discover</h1>
            <p className="text-sm text-charcoal/60">What people are drinking, across Coffee Passport</p>
          </div>

          {/* The explicit Friends entry point on mobile, since Friends
              is deliberately not a fifth bottom-nav tab. Visible at
              every width, desktop already has Friends in the top nav
              too, this is just always here as a consistent shortcut. */}
          <Link
            href="/friends"
            className="relative flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-white px-3 py-2 text-sm font-medium text-charcoal shadow-soft hover:border-espresso/40"
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

        <DiscoverFeed initialItems={items} initialCursor={nextCursor} />
      </main>
    </div>
  );
}
