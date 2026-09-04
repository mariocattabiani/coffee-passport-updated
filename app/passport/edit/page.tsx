import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { EditProfileForm } from "@/components/passport/edit-profile-form";

export const metadata: Metadata = {
  title: "Edit profile | Coffee Passport",
};

export default async function EditProfilePage() {
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

  return (
    <div className="min-h-dvh bg-crema">
      <EditProfileForm
        userId={user.id}
        initial={{
          firstName: profile?.first_name ?? "",
          lastName: profile?.last_name ?? "",
          username: profile?.username ?? "",
          city: profile?.city ?? "",
          state: profile?.state ?? "",
          bio: profile?.bio ?? "",
          avatarUrl: profile?.avatar_url ?? null,
        }}
      />
    </div>
  );
}
