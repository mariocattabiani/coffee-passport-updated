"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ShopPreferenceStatus } from "@/lib/supabase/types";

export interface CompleteOnboardingInput {
  firstName: string;
  lastName: string;
  username: string;
  city: string;
  state: string;
  bio: string;
  avatarUrl: string | null;
  favoriteDrinks: string[];
  shopPreferences: { shopId: string; shopName: string; status: ShopPreferenceStatus }[];
}

export async function completeOnboarding(input: CompleteOnboardingInput) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      first_name: input.firstName,
      last_name: input.lastName || null,
      username: input.username,
      city: input.city,
      state: input.state,
      bio: input.bio || null,
      avatar_url: input.avatarUrl,
      favorite_drinks: input.favoriteDrinks,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  // Replace any existing shop preferences with the ones just selected.
  await supabase.from("user_shop_preferences").delete().eq("profile_id", user.id);

  if (input.shopPreferences.length > 0) {
    const { error: shopsError } = await supabase.from("user_shop_preferences").insert(
      input.shopPreferences.map((pref) => ({
        profile_id: user.id,
        shop_id: pref.shopId,
        shop_name: pref.shopName,
        status: pref.status,
      }))
    );

    if (shopsError) {
      return { error: shopsError.message };
    }
  }

  redirect("/dashboard");
}
