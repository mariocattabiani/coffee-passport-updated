import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Coffee, Clock, Bookmark, Heart, MapPin, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LogoutButton } from "@/components/dashboard/logout-button";

export const metadata: Metadata = {
  title: "Dashboard — Coffee Passport",
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const firstName = profile?.first_name || "there";

  return (
    <div className="min-h-screen bg-crema">
      <header className="border-b border-border/60 bg-white/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-espresso" />
            <span className="font-heading text-lg font-semibold text-espresso">Coffee Passport</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="container py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-semibold text-espresso">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-1 text-charcoal/60">Ready for your next coffee?</p>
          </div>
          <Button size="lg" className="gap-2" disabled title="Coming in a future sprint">
            <Plus className="h-4 w-4" />
            Log Coffee
          </Button>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <section>
            <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-charcoal/50">
              Recent Activity
            </h2>
            <EmptyState
              icon={Clock}
              title="No coffees logged yet"
              description="Once logging is live, your recent cups will show up right here."
            />
          </section>

          <section>
            <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-charcoal/50">
              Wishlist
            </h2>
            <EmptyState
              icon={Bookmark}
              title="Nothing saved yet"
              description="Drinks and shops you want to try will collect here."
            />
          </section>

          <section>
            <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-charcoal/50">
              Favorite Shops
            </h2>
            <EmptyState
              icon={Heart}
              title="No favorites yet"
              description={
                profile && profile.favorite_drinks.length > 0
                  ? "You picked some favorite drinks during setup — favorite shops are next."
                  : "Mark a shop as a favorite once Discover is live."
              }
            />
          </section>

          <section>
            <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-charcoal/50">
              Nearby Coffee
            </h2>
            <EmptyState
              icon={MapPin}
              title="Map coming soon"
              description="We'll show coffee shops near you once the map is live."
            />
          </section>
        </div>
      </main>
    </div>
  );
}
