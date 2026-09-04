"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, MapPin, Thermometer, Calendar, Globe, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/logs/star-rating";
import { PhotoUpload, type PhotoSelection } from "@/components/logs/photo-upload";
import { createClient } from "@/lib/supabase/client";
import { updateDrinkLog } from "@/lib/drink-logs/actions";
import type { BeverageCategory, Temperature } from "@/lib/supabase/types";

/**
 * For a log with no explicit logged_date (never backdated), derives a
 * reasonable date-input prefill from the stored logged_at instant, using
 * the *current viewer's own live browser timezone*, not a UTC slice.
 * Intl.DateTimeFormat with no explicit timeZone option resolves to the
 * runtime's local timezone, in the browser, that's the person actually
 * looking at the edit form right now. The en-CA locale formats dates as
 * "YYYY-MM-DD", exactly what the date input needs.
 */
function deriveDisplayDate(isoInstant: string): string {
  return new Intl.DateTimeFormat("en-CA").format(new Date(isoInstant));
}

interface EditLogFormProps {
  userId: string;
  logId: string;
  shopName: string;
  shopCityState: string | null;
  drinkName: string;
  beverageCategory: BeverageCategory;
  initialPhotoSignedUrl: string | null;
  initialPhotoPositionX: number | null;
  initialPhotoPositionY: number | null;
  initial: {
    drinkRating: number;
    shopRating: number;
    caption: string;
    price: string;
    size: string;
    temperature: Temperature | null;
    /** Explicit "YYYY-MM-DD" if the log has one, null for a log that
     *  was never backdated (created via "now" before this column
     *  existed, or simply logged in the moment). */
    loggedDate: string | null;
    /** The stored logged_at instant, used only as a fallback source for
     *  deriving a display date when loggedDate is null. */
    loggedAtInstant: string;
    visibility: "public" | "private";
  };
}

export function EditLogForm({
  userId,
  logId,
  shopName,
  shopCityState,
  drinkName,
  beverageCategory,
  initialPhotoSignedUrl,
  initialPhotoPositionX,
  initialPhotoPositionY,
  initial,
}: EditLogFormProps) {
  const router = useRouter();
  const [drinkRating, setDrinkRating] = useState<number | null>(initial.drinkRating);
  const [shopRating, setShopRating] = useState<number | null>(initial.shopRating);
  const [caption, setCaption] = useState(initial.caption);
  const [price, setPrice] = useState(initial.price);
  const [size, setSize] = useState(initial.size);
  const [temperature, setTemperature] = useState<Temperature | null>(initial.temperature);
  const [visibility, setVisibility] = useState<"public" | "private">(initial.visibility);

  // The date shown to the user, prefilled from logged_date if present,
  // otherwise derived from logged_at using the current viewer's own
  // live timezone. Kept as a stable, un-mutated reference so a later
  // save can tell whether the person actually changed the date field,
  // as opposed to just resubmitting the same value the form always
  // shows.
  const originalDisplayDate = initial.loggedDate ?? deriveDisplayDate(initial.loggedAtInstant);
  const [loggedAtDate, setLoggedAtDate] = useState(originalDisplayDate);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialPhotoSignedUrl);
  const [photoPositionX, setPhotoPositionX] = useState<number>(initialPhotoPositionX ?? 50);
  const [photoPositionY, setPhotoPositionY] = useState<number>(initialPhotoPositionY ?? 50);
  const [photoRemoved, setPhotoRemoved] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceIsValid =
    price.trim() === "" || (!Number.isNaN(Number(price)) && Number(price) >= 0 && Number(price) < 1000);
  const readyToSubmit = drinkRating !== null && shopRating !== null;

  const todayLocal = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  })();

  function handlePhotoChange(selection: PhotoSelection | null) {
    if (selection === null) {
      setPhotoFile(null);
      setPhotoPreview(null);
      setPhotoPositionX(50);
      setPhotoPositionY(50);
      setPhotoRemoved(true);
      return;
    }

    // selection.file is null for a reposition-only change (see
    // PhotoUpload) — the underlying photo (new upload or the existing
    // one) stays whatever it already was, only the position moves.
    if (selection.file) {
      setPhotoFile(selection.file);
    }
    setPhotoPreview(selection.preview);
    setPhotoPositionX(selection.positionX);
    setPhotoPositionY(selection.positionY);
    setPhotoRemoved(false);
  }

  async function handleSubmit() {
    if (!readyToSubmit || !priceIsValid || submitting) return;
    setSubmitting(true);
    setError(null);

    let newPhotoPath: string | null = null;

    if (photoFile) {
      const supabase = createClient();
      const path = `${userId}/${logId}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("drink-photos")
        .upload(path, photoFile, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) {
        setError("Couldn't upload your photo. Please try again.");
        setSubmitting(false);
        return;
      }
      newPhotoPath = path;
    }

    const timeZone =
      typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;

    // Only treated as a real change if the value actually differs from
    // what was originally shown, this is what keeps an unrelated edit
    // (caption, rating, price, whatever) from silently recalculating
    // logged_at to noon and populating logged_date when the person
    // never touched the date field at all.
    const dateWasChanged = loggedAtDate !== originalDisplayDate;

    const result = await updateDrinkLog(logId, {
      drinkRating: drinkRating!,
      shopRating: shopRating!,
      caption: caption.trim() || null,
      price: price.trim() ? Number(price) : null,
      size: size.trim() || null,
      temperature,
      newPhotoPath,
      removePhoto: photoRemoved && !newPhotoPath,
      photoPositionX: photoRemoved && !newPhotoPath ? null : photoPositionX,
      photoPositionY: photoRemoved && !newPhotoPath ? null : photoPositionY,
      loggedAtDate: dateWasChanged ? loggedAtDate || null : null,
      timeZone,
      visibility,
    });

    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
    // On success the server action redirects to /dashboard.
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-14">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 text-sm font-medium text-charcoal/50 hover:text-espresso"
      >
        &larr; Back
      </button>

      <h1 className="font-heading text-3xl font-semibold text-espresso">Edit log</h1>
      <p className="mt-1.5 text-charcoal/60">Update your rating or details below.</p>

      <div className="mt-6 rounded-xl border border-border/60 bg-espresso/5 p-4">
        <p className="font-medium text-espresso">{drinkName}</p>
        <p className="flex items-center gap-1 text-xs text-charcoal/50">
          <MapPin className="h-3 w-3" />
          {shopName}
          {shopCityState ? `, ${shopCityState}` : ""}
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-wide text-charcoal/40">
          Shop and drink can&apos;t be changed after logging
        </p>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-white p-5">
        <h2 className="mb-4 font-heading text-lg font-semibold text-espresso">How was it?</h2>
        <div className="space-y-5">
          <StarRating label="How was your drink?" value={drinkRating} onChange={setDrinkRating} />
          <StarRating label="How was the café?" value={shopRating} onChange={setShopRating} />
        </div>

        <div className="mt-6 space-y-4 border-t border-border/60 pt-4">
          <div>
            <Label className="mb-1.5 block text-xs text-charcoal/60">Photo</Label>
            <PhotoUpload
              preview={photoPreview}
              positionX={photoPositionX}
              positionY={photoPositionY}
              onChange={handlePhotoChange}
            />
          </div>

          <div className="w-full min-w-0 max-w-full">
            <Label htmlFor="loggedAtDate" className="mb-1.5 flex items-center gap-1 text-xs text-charcoal/60">
              <Calendar className="h-3 w-3" />
              Date
            </Label>
            {/* The visible rounded rectangle lives on this outer div,
                not on the native input — see log-form.tsx for the full
                explanation of why that's the actual fix rather than
                another overflow-hidden patch on the bordered element
                itself. */}
            <div className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-input bg-white shadow-soft">
              <input
                id="loggedAtDate"
                type="date"
                value={loggedAtDate}
                onChange={(e) => setLoggedAtDate(e.target.value)}
                max={todayLocal}
                className="box-border w-full min-w-0 max-w-full border-0 bg-transparent px-4 py-2 text-base text-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-espresso focus-visible:ring-inset sm:text-sm"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="caption" className="mb-1.5 block text-xs text-charcoal/60">
              What made this one memorable?
            </Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Optional"
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price" className="mb-1.5 block text-xs text-charcoal/60">
                Price
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-charcoal/40">
                  $
                </span>
                <Input
                  id="price"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="4.75"
                  className="pl-6"
                />
              </div>
              {!priceIsValid && <p className="mt-1 text-xs text-error">Enter a price under $1,000.</p>}
            </div>
            <div>
              <Label htmlFor="size" className="mb-1.5 block text-xs text-charcoal/60">
                Size
              </Label>
              <Input
                id="size"
                value={size}
                onChange={(e) => setSize(e.target.value.slice(0, 40))}
                placeholder="12 oz, Grande..."
              />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-charcoal/60">
              <Thermometer className="mr-1 inline h-3 w-3" />
              Hot or iced
            </Label>
            <div className="flex gap-2">
              {(["hot", "iced"] as Temperature[]).map((temp) => (
                <button
                  key={temp}
                  type="button"
                  onClick={() => setTemperature(temperature === temp ? null : temp)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium capitalize transition-colors ${
                    temperature === temp
                      ? "border-espresso bg-espresso text-crema"
                      : "border-border bg-white text-charcoal hover:border-espresso/40"
                  }`}
                >
                  {temp}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-charcoal/60">Visibility</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  visibility === "public"
                    ? "border-espresso bg-espresso text-crema"
                    : "border-border bg-white text-charcoal hover:border-espresso/40"
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                Public
              </button>
              <button
                type="button"
                onClick={() => setVisibility("private")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  visibility === "private"
                    ? "border-espresso bg-espresso text-crema"
                    : "border-border bg-white text-charcoal hover:border-espresso/40"
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                Private
              </button>
            </div>
            <p className="mt-1.5 text-xs text-charcoal/40">
              {visibility === "public" ? "Anyone on Coffee Passport can see this" : "Only you can see this"}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-error/10 p-3 text-sm text-error">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <Button
          type="button"
          size="lg"
          className="mt-6 w-full"
          onClick={handleSubmit}
          disabled={!readyToSubmit || !priceIsValid || submitting}
        >
          {submitting ? "Saving..." : "Save changes"}
        </Button>
      </section>
    </div>
  );
}
