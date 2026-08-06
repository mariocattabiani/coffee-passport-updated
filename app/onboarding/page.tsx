import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata: Metadata = {
  title: "Set up your passport — Coffee Passport",
};

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The middleware already guards this route, but checking again here
  // keeps the page safe even if it's ever reached another way.
  if (!user) {
    redirect("/login");
  }

  return <OnboardingWizard userId={user.id} />;
}
