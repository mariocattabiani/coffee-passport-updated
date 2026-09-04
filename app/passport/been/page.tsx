import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { CircleCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { AuthenticatedHeader } from "@/components/dashboard/authenticated-header";
import { BeenList } from "@/components/passport/been-list";
import { buildBeenCafes } from "@/lib/passport/been";

export const metadata: Metadata = {
  title: "Been | Coffee Passport",
};

interface BeenLogRow {
  shop_id: string;
  logged_at: string;
  shop: { name: string; city: string | null; state: string | null } | null;
  drink: { name: string } | null;
}

/**
 * Deliberately its own lean query, not a reuse of Passport's full
 * drink_logs select: this view never shows a photo, caption, price,
 * size, or rating, so it never fetches drink_logs.photo_url or
 * anything else it has no use for. No new SQL/RPC exists or is needed
 * here — drink_logs' existing owner-only RLS (auth.uid() = user_id)
 * already scopes this correctly, this is a plain client-scoped select
 * exactly like the rest of this codebase's own-data reads.
 */
export default async function BeenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows, error } = await supabase
    .from("drink_logs")
    .select("shop_id, logged_at, shop:shops(name,city,state), drink:drinks(name)")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<BeenLogRow[]>();

  if (error) {
    console.error("passport been query:", error.message);
    throw new Error("Unable to load your visited cafés.");
  }

  const logs = rows ?? [];

  const cafes = buildBeenCafes(
    logs.map((l) => ({
      shopId: l.shop_id,
      shopName: l.shop?.name ?? "Unknown café",
      city: l.shop?.city ?? null,
      state: l.shop?.state ?? null,
      drinkName: l.drink?.name ?? "Unknown drink",
      loggedAt: l.logged_at,
    }))
  );

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
            <CircleCheck className="h-5 w-5 text-sage" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-semibold text-espresso sm:text-3xl">Been</h1>
            <p className="text-sm text-charcoal/60">
              {cafes.length} {cafes.length === 1 ? "café" : "cafés"} you&apos;ve visited
            </p>
          </div>
        </div>

        <BeenList cafes={cafes} />
      </main>
    </div>
  );
}
