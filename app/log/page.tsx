import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { LogForm } from "@/components/logs/log-form";
import type { Shop } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Log a coffee | Coffee Passport",
};

interface LogPageProps {
  searchParams: Promise<{ shopId?: string }>;
}

export default async function LogPage({ searchParams }: LogPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { shopId } = await searchParams;

  // Arriving from a café page ("Log a drink" there) preselects that
  // shop instead of starting from an empty search. A malformed or
  // unknown id just falls back to the normal empty-search state,
  // nothing breaks.
  let initialShop: Shop | null = null;
  if (shopId) {
    const { data: shop } = await supabase
      .from("shops")
      .select("*")
      .eq("id", shopId)
      .maybeSingle<Shop>();
    initialShop = shop ?? null;
  }

  return (
    <div className="min-h-dvh bg-crema">
      <LogForm userId={user.id} initialShop={initialShop} />
    </div>
  );
}
