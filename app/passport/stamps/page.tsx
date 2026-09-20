import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Award, Sparkles } from "lucide-react";

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
  const completion = items.length === 0 ? 0 : Math.round((earnedCount / items.length) * 100);

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-clip bg-crema pb-24 lg:pb-10">
      <AuthenticatedHeader active="passport" />

      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href="/passport"
          className="mb-6 inline-block text-sm font-medium text-charcoal/50 hover:text-espresso"
        >
          &larr; Back to Passport
        </Link>

        <div className="relative mb-8 overflow-hidden rounded-3xl border border-gold/30 bg-espresso px-5 py-6 text-crema shadow-card sm:px-8 sm:py-8">
          <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full border border-gold/20" aria-hidden="true" />
          <div className="absolute -right-2 top-3 h-24 w-24 rounded-full border border-dashed border-gold/25" aria-hidden="true" />

          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-crema/10">
              <Award className="h-6 w-6 text-gold" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl font-semibold sm:text-3xl">Your Stamps</h1>
                <Sparkles className="h-4 w-4 text-gold" aria-hidden="true" />
              </div>
              <p className="mt-1 text-sm text-crema/70">Earn stamps as you explore, taste, and share.</p>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-3 gap-3 border-t border-crema/15 pt-5">
            <div>
              <p className="font-heading text-2xl font-semibold text-gold">{earnedCount}</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-crema/55">Earned</p>
            </div>
            <div>
              <p className="font-heading text-2xl font-semibold">{items.length}</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-crema/55">Available</p>
            </div>
            <div>
              <p className="font-heading text-2xl font-semibold">{completion}%</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-crema/55">Complete</p>
            </div>
          </div>
        </div>

        <StampsGrid items={items} />
      </main>
    </div>
  );
}
