"use client";

import { useState } from "react";
import Link from "next/link";
import { Coffee } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { completeOnboarding } from "@/app/onboarding/actions";
import { INITIAL_WIZARD_DATA, type WizardData } from "@/lib/onboarding/types";
import { ProgressBar } from "@/components/onboarding/progress-bar";
import { StepWelcome } from "@/components/onboarding/step-welcome";
import { StepProfile } from "@/components/onboarding/step-profile";
import { StepDrinks } from "@/components/onboarding/step-drinks";
import { StepShops } from "@/components/onboarding/step-shops";
import { StepReview } from "@/components/onboarding/step-review";

const TOTAL_STEPS = 5;

export function OnboardingWizard({ userId }: { userId: string }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(INITIAL_WIZARD_DATA);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(patch: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function next() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    let avatarUrl: string | null = null;

    // Uploading the photo is optional and best-effort: if the Storage
    // bucket hasn't been set up yet, onboarding still completes fine.
    if (data.avatarFile) {
      try {
        const supabase = createClient();
        const path = `${userId}/${Date.now()}-${data.avatarFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, data.avatarFile, { upsert: true });

        if (!uploadError) {
          const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
          avatarUrl = publicUrl.publicUrl;
        }
      } catch {
        // Skip the photo rather than blocking onboarding.
      }
    }

    const result = await completeOnboarding({
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      username: data.username.trim(),
      city: data.city.trim(),
      state: data.state.trim(),
      bio: data.bio.trim(),
      avatarUrl,
      favoriteDrinks: data.favoriteDrinks,
      shopPreferences: Object.entries(data.shopPreferences).map(([shopId, pref]) => ({
        shopId,
        shopName: pref.shopName,
        status: pref.status,
      })),
    });

    // completeOnboarding redirects on success, so reaching here means
    // something went wrong.
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-crema px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <Coffee className="h-5 w-5 text-espresso" />
        <span className="font-heading text-lg font-semibold text-espresso">Coffee Passport</span>
      </Link>

      <div className="w-full max-w-lg">
        {step > 0 && (
          <div className="mb-8">
            <ProgressBar step={step} totalSteps={TOTAL_STEPS} />
          </div>
        )}

        <div key={step} className="animate-fade-up rounded-2xl border border-border/60 bg-white p-6 shadow-card sm:p-8">
          {step === 0 && <StepWelcome onNext={next} />}
          {step === 1 && <StepProfile userId={userId} data={data} update={update} onNext={next} onBack={back} />}
          {step === 2 && <StepDrinks data={data} update={update} onNext={next} onBack={back} />}
          {step === 3 && <StepShops data={data} update={update} onNext={next} onBack={back} />}
          {step === 4 && (
            <StepReview data={data} onBack={back} onSubmit={handleSubmit} submitting={submitting} error={error} />
          )}
        </div>
      </div>
    </div>
  );
}
