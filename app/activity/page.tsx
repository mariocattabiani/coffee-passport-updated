import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getMyNotifications } from "@/lib/notifications/actions";
import { AuthenticatedHeader } from "@/components/dashboard/authenticated-header";
import { ActivityList } from "@/components/activity/activity-list";

export const metadata: Metadata = {
  title: "Activity | Coffee Passport",
};

/**
 * "Activity", not "Notifications" — the same reasoning from planning
 * this sprint: this may eventually carry more than mechanical
 * notifications (friend activity, etc.), so the more general name was
 * chosen up front rather than renamed later.
 */
export default async function ActivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const items = await getMyNotifications();

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-crema pb-24 sm:pb-10">
      <AuthenticatedHeader />

      <main className="mx-auto w-full max-w-2xl px-6 py-8 sm:py-12">
        <h1 className="mb-6 font-heading text-2xl font-semibold text-espresso sm:text-3xl">Activity</h1>
        <ActivityList initialItems={items} />
      </main>
    </div>
  );
}
