"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, User, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvatarCropper } from "@/components/onboarding/avatar-cropper";
import { createClient } from "@/lib/supabase/client";
import type { WizardData } from "@/lib/onboarding/types";

interface StepProfileProps {
  userId: string;
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "error";

const DEBOUNCE_MS = 450;
const MIN_USERNAME_LENGTH = 3;

export function StepProfile({ userId, data, update, onNext, onBack }: StepProfileProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");

  // Checks the username against the database, but only after the person
  // has paused typing for a moment and typed at least a few characters,
  // so we're not sending a request on every keystroke.
  useEffect(() => {
    const trimmed = data.username.trim();

    if (trimmed.length < MIN_USERNAME_LENGTH) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");

    const timeout = setTimeout(async () => {
      const supabase = createClient();
      const { data: taken, error } = await supabase.rpc("is_username_taken", {
        check_username: trimmed,
        exclude_id: userId,
      });

      if (error) {
        setUsernameStatus("error");
        return;
      }
      setUsernameStatus(taken ? "taken" : "available");
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [data.username, userId]);

  const canContinue =
    data.firstName.trim().length > 0 &&
    usernameStatus === "available" &&
    data.city.trim().length > 0 &&
    data.state.trim().length > 0;

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Open the crop dialog with the raw photo. Nothing is saved to the
    // wizard's state until the user applies a crop, so onboarding is
    // unaffected if they back out here.
    setCropSrc(URL.createObjectURL(file));
    e.target.value = "";
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  function handleCropSave(file: File, previewUrl: string) {
    update({ avatarFile: file, avatarPreview: previewUrl });
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-semibold text-espresso">Create your profile</h2>
      <p className="mt-1.5 text-sm text-charcoal/60">This is what other coffee lovers will see.</p>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-latte/30 ring-2 ring-white"
        >
          {data.avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.avatarPreview} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-6 w-6 text-espresso/50" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-espresso/0 transition-colors group-hover:bg-espresso/40">
            <Camera className="h-4 w-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </button>
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            {data.avatarPreview ? "Change photo" : "Add photo (optional)"}
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" value={data.firstName} onChange={(e) => update({ firstName: e.target.value })} placeholder="Jamie" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last name (optional)</Label>
          <Input id="lastName" value={data.lastName} onChange={(e) => update({ lastName: e.target.value })} placeholder="Rivera" />
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <Input
            id="username"
            value={data.username}
            onChange={(e) => update({ username: e.target.value })}
            placeholder="jamierivera"
            required
            className="pr-10"
          />
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            {usernameStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-charcoal/30" />}
            {usernameStatus === "available" && <Check className="h-4 w-4 text-sage" />}
          </div>
        </div>
        {usernameStatus === "taken" && (
          <p className="text-xs text-error">Username already taken.</p>
        )}
        {usernameStatus === "error" && (
          <p className="text-xs text-error">Couldn&apos;t check that username, try again.</p>
        )}
        {data.username.trim().length > 0 && data.username.trim().length < MIN_USERNAME_LENGTH && (
          <p className="text-xs text-charcoal/40">Username must be at least {MIN_USERNAME_LENGTH} characters.</p>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" value={data.city} onChange={(e) => update({ city: e.target.value })} placeholder="Austin" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">State</Label>
          <Input id="state" value={data.state} onChange={(e) => update({ state: e.target.value })} placeholder="TX" required />
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="bio">Short bio (optional)</Label>
        <Textarea id="bio" value={data.bio} onChange={(e) => update({ bio: e.target.value })} placeholder="Oat milk cortado, always." maxLength={160} />
      </div>

      <div className="mt-8 flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onNext} disabled={!canContinue}>
          Continue
        </Button>
      </div>

      {cropSrc && (
        <AvatarCropper imageSrc={cropSrc} onCancel={handleCropCancel} onSave={handleCropSave} />
      )}
    </div>
  );
}
