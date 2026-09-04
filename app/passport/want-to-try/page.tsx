import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Bookmark } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getMySaves } from "@/lib/profile/saved-actions";
import { AuthenticatedHeader } from "@/components/dashboard/authenticated-header";
import { SavedList } from "@/components/profile/saved-list";

export const metadata: Metadata = {
  title: "Want to Try | Coffee Passport",
};

/**
 * "Want to Try" is Passport's label for the same underlying save
 * intent the self-profile Saved tab already shows — get_my_saves() and
 * SavedList are reused exactly as-is, not forked or duplicated. Remove
 * here uses the same toggle_save call SavedList already makes, so a
 * removal here, on the self-profile Saved tab, or from a Discover
 * bookmark toggle are all just the same database row, never three
 * different mechanisms to keep in sync.
 */
export default async function WantToTryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const savedItems = await getMySaves();

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-clip bg-crema pb-24 lg:pb-10">
      <AuthenticatedHeader active="passport" />

      <main className="mx-auto w-full max-w-3xl px-6 py-8 sm:py-12">
        <Link
          href="/passport"
          className="mb-6 inline-block text-sm font-medium text-charcoal/50 hover:text-espresso"
        >
          &larr; Back to Passport
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage/10">
            <Bookmark className="h-5 w-5 text-sage" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-semibold text-espresso sm:text-3xl">Want to Try</h1>
            <p className="text-sm text-charcoal/60">
              {savedItems.length} {savedItems.length === 1 ? "thing" : "things"} you want to try
            </p>
          </div>
        </div>

        <SavedList initialItems={savedItems} />
      </main>
    </div>
  );
}
