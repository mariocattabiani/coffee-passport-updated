"use client";

import { useState } from "react";
import { AlertCircle, MapPin, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCoffeePassportShop } from "@/lib/shops/actions";
import type { Shop } from "@/lib/supabase/types";

export interface ExternalPlaceContext {
  googlePlaceId: string;
  /** Google's own name for this place, as the person just saw and
   *  selected it a moment ago. This is what "Add & continue" confirms
   *  by default — see the component doc below for why that's not the
   *  same thing as silently persisting Google's data. */
  googleName: string;
  googleSecondaryText?: string | null;
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
 * No city field: collecting city during logging is out of scope here.
 * It costs nothing to leave it null (shops.city is already nullable
 * and every other surface already handles that gracefully), and this
 * moment shouldn't ask someone trying to log a coffee to also do
 * database cleanup.
 *
 * No second Google request: place.googleName/googleSecondaryText are
 * exactly what the person already selected a moment ago, nothing here
 * re-fetches Place Details just to render this confirmation.
 */
export function AddExternalCafeDialog({ place, onCreated, onCancel }: AddExternalCafeDialogProps) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(place.googleName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
