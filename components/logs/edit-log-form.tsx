"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, MapPin, Thermometer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/logs/star-rating";
import { PhotoUpload } from "@/components/logs/photo-upload";
import { createClient } from "@/lib/supabase/client";
import { updateDrinkLog } from "@/lib/drink-logs/actions";
import type { BeverageCategory, Temperature } from "@/lib/supabase/types";

interface EditLogFormProps {
  userId: string;
  logId: string;
  shopName: string;
  shopCityState: string | null;
  drinkName: string;
  beverageCategory: BeverageCategory;
  initialPhotoSignedUrl: string | null;
  initial: {
    drinkRating: number;
    shopRating: number;
    caption: string;
    price: string;
    size: string;
    temperature: Temperature | null;
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
  initial,
}: EditLogFormProps) {
  const router = useRouter();
  const [drinkRating, setDrinkRating] = useState<number | null>(initial.drinkRating);
  const [shopRating, setShopRating] = useState<number | null>(initial.shopRating);
  const [caption, setCaption] = useState(initial.caption);
  const [price, setPrice] = useState(initial.price);
  const [size, setSize] = useState(initial.size);
  const [temperature, setTemperature] = useState<Temperature | null>(initial.temperature);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialPhotoSignedUrl);
  const [photoRemoved, setPhotoRemoved] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceIsValid =
    price.trim() === "" || (!Number.isNaN(Number(price)) && Number(price) >= 0 && Number(price) < 1000);
  const readyToSubmit = drinkRating !== null && shopRating !== null;

  function handlePhotoChange(file: File | null, preview: string | null) {
    setPhotoFile(file);
    setPhotoPreview(preview);
    setPhotoRemoved(file === null && preview === null);
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

    const result = await updateDrinkLog(logId, {
      drinkRating: drinkRating!,
      shopRating: shopRating!,
      caption: caption.trim() || null,
      price: price.trim() ? Number(price) : null,
      size: size.trim() || null,
      temperature,
      newPhotoPath,
      removePhoto: photoRemoved && !newPhotoPath,
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
          Shop and drink can't be changed after logging
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
            <PhotoUpload preview={photoPreview} onChange={handlePhotoChange} />
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
