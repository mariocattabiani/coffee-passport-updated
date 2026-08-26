"use client";

import { MapPin, User, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { WizardData } from "@/lib/onboarding/types";

interface StepReviewProps {
  data: WizardData;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}

export function StepReview({ data, onBack, onSubmit, submitting, error }: StepReviewProps) {
  const shopCount = Object.keys(data.shopPreferences).length;

  return (
    <div>
      <h2 className="font-heading text-2xl font-semibold text-espresso">You&apos;re ready</h2>
      <p className="mt-1.5 text-sm text-charcoal/60">Here&apos;s your passport so far.</p>

      <div className="mt-6 rounded-xl border border-border bg-white p-5 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-latte/30 ring-2 ring-crema">
            {data.avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.avatarPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-6 w-6 text-espresso/50" />
            )}
          </div>
          <div>
            <p className="font-heading text-lg font-semibold text-espresso">
              {data.firstName} {data.lastName}
            </p>
            <p className="text-sm text-charcoal/50">@{data.username || "username"}</p>
            {(data.city || data.state) && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-charcoal/50">
                <MapPin className="h-3 w-3" />
                {[data.city, data.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>

        {data.bio && <p className="mt-4 text-sm text-charcoal/70">{data.bio}</p>}

        {data.favoriteDrinks.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/40">Favorite drinks</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.favoriteDrinks.map((drink) => (
                <span key={drink} className="rounded-full bg-espresso/5 px-3 py-1 text-xs font-medium text-espresso">
                  {drink}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/60 pt-4 text-center">
          <div>
            <p className="font-heading text-lg font-semibold text-espresso">{data.favoriteDrinks.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-charcoal/40">Drinks</p>
          </div>
          <div>
            <p className="font-heading text-lg font-semibold text-espresso">{shopCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-charcoal/40">Shops</p>
          </div>
          <div>
            <p className="font-heading text-lg font-semibold text-espresso">0</p>
            <p className="text-[10px] uppercase tracking-wide text-charcoal/40">Coffees logged</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-error/10 p-3 text-sm text-error">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button type="button" onClick={onSubmit} disabled={submitting}>
          {submitting ? "Setting up your passport..." : "Start Exploring"}
        </Button>
      </div>
    </div>
  );
}
