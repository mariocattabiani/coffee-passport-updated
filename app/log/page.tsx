import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { LogForm } from "@/components/logs/log-form";

export const metadata: Metadata = {
  title: "Log a coffee | Coffee Passport",
};

export default async function LogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-crema">
      <LogForm userId={user.id} />
    </div>
  );
}
