"use client";

import { useState } from "react";
import { AlertCircle, MapPin, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCoffeePassportShop } from "@/lib/shops/actions";
import type { Shop } from "@/lib/supabase/types";

export interface ExternalPlaceContext {
  googlePlaceId: string;
  /** Google's own name, shown only as visual reference, never written
   *  into the input's initial value. */
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
 * before. Deliberately lightweight, one required field, one optional
 * field, this should never feel like database administration.
 *
 * Google's name is shown above the form purely for the person's own
 * reference/convenience, it is never pre-filled into the name input.
 * The permanent Coffee Passport name always comes from what the person
 * actually types here, that boundary is the whole point of this
 * component existing rather than just calling a save function directly
 * with Google's fields.
 */
export function AddExternalCafeDialog({ place, onCreated, onCancel }: AddExternalCafeDialogProps) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
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
      city: city.trim() || null,
      nameSource: "user",
      locationSource: city.trim() ? "user" : undefined,
    });

    setSaving(false);
    if (result.error || !result.shop) {
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }

    onCreated(result.shop);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-heading text-lg font-semibold text-espresso">Add to Coffee Passport</p>
            <p className="mt-1 text-sm text-charcoal/60">This café hasn&apos;t been added to Coffee Passport yet.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-charcoal/40 hover:bg-crema hover:text-charcoal"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-crema/70 px-3 py-2.5">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-charcoal/70">{place.googleName}</p>
            {place.googleSecondaryText && (
              <p className="truncate text-xs text-charcoal/40">{place.googleSecondaryText}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="cafe-name" className="mb-1.5 block text-xs text-charcoal/60">
              Café name
            </Label>
            <Input
              id="cafe-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call it?"
              autoFocus
              disabled={saving}
            />
          </div>

          <div>
            <Label htmlFor="cafe-city" className="mb-1.5 block text-xs text-charcoal/60">
              City <span className="text-charcoal/40">(optional)</span>
            </Label>
            <Input
              id="cafe-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              disabled={saving}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-error/10 p-3 text-sm text-error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Adding..." : "Add café"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
