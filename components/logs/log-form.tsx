"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, AlertCircle, MapPin as MapPinIcon, Thermometer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ShopPicker } from "@/components/logs/shop-picker";
import { DrinkPicker } from "@/components/logs/drink-picker";
import { StarRating } from "@/components/logs/star-rating";
import { PhotoUpload } from "@/components/logs/photo-upload";
import { createClient } from "@/lib/supabase/client";
import { createDrinkLog } from "@/lib/drink-logs/actions";
import { INITIAL_LOG_FORM_DATA, type LogFormData } from "@/lib/drink-logs/types";
import type { Drink, Shop, Temperature } from "@/lib/supabase/types";

interface LogFormProps {
  userId: string;
  shops: Shop[];
}

export function LogForm({ userId, shops }: LogFormProps) {
  const router = useRouter();
  const [data, setData] = useState<LogFormData>(INITIAL_LOG_FORM_DATA);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);
  const [logId] = useState(() => crypto.randomUUID());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(patch: Partial<LogFormData>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function handleSelectShop(shop: Shop) {
    setSelectedShop(shop);
    update({ shopId: shop.id, shopName: shop.name });
  }

  function handleSelectDrink(drink: Drink) {
    setSelectedDrink(drink);
    update({ drinkId: drink.id, drinkName: drink.name, beverageCategory: drink.category });
  }

  const readyToSubmit =
    data.shopId !== null &&
    data.drinkId !== null &&
    data.drinkRating !== null &&
    data.shopRating !== null;

  const priceIsValid = data.price.trim() === "" || (!Number.isNaN(Number(data.price)) && Number(data.price) >= 0 && Number(data.price) < 1000);

  async function handleSubmit() {
    if (!readyToSubmit || !priceIsValid || submitting) return;
    setSubmitting(true);
    setError(null);

    let photoPath: string | null = null;

    if (data.photoFile) {
      const supabase = createClient();
      const path = `${userId}/${logId}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("drink-photos")
        .upload(path, data.photoFile, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) {
        setError("Couldn't upload your photo. Please try again.");
        setSubmitting(false);
        return;
      }
      photoPath = path;
    }

    const result = await createDrinkLog({
      id: logId,
      shopId: data.shopId!,
      drinkId: data.drinkId!,
      drinkRating: data.drinkRating!,
      shopRating: data.shopRating!,
      caption: data.caption.trim() || null,
      photoPath,
      price: data.price.trim() ? Number(data.price) : null,
      size: data.size.trim() || null,
      temperature: data.temperature,
    });

    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
    // On success the server action redirects to /dashboard itself.
  }

  const verb = data.beverageCategory === "tea" ? "tea" : "coffee";

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-14">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 text-sm font-medium text-charcoal/50 hover:text-espresso"
      >
        &larr; Back
      </button>

      <h1 className="font-heading text-3xl font-semibold text-espresso">Log a coffee</h1>
      <p className="mt-1.5 text-charcoal/60">A few taps and it's part of your passport.</p>

      {/* SECTION 1: SHOP */}
      <section className="mt-8">
        <h2 className="mb-3 font-heading text-lg font-semibold text-espresso">Where did you go?</h2>
        <ShopPicker
          shops={shops}
          selectedShop={selectedShop}
          onSelect={handleSelectShop}
          onChange={() => {
            setSelectedShop(null);
            setSelectedDrink(null);
            update({ shopId: null, shopName: null, drinkId: null, drinkName: null });
          }}
        />
      </section>

      {/* SECTION 2: DRINK */}
      {selectedShop && (
        <section className="mt-8 animate-fade-up">
          <h2 className="mb-3 font-heading text-lg font-semibold text-espresso">What did you get?</h2>
          <DrinkPicker
            shopId={selectedShop.id}
            selectedDrink={selectedDrink}
            onSelect={handleSelectDrink}
            onChange={() => {
              setSelectedDrink(null);
              update({ drinkId: null, drinkName: null });
            }}
          />
        </section>
      )}

      {/* SECTION 3: RATINGS */}
      {selectedDrink && (
        <section className="mt-8 animate-fade-up rounded-xl border border-border bg-white p-5">
          <h2 className="mb-4 font-heading text-lg font-semibold text-espresso">How was it?</h2>
          <div className="space-y-5">
            <StarRating
              label="How was your drink?"
              value={data.drinkRating}
              onChange={(v) => update({ drinkRating: v })}
            />
            <StarRating
              label="How was the café?"
              value={data.shopRating}
              onChange={(v) => update({ shopRating: v })}
            />
          </div>

          {/* SECTION 4: OPTIONAL DETAILS */}
          <div className="mt-6 border-t border-border/60 pt-4">
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              className="flex w-full items-center justify-between text-sm font-medium text-charcoal/60 hover:text-espresso"
            >
              Add details (optional)
              <ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
            </button>

            {detailsOpen && (
              <div className="mt-4 space-y-4 animate-fade-up">
                <div>
                  <Label className="mb-1.5 block text-xs text-charcoal/60">Photo</Label>
                  <PhotoUpload
                    preview={data.photoPreview}
                    onChange={(file, preview) => update({ photoFile: file, photoPreview: preview })}
                  />
                </div>

                <div>
                  <Label htmlFor="caption" className="mb-1.5 block text-xs text-charcoal/60">
                    What made this one memorable?
                  </Label>
                  <Textarea
                    id="caption"
                    value={data.caption}
                    onChange={(e) => update({ caption: e.target.value })}
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
                        value={data.price}
                        onChange={(e) => update({ price: e.target.value })}
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
                      value={data.size}
                      onChange={(e) => update({ size: e.target.value.slice(0, 40) })}
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
                        onClick={() => update({ temperature: data.temperature === temp ? null : temp })}
                        className={`flex-1 rounded-lg border py-2 text-sm font-medium capitalize transition-colors ${
                          data.temperature === temp
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
            )}
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
            {submitting ? "Logging..." : `Log ${verb}`}
          </Button>
        </section>
      )}

      {!selectedDrink && (
        <p className="mt-8 flex items-center gap-1.5 text-xs text-charcoal/40">
          <MapPinIcon className="h-3 w-3" />
          Pick a shop and a drink to continue.
        </p>
      )}
    </div>
  );
}
