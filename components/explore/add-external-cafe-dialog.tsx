"use client";

import { useEffect, useState } from "react";
import { AlertCircle, MapPin, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCoffeePassportShop } from "@/lib/shops/actions";
import { matchCanonicalLocation, type LocationOption, type CanonicalLocationHint } from "@/lib/shops/location-match-actions";
import type { Shop } from "@/lib/supabase/types";

export interface ExternalPlaceContext {
  googlePlaceId: string;
  /** Google's own name for this place, as the person just saw and
   *  selected it a moment ago. This is what "Add & continue" confirms
   *  by default — see the component doc below for why that's not the
   *  same thing as silently persisting Google's data. */
  googleName: string;
  /** DISPLAY ONLY — typically the full formatted address ("123 Main
   *  St, Virginia Beach, VA 23451, USA"). Never parsed for location
   *  matching (that was the actual bug this fixes — see
   *  matchCanonicalLocation's own doc comment). Shown to the person
   *  as-is, under the café name, purely so they can confirm they
   *  picked the right result. */
  googleSecondaryText?: string | null;
  /** The STRUCTURED, already-parsed city/region/country Google gave
   *  us for this exact selection (ShopSearchSession.selectPlace's own
   *  addressComponents extraction) — used ONLY to match against Coffee
   *  Passport's own public.locations, never persisted directly, never
   *  a second Google request. */
  locationHint?: CanonicalLocationHint;
}

interface AddExternalCafeDialogProps {
  place: ExternalPlaceContext;
  onCreated: (shop: Shop) => void;
  onCancel: () => void;
}

/**
 * The one-time creation step for a café Coffee Passport has never seen
 * before. This is a CONFIRMATION, not a form: the person already
 * selected this exact café from Google a moment ago, so the default
 * path asks them to confirm the name they already saw and picked,
 * never asks them to retype it from a blank field.
 *
 * That default confirmation is still a genuine, explicit user action,
 * not Google's data quietly flowing into Coffee Passport on its own —
 * tapping "Add & continue" is what actually writes the name, and it
 * gets stored with name_source = "user", the exact same provenance
 * value used when someone types a name from scratch. There's no
 * meaningful distinction between "a person typed this" and "a person
 * looked at this and affirmatively said yes, that's the name" worth a
 * second provenance value for — both are a person, in the moment,
 * deciding what Coffee Passport's name for this café is, which is the
 * actual thing name_source exists to distinguish from "seed"/"manual"/
 * unattended data.
 *
 * "Use a different Coffee Passport name" is the one intentional escape
 * hatch, off by default, revealing an editable field pre-filled with
 * Google's name as an editing starting point (not a blank field to
 * retype from scratch) — this is the only path where what gets stored
 * differs from what Google showed.
 *
 * No city TEXT field: collecting a typed city during logging is still
 * out of scope here, exactly as before. What's new is location
 * resolution, from `place.locationHint` — the STRUCTURED city/region/
 * country Google's addressComponents already gave us for this exact
 * selection (see ShopSearchSession.selectPlace in
 * lib/google-maps/autocomplete.ts), never a parsed formatted-address
 * string (that was a real bug an earlier version of this had — see
 * matchCanonicalLocation's own doc comment for the full story) and
 * never a second Google request. Matched against Coffee Passport's OWN
 * locations table (see lib/shops/location-match-actions.ts), never
 * Google's own address data persisted. One clear match resolves
 * silently, no extra tap required. A genuinely ambiguous match (rare,
 * but real once the locations table grows — e.g. two different
 * Springfields) shows one small, minimal picker; the person still only
 * ever confirms, never retypes anything. No match at all (the city
 * isn't in locations yet) creates the shop exactly as before, just
 * without a location_id — never blocked, never guessed.
 *
 * No second Google request: place.googleName/googleSecondaryText/
 * locationHint are exactly what the person already selected a moment
 * ago, nothing here
 * re-fetches Place Details just to render this confirmation.
 */
export function AddExternalCafeDialog({ place, onCreated, onCancel }: AddExternalCafeDialogProps) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(place.googleName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [locationCandidates, setLocationCandidates] = useState<LocationOption[]>([]);
  const [resolvedLocationId, setResolvedLocationId] = useState<string | null>(null);
  const [locationDeclined, setLocationDeclined] = useState(false);
  const [locationChecked, setLocationChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    matchCanonicalLocation(place.locationHint ?? { city: null, region: null, countryCode: null }).then((matches) => {
      if (cancelled) return;
      setLocationCandidates(matches);
      // Exactly one match resolves immediately, no extra tap needed —
      // ambiguity (0 or 2+) is left for the person to see below.
      if (matches.length === 1) {
        setResolvedLocationId(matches[0].id);
      }
      setLocationChecked(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter a café name.");
      return;
    }

    setSaving(true);
    setError(null);

    const result = await createCoffeePassportShop({
      googlePlaceId: place.googlePlaceId,
      name: trimmedName,
      city: null,
      nameSource: "user",
      locationId: resolvedLocationId,
    });

    setSaving(false);
    if (result.error || !result.shop) {
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }

    onCreated(result.shop);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <p className="font-heading text-lg font-semibold text-espresso">Add to Coffee Passport</p>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded-full p-1 text-charcoal/40 hover:bg-crema hover:text-charcoal"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex min-w-0 items-start gap-2 rounded-lg bg-crema/70 px-3 py-2.5">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-charcoal">{place.googleName}</p>
            {place.googleSecondaryText && (
              <p className="truncate text-xs text-charcoal/50">{place.googleSecondaryText}</p>
            )}
          </div>
        </div>

        <p className="mt-3 text-sm text-charcoal/60">This café isn&apos;t in Coffee Passport yet.</p>

        <form onSubmit={handleConfirm} className="mt-4 space-y-3">
          {editingName ? (
            <div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Café name"
                autoFocus
                disabled={saving}
                aria-label="Café name"
              />
              <button
                type="button"
                onClick={() => {
                  setEditingName(false);
                  setName(place.googleName);
                }}
                disabled={saving}
                className="mt-1.5 text-xs font-medium text-charcoal/50 hover:text-espresso"
              >
                Use Google&apos;s name instead
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              disabled={saving}
              className="text-xs font-medium text-charcoal/50 hover:text-espresso"
            >
              Use a different Coffee Passport name
            </button>
          )}

          {locationChecked && locationCandidates.length > 1 && resolvedLocationId === null && !locationDeclined && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-charcoal/60">Which location is this?</p>
              <div className="space-y-1.5">
                {locationCandidates.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setResolvedLocationId(loc.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm text-charcoal hover:border-espresso/40 hover:bg-crema/50"
                  >
                    <span>
                      {loc.city}
                      {loc.region ? `, ${loc.region}` : ""}, {loc.country}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setLocationDeclined(true)}
                  className="text-xs font-medium text-charcoal/40 hover:text-charcoal/70"
                >
                  None of these / not sure
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-error/10 p-3 text-sm text-error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}

          <div className="pt-1">
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Adding..." : "Add & continue"}
            </Button>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="mt-2 w-full text-center text-xs font-medium text-charcoal/50 hover:text-espresso"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
