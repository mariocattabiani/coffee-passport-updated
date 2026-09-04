import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { AuthenticatedHeader } from "@/components/dashboard/authenticated-header";
import { PersonRow } from "@/components/friends/person-row";
import { PeopleSearch } from "@/components/friends/people-search";

export const metadata: Metadata = {
  title: "Friends | Coffee Passport",
};

interface RequestRow {
  user_id: string;
  username: string;
  first_name: string | null;
  avatar_url: string | null;
  requested_at: string;
}

interface FriendRow {
  user_id: string;
  username: string;
  first_name: string | null;
  avatar_url: string | null;
}

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: requestsRaw }, { data: friendsRaw }] = await Promise.all([
    supabase.rpc("get_my_incoming_requests"),
    supabase.rpc("get_my_friends"),
  ]);

  const requests = (requestsRaw ?? []) as RequestRow[];
  const friends = (friendsRaw ?? []) as FriendRow[];

  return (
    <div className="min-h-dvh bg-crema pb-24 lg:pb-10">
      <AuthenticatedHeader active="friends" />

      <main className="container max-w-2xl space-y-10 py-6 sm:py-10">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-espresso sm:text-3xl">Friends</h1>
          <p className="text-sm text-charcoal/60">Connect with people on Coffee Passport</p>
        </div>

        {/* Requests, shown only when present, so they stay visually the
            highest priority rather than an empty section taking up
            space every time. */}
        {requests.length > 0 && (
          <section>
            <h2 className="mb-3 font-heading text-lg font-semibold text-espresso">
              Requests <span className="text-sm font-normal text-charcoal/40">({requests.length})</span>
            </h2>
            <div className="space-y-2">
              {requests.map((r) => (
                <PersonRow
                  key={r.user_id}
                  userId={r.user_id}
                  username={r.username}
                  firstName={r.first_name}
                  avatarUrl={r.avatar_url}
                  friendshipState="incoming_pending"
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 font-heading text-lg font-semibold text-espresso">Friends</h2>
          {friends.length > 0 ? (
            <div className="space-y-2">
              {friends.map((f) => (
                <PersonRow
                  key={f.user_id}
                  userId={f.user_id}
                  username={f.username}
                  firstName={f.first_name}
                  avatarUrl={f.avatar_url}
                  friendshipState="friends"
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border bg-white/60 p-6 text-center text-sm text-charcoal/50">
              No friends yet, search below to find people.
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-heading text-lg font-semibold text-espresso">Find people</h2>
          <PeopleSearch />
        </section>
      </main>
    </div>
  );
}
