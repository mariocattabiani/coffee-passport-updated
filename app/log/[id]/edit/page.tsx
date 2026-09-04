import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { EditLogForm } from "@/components/logs/edit-log-form";
import type { DrinkLog, Drink, Shop } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Edit log | Coffee Passport",
};

export default async function EditLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: log } = await supabase
    .from("drink_logs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<DrinkLog>();

  // Either it doesn't exist, or it doesn't belong to this user. Either
  // way, quietly send them back rather than revealing which.
  if (!log) {
    redirect("/dashboard");
  }

  const [{ data: shop }, { data: drink }] = await Promise.all([
    supabase.from("shops").select("*").eq("id", log.shop_id).single<Shop>(),
    supabase.from("drinks").select("*").eq("id", log.drink_id).single<Drink>(),
  ]);

  let signedPhotoUrl: string | null = null;
  if (log.photo_url) {
    const { data } = await supabase.storage
      .from("drink-photos")
      .createSignedUrl(log.photo_url, 3600);
    signedPhotoUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="min-h-dvh bg-crema">
      <EditLogForm
        userId={user.id}
        logId={log.id}
        shopName={shop?.name ?? "Unknown shop"}
        shopCityState={
          shop ? [shop.city, shop.state].filter(Boolean).join(", ") || null : null
        }
        drinkName={drink?.name ?? "Unknown drink"}
        beverageCategory={log.beverage_category}
        initialPhotoSignedUrl={signedPhotoUrl}
        initialPhotoPositionX={log.photo_position_x}
        initialPhotoPositionY={log.photo_position_y}
        initial={{
          drinkRating: log.drink_rating,
          shopRating: log.shop_rating,
          caption: log.caption ?? "",
          price: log.price !== null ? String(log.price) : "",
          size: log.size ?? "",
          temperature: log.temperature,
          loggedDate: log.logged_date,
          loggedAtInstant: log.logged_at,
          visibility: log.visibility,
        }}
      />
    </div>
  );
}
