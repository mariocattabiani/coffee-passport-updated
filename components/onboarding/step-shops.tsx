"use client";

import { useState } from "react";
import { Search, Heart, Bookmark, CheckCircle2, Loader2, AlertCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findShopByGooglePlaceId } from "@/lib/shops/actions";
import { AddExternalCafeDialog } from "@/components/explore/add-external-cafe-dialog";
import { useShopSearch, MIN_QUERY_LENGTH } from "@/lib/google-maps/use-shop-search";
import type { ShopSuggestion, SelectedShopPlace } from "@/lib/google-maps/autocomplete";
import type { Shop, ShopPreferenceStatus } from "@/lib/supabase/types";
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

/**
 * Real café search, not the old fixed list of fictional Austin cafés
 * (lib/onboarding/mock-shops.ts, removed) — reuses the exact same
 * shared two-stage search hook (useShopSearch) Log Coffee's
 * GoogleShopPicker uses: a default coffee-focused filter, with a
 * user-triggered "Can't find it? Search all places" fallback, never
 * switched automatically. Also reuses findShopByGooglePlaceId (existing-
 * shop reuse) and AddExternalCafeDialog (the same safe name-
 * confirmation + canonical-location-matching flow every other café-
 * creation path in the app uses). No separate café-search
 * implementation, no separate creation path.
 *
 * PERSISTENCE: unchanged from the previous pass — this writes into the
 * exact same WizardData.shopPreferences shape (Record<shopId,
 * {shopName, status}>) app/onboarding/actions.ts already persists to
 * the existing public.user_shop_preferences table. No schema change.
 */
export function StepShops({ data, update, onNext, onBack }: StepShopsProps) {
  const [query, setQuery] = useState("");
  const [resolvingPlaceId, setResolvingPlaceId] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [pendingPlace, setPendingPlace] = useState<SelectedShopPlace | null>(null);
  const [pendingStatus, setPendingStatus] = useState<ShopPreferenceStatus | null>(null);

  const { suggestions, searching, error: searchError, mode, setMode, getSession } = useShopSearch(query);
  const error = resolveError ?? searchError;

  function applyPreference(shop: Shop, status: ShopPreferenceStatus) {
    const current = data.shopPreferences[shop.id];
    const next = { ...data.shopPreferences };
    if (current?.status === status) {
      delete next[shop.id]; // tapping the same status again clears it
    } else {
      next[shop.id] = { shopName: shop.name, status };
    }
    update({ shopPreferences: next });
  }

  /** A status button was tapped for a Google suggestion that isn't
   *  resolved to a real Coffee Passport shop yet. Resolves it first
   *  (reusing an existing shop by google_place_id if one exists,
   *  otherwise confirming/creating a new one through the same dialog
   *  every other café-creation path in the app uses), then applies the
   *  tapped status to the result. */
  async function handleTagSuggestion(suggestion: ShopSuggestion, status: ShopPreferenceStatus) {
    setResolvingPlaceId(suggestion.placeId);
    setResolveError(null);

    try {
      const place = await getSession().selectPlace(suggestion);
      const existing = await findShopByGooglePlaceId(place.googlePlaceId);

      if (existing) {
        applyPreference(existing, status);
        setResolvingPlaceId(null);
        return;
      }

      // New café: hand off to the shared confirmation dialog. Status
      // is remembered and applied once that dialog reports the newly
      // created shop back via handleCafeCreated below.
      setPendingStatus(status);
      setPendingPlace(place);
      setResolvingPlaceId(null);
    } catch {
      setResolveError("Couldn't look up that café. Please try again.");
      setResolvingPlaceId(null);
    }
  }

  function handleCafeCreated(shop: Shop) {
    if (pendingStatus) applyPreference(shop, pendingStatus);
    setPendingPlace(null);
    setPendingStatus(null);
  }

  const selectedEntries = Object.entries(data.shopPreferences);

  return (
    <div>
      <h2 className="font-heading text-2xl font-semibold text-espresso">Favorite coffee shops</h2>
      <p className="mt-1.5 text-sm text-charcoal/60">
        Search for real cafés and mark the ones you love, want to try, or have already been to.
      </p>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for your favorite café"
          className="pl-10 pr-10"
          aria-label="Search cafés"
        />
        {searching && (
          <Loader2
            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-charcoal/30"
            aria-hidden="true"
          />
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-error/10 p-3 text-sm text-error">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="mt-3 max-h-60 space-y-1.5 overflow-y-auto pr-1">
        {suggestions.map((s) => (
          <div
            key={s.placeId}
            className="flex flex-col gap-2 rounded-lg border border-border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-charcoal">{s.mainText}</p>
              {s.secondaryText && <p className="truncate text-xs text-charcoal/50">{s.secondaryText}</p>}
            </div>
            <div className="flex shrink-0 gap-1.5">
              {resolvingPlaceId === s.placeId ? (
                <Loader2 className="h-4 w-4 animate-spin text-charcoal/30" />
              ) : (
                STATUS_OPTIONS.map(({ status, label, icon: Icon }) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleTagSuggestion(s, status)}
                    disabled={resolvingPlaceId !== null}
                    title={label}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-charcoal/50 transition-colors hover:border-espresso/40 disabled:opacity-50"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))
              )}
            </div>
          </div>
        ))}

        {!searching && query.trim().length >= MIN_QUERY_LENGTH && suggestions.length === 0 && !error && (
          <p className="px-3 py-4 text-center text-sm text-charcoal/40">
            {mode === "filtered" ? "No café results found." : "No places found."}
          </p>
        )}
        {query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH && (
          <p className="px-3 py-4 text-center text-xs text-charcoal/30">Keep typing to search...</p>
        )}
      </div>

      {query.trim().length >= MIN_QUERY_LENGTH && (
        <div className="mt-1.5 px-1">
          {mode === "filtered" ? (
            <button
              type="button"
              onClick={() => setMode("unrestricted")}
              className="text-xs font-medium text-charcoal/50 underline-offset-2 hover:text-espresso hover:underline"
            >
              Can&apos;t find it? Search all places
            </button>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xs text-charcoal/40">Showing all places</p>
              <button
                type="button"
                onClick={() => setMode("filtered")}
                className="text-xs font-medium text-charcoal/50 underline-offset-2 hover:text-espresso hover:underline"
              >
                Back to café results
              </button>
            </div>
          )}
        </div>
      )}

      {selectedEntries.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-charcoal/40">Your picks</p>
          <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
            {selectedEntries.map(([shopId, pref]) => {
              const option = STATUS_OPTIONS.find((o) => o.status === pref.status);
              const Icon = option?.icon ?? Heart;
              return (
                <div key={shopId} className="flex items-center justify-between gap-3 rounded-lg bg-crema px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-espresso" />
                    <p className="truncate text-sm text-charcoal">{pref.shopName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...data.shopPreferences };
                      delete next[shopId];
                      update({ shopPreferences: next });
                    }}
                    aria-label={`Remove ${pref.shopName}`}
                    className="shrink-0 text-charcoal/30 hover:text-charcoal/60"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onNext}>
          Continue
        </Button>
      </div>

      {pendingPlace && (
        <AddExternalCafeDialog
          place={{
            googlePlaceId: pendingPlace.googlePlaceId,
            googleName: pendingPlace.name,
            googleSecondaryText: pendingPlace.formattedAddress,
            locationHint: {
              city: pendingPlace.city,
              region: pendingPlace.state,
              countryCode: pendingPlace.country,
            },
          }}
          onCreated={handleCafeCreated}
          onCancel={() => {
            setPendingPlace(null);
            setPendingStatus(null);
          }}
        />
      )}
    </div>
  );
}
