"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, User, Check, Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvatarCropper } from "@/components/onboarding/avatar-cropper";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/profile/actions";

interface EditProfileFormProps {
  userId: string;
  initial: {
    firstName: string;
    lastName: string;
    username: string;
    city: string;
    state: string;
    bio: string;
    avatarUrl: string | null;
  };
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "error";

const DEBOUNCE_MS = 450;
const MIN_USERNAME_LENGTH = 3;

export function EditProfileForm({ userId, initial }: EditProfileFormProps) {
  const router = useRouter();

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [username, setUsername] = useState(initial.username);
  const [city, setCity] = useState(initial.city);
  const [state, setState] = useState(initial.state);
  const [bio, setBio] = useState(initial.bio);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initial.avatarUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Same real, database-backed check onboarding uses, kept local to
  // this form rather than extracted into a shared module for this
  // sprint. Skips the check entirely if the username hasn't actually
  // changed, so the person is never told their own current username is
  // taken.
  useEffect(() => {
    const trimmed = username.trim();

    if (trimmed.toLowerCase() === initial.username.trim().toLowerCase()) {
      setUsernameStatus("idle");
      return;
    }
    if (trimmed.length < MIN_USERNAME_LENGTH) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");

    const timeout = setTimeout(async () => {
      const supabase = createClient();
      const { data: taken, error: rpcError } = await supabase.rpc("is_username_taken", {
        check_username: trimmed,
        exclude_id: userId,
      });

      if (rpcError) {
        setUsernameStatus("error");
        return;
      }
      setUsernameStatus(taken ? "taken" : "available");
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [username, userId, initial.username]);

  const usernameUnchanged = username.trim().toLowerCase() === initial.username.trim().toLowerCase();
  const usernameValid = usernameUnchanged || usernameStatus === "available";

  const canSave =
    firstName.trim().length > 0 &&
    usernameValid &&
    city.trim().length > 0 &&
    state.trim().length > 0 &&
    !submitting;

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
    e.target.value = "";
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  function handleCropSave(file: File, previewUrl: string) {
    setAvatarFile(file);
    setAvatarPreview(previewUrl);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  async function handleSubmit() {
    if (!canSave) return;
    setSubmitting(true);
    setError(null);

    let newAvatarPath: string | null = null;

    if (avatarFile) {
      try {
        const supabase = createClient();
        const path = `${userId}/${Date.now()}-${avatarFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });

        if (uploadError) {
          setError("Couldn't upload your photo. Please try again.");
          setSubmitting(false);
          return;
        }
        newAvatarPath = path;
      } catch {
        setError("Couldn't upload your photo. Please try again.");
        setSubmitting(false);
        return;
      }
    }

    const result = await updateProfile({
      firstName,
      lastName,
      username,
      city,
      state,
      bio,
      newAvatarPath,
    });

    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
    // On success the server action redirects to /passport.
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
      <h1 className="font-heading text-2xl font-semibold text-espresso">Edit profile</h1>
      <p className="mt-1.5 text-sm text-charcoal/60">Keep your Coffee Passport up to date.</p>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-latte/30 ring-2 ring-white"
        >
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-8 w-8 text-espresso/50" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-espresso/0 transition-colors group-hover:bg-espresso/40">
            <Camera className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </button>
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            {avatarPreview ? "Change photo" : "Add photo"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last name (optional)</Label>
          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="pr-10"
          />
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            {usernameStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-charcoal/30" />}
            {usernameStatus === "available" && <Check className="h-4 w-4 text-sage" />}
          </div>
        </div>
        {usernameStatus === "taken" && <p className="text-xs text-error">Username already taken.</p>}
        {usernameStatus === "error" && (
          <p className="text-xs text-error">Couldn&apos;t check that username, try again.</p>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">State</Label>
          <Input id="state" value={state} onChange={(e) => setState(e.target.value)} required />
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} />
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-error/10 p-3 text-sm text-error">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <Button type="button" variant="ghost" onClick={() => router.push("/passport")} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!canSave}>
          {submitting ? "Saving..." : "Save changes"}
        </Button>
      </div>

      {cropSrc && (
        <AvatarCropper imageSrc={cropSrc} onCancel={handleCropCancel} onSave={handleCropSave} />
      )}
    </div>
  );
}
