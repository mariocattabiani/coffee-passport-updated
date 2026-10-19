"use client";

import { useState } from "react";
import { AlertCircle, MapPin, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCoffeePassportShop } from "@/lib/shops/actions";
import type { Shop } from "@/lib/supabase/types";

export interface ExternalPlaceContext {
  googlePlaceId: string;

  /**
   * Google's name for the place the person explicitly selected.
   * Coffee Passport still requires a confirmation tap before using it
   * as the permanent shop name.
   */
  googleName: string;

  /**
   * Display only. Helps the person confirm they selected the correct
   * real-world place.
   */
  googleSecondaryText?: string | null;

}

interface AddExternalCafeDialogProps {
  place: ExternalPlaceContext;
  onCreated: (shop: Shop) => void;
  onCancel: () => void;
}

/**
 * Confirmation step for a Google-discovered place Coffee Passport has
 * not stored before.
 *
 * The user confirms the Coffee Passport display name. The browser does
 * not decide or persist geography. create-google-shop independently
 * verifies the Google Place ID and owns address, city/state/country,
 * coordinates, and canonical location resolution.
 */
export function AddExternalCafeDialog({
  place,
  onCreated,
  onCancel,
}: AddExternalCafeDialogProps) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(place.googleName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm(
    e: React.FormEvent
  ) {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Please enter a café name.");
      return;
    }

    setSaving(true);
    setError(null);

    const result =
      await createCoffeePassportShop({
        googlePlaceId:
          place.googlePlaceId,
        name: trimmedName,
      });

    setSaving(false);

    if (
      result.error ||
      !result.shop
    ) {
      setError(
        result.error ??
          "Something went wrong. Please try again."
      );
      return;
    }

    onCreated(result.shop);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-external-cafe-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <p
            id="add-external-cafe-title"
            className="font-heading text-lg font-semibold text-espresso"
          >
            Add to Coffee Passport
          </p>

          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="shrink-0 rounded-full p-1 text-charcoal/40 hover:bg-crema hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cancel"
          >
            <X
              className="h-4 w-4"
              aria-hidden="true"
            />
          </button>
        </div>

        <div className="mt-4 flex min-w-0 items-start gap-2 rounded-lg bg-crema/70 px-3 py-2.5">
          <MapPin
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage"
            aria-hidden="true"
          />

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-charcoal">
              {place.googleName}
            </p>

            {place.googleSecondaryText && (
              <p className="truncate text-xs text-charcoal/50">
                {place.googleSecondaryText}
              </p>
            )}
          </div>
        </div>

        <p className="mt-3 text-sm text-charcoal/60">
          This café isn&apos;t in Coffee Passport yet.
        </p>

        <form
          onSubmit={handleConfirm}
          className="mt-4 space-y-3"
        >
          {editingName ? (
            <div>
              <Input
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
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
                  setError(null);
                }}
                disabled={saving}
                className="mt-1.5 text-xs font-medium text-charcoal/50 hover:text-espresso disabled:cursor-not-allowed disabled:opacity-50"
              >
                Use Google&apos;s name instead
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                setEditingName(true)
              }
              disabled={saving}
              className="text-xs font-medium text-charcoal/50 hover:text-espresso disabled:cursor-not-allowed disabled:opacity-50"
            >
              Use a different Coffee Passport name
            </button>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />

              <p>{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                saving ||
                !name.trim()
              }
            >
              {saving
                ? "Adding..."
                : "Add & continue"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
