"use client";

import { useRef } from "react";
import { Camera, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WizardData } from "@/lib/onboarding/types";

interface StepProfileProps {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// Mock validation only — checks against a small blocklist rather than a
// real database lookup. Real-time username availability is a later sprint.
const TAKEN_USERNAMES = ["admin", "coffee", "test", "mario"];

export function StepProfile({ data, update, onNext, onBack }: StepProfileProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const usernameTaken =
    data.username.length > 0 &&
    TAKEN_USERNAMES.includes(data.username.trim().toLowerCase());

  const canContinue =
    data.firstName.trim().length > 0 &&
    data.username.trim().length >= 3 &&
    !usernameTaken &&
    data.city.trim().length > 0 &&
    data.state.trim().length > 0;

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    update({ avatarFile: file, avatarPreview: URL.createObjectURL(file) });
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
        <Input id="username" value={data.username} onChange={(e) => update({ username: e.target.value })} placeholder="jamierivera" required />
        {usernameTaken && <p className="text-xs text-error">That username is taken — try another.</p>}
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
    </div>
  );
}
