"use client";

import { useState } from "react";
import { Search, Heart, Bookmark, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MOCK_SHOPS } from "@/lib/onboarding/mock-shops";
import type { ShopPreferenceStatus } from "@/lib/supabase/types";
import type { WizardData } from "@/lib/onboarding/types";

interface StepShopsProps {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const STATUS_OPTIONS: { status: ShopPreferenceStatus; label: string; icon: typeof Heart }[] = [
  { status: "favorite", label: "Favorite", icon: Heart },
  { status: "want_to_try", label: "Want to try", icon: Bookmark },
  { status: "been", label: "Already been", icon: CheckCircle2 },
];

export function StepShops({ data, update, onNext, onBack }: StepShopsProps) {
  const [query, setQuery] = useState("");

  const filtered = MOCK_SHOPS.filter((shop) =>
    shop.name.toLowerCase().includes(query.toLowerCase())
  );

  function setStatus(shopId: string, shopName: string, status: ShopPreferenceStatus) {
    const current = data.shopPreferences[shopId];
    const next = { ...data.shopPreferences };
    if (current?.status === status) {
      delete next[shopId]; // clicking the same status again clears it
    } else {
      next[shopId] = { shopName, status };
    }
    update({ shopPreferences: next });
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-semibold text-espresso">Favorite coffee shops</h2>
      <p className="mt-1.5 text-sm text-charcoal/60">
        Mark shops you love, want to try, or have already been to. (Real search is coming later — this is a sample list for now.)
      </p>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search coffee shops..."
          className="pl-10"
        />
      </div>

      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
        {filtered.map((shop) => {
          const pref = data.shopPreferences[shop.id];
          return (
            <div
              key={shop.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-charcoal">{shop.name}</p>
                <p className="text-xs text-charcoal/50">{shop.city}</p>
              </div>
              <div className="flex gap-1.5">
                {STATUS_OPTIONS.map(({ status, label, icon: Icon }) => {
                  const active = pref?.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatus(shop.id, shop.name, status)}
                      title={label}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                        active
                          ? "border-espresso bg-espresso text-crema"
                          : "border-border bg-white text-charcoal/50 hover:border-espresso/40"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" fill={active ? "currentColor" : "none"} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-charcoal/40">No shops match &quot;{query}&quot;.</p>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}
