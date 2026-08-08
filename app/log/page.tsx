import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { LogForm } from "@/components/logs/log-form";
import type { Shop } from "@/lib/supabase/types";

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

  const { data: shops } = await supabase
    .from("shops")
    .select("*")
    .order("name")
    .returns<Shop[]>();

  return (
    <div className="min-h-screen bg-crema">
      <LogForm userId={user.id} shops={shops ?? []} />
    </div>
  );
}
