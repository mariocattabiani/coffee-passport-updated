"use client";

import { useState } from "react";
import { Search, MapPin, Check, Pencil, Loader2, AlertCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { findShopByGooglePlaceId } from "@/lib/shops/actions";
import { AddExternalCafeDialog } from "@/components/explore/add-external-cafe-dialog";
import { useShopSearch, MIN_QUERY_LENGTH } from "@/lib/google-maps/use-shop-search";
import type { ShopSuggestion, SelectedShopPlace } from "@/lib/google-maps/autocomplete";
import type { Shop } from "@/lib/supabase/types";

interface GoogleShopPickerProps {
  selectedShop: Shop | null;
  onSelect: (shop: Shop) => void;
  onChange: () => void;
}

export function GoogleShopPicker({ selectedShop, onSelect, onChange }: GoogleShopPickerProps) {
  const [query, setQuery] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [pendingPlace, setPendingPlace] = useState<SelectedShopPlace | null>(null);

  const { suggestions, searching, error: searchError, mode, setMode, getSession } = useShopSearch(query);
  const error = selectionError ?? searchError;

  async function handleSelectSuggestion(suggestion: ShopSuggestion) {
    setSelecting(true);
    setSelectionError(null);

    try {
      const place = await getSession().selectPlace(suggestion);

      // Never create anything on selection alone. If Coffee Passport
      // already has this café, use it directly, no dialog, no extra
      // Google request either, this is a plain database lookup.
      const existing = await findShopByGooglePlaceId(place.googlePlaceId);
      if (existing) {
        setSelecting(false);
        onSelect(existing);
        return;
      }

      setSelecting(false);
      setPendingPlace(place);
    } catch {
      setSelectionError("Couldn't look up that café. Please try again.");
      setSelecting(false);
    }
  }

  function handleCafeCreated(shop: Shop) {
    setPendingPlace(null);
    onSelect(shop);
  }

  function handleChange() {
    setQuery("");
    setMode("filtered");
    setSelectionError(null);
    // Defensive, alongside the fix in handleSelectSuggestion's
    // existing-shop branch above — this component is never unmounted
    // across "Change" (the parent only swaps which JSX branch renders
    // via the selectedShop prop, this picker's own internal state
    // persists the whole time), so "Change" is the one guaranteed
    // moment to make certain the search input can never come back
    // disabled for any reason.
    setSelecting(false);
    onChange();
  }

  if (selectedShop) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-espresso/20 bg-espresso/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-espresso text-crema">
            <Check className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-espresso">{selectedShop.name}</p>
            {(selectedShop.city || selectedShop.state) && (
              <p className="flex items-center gap-1 text-xs text-charcoal/50">
                <MapPin className="h-3 w-3" />
                {[selectedShop.city, selectedShop.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleChange}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-charcoal/60 hover:bg-white hover:text-espresso"
        >
          <Pencil className="h-3 w-3" />
          Change
        </button>
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cafés..."
            className="pl-10 pr-10"
            aria-label="Search cafés"
            disabled={selecting}
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

        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s.placeId}
              type="button"
              onClick={() => handleSelectSuggestion(s)}
              disabled={selecting}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white disabled:opacity-50"
            >
              <div>
                <p className="text-sm font-medium text-charcoal">{s.mainText}</p>
                {s.secondaryText && <p className="text-xs text-charcoal/50">{s.secondaryText}</p>}
              </div>
            </button>
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

        {/* Two-stage fallback: never switches automatically, only on a
            real tap, and only shown once there's an active search to
            widen in the first place. */}
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
          onCancel={() => setPendingPlace(null)}
        />
      )}
    </>
  );
}
