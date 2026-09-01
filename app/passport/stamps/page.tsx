import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Award } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getMyStampItems } from "@/lib/passport/stamps-data";
import { AuthenticatedHeader } from "@/components/dashboard/authenticated-header";
import { StampsGrid } from "@/components/passport/stamps-grid";

export const metadata: Metadata = {
  title: "Stamps | Coffee Passport",
};

export default async function StampsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const items = await getMyStampItems();
  const earnedCount = items.filter((i) => i.earned).length;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-crema pb-24 sm:pb-10">
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
            <Award className="h-5 w-5 text-sage" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-semibold text-espresso sm:text-3xl">Stamps</h1>
            <p className="text-sm text-charcoal/60">
              {earnedCount} of {items.length} earned
            </p>
          </div>
        </div>

        <StampsGrid items={items} />
      </main>
    </div>
  );
}
