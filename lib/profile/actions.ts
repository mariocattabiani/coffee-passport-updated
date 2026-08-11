"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const UNIQUE_VIOLATION = "23505";
const MIN_USERNAME_LENGTH = 3;
const MAX_NAME_LENGTH = 50;
const MAX_LOCATION_LENGTH = 50;
const MAX_BIO_LENGTH = 160;

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  username: string;
  city: string;
  state: string;
  bio: string;
  /** Storage object path the client already uploaded to this save, if
   *  any, e.g. "{userId}/{timestamp}-{filename}". Never a full URL: the
   *  server derives the public URL itself once this path is verified to
   *  belong to the authenticated user. */
  newAvatarPath: string | null;
}

function validateProfileFields(input: {
  firstName: string;
  lastName: string;
  username: string;
  city: string;
  state: string;
  bio: string;
}): string | null {
  if (!input.firstName) return "Please enter a first name.";
  if (input.firstName.length > MAX_NAME_LENGTH) return "First name is too long.";
  if (input.lastName.length > MAX_NAME_LENGTH) return "Last name is too long.";
  // Same rule as onboarding: at least 3 characters, real-time database
  // uniqueness check on the client, no character-set restriction that
  // wasn't already there.
  if (input.username.length < MIN_USERNAME_LENGTH) {
    return `Username must be at least ${MIN_USERNAME_LENGTH} characters.`;
  }
  if (!input.city) return "Please enter a city.";
  if (input.city.length > MAX_LOCATION_LENGTH) return "City is too long.";
  if (!input.state) return "Please enter a state.";
  if (input.state.length > MAX_LOCATION_LENGTH) return "State is too long.";
  if (input.bio.length > MAX_BIO_LENGTH) return "Bio is too long.";
  return null;
}

/** A Storage path is only ever trusted for this user if it actually
 *  lives inside their own folder. */
function isOwnedAvatarPath(path: string, userId: string): boolean {
  return path.startsWith(`${userId}/`);
}

/**
 * Avatar URLs are always Supabase's own generated public URL shape:
 * ".../object/public/avatars/<path>". This only ever runs on a URL
 * fetched from the database (the user's own profile row), never a
 * client-supplied value. The extracted path is additionally required to
 * belong to this same user's folder, if it doesn't, or the URL doesn't
 * match the expected shape at all, this returns null and the caller
 * skips cleanup rather than guessing.
 */
function extractOwnedAvatarPath(avatarUrl: string | null, userId: string): string | null {
  if (!avatarUrl) return null;
  const marker = "/object/public/avatars/";
  const idx = avatarUrl.indexOf(marker);
  if (idx === -1) return null;
  const path = avatarUrl.slice(idx + marker.length);
  if (!path || !isOwnedAvatarPath(path, userId)) return null;
  return path;
}

async function removeAvatarObject(supabase: SupabaseServerClient, path: string | null) {
  if (!path) return;
  await supabase.storage.from("avatars").remove([path]);
}

export async function updateProfile(input: UpdateProfileInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The only Storage path this save is ever allowed to reference is one
  // inside the authenticated user's own folder. A path that fails this
  // check is rejected outright here, before anything else runs, and is
  // never passed to a Storage delete call, an unverified path might not
  // even belong to this user.
  if (input.newAvatarPath !== null && !isOwnedAvatarPath(input.newAvatarPath, user.id)) {
    return { error: "Something went wrong with that photo. Please try again." };
  }
  const newAvatarPath = input.newAvatarPath;

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const username = input.username.trim();
  const city = input.city.trim();
  const state = input.state.trim();
  const bio = input.bio.trim();

  const validationError = validateProfileFields({ firstName, lastName, username, city, state, bio });
  if (validationError) {
    // The new photo (if any) already uploaded successfully, and its
    // path already passed the ownership check above, before this
    // action ran. If the rest of the form fails validation, that
    // upload is orphaned, clean it up.
    await removeAvatarObject(supabase, newAvatarPath);
    return { error: validationError };
  }

  // The database is the source of truth for the current avatar, fetched
  // fresh right here, never trusted from the browser. The extracted
  // path is also re-verified to belong to this user before it's ever
  // considered for deletion.
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single<{ avatar_url: string | null }>();

  const previousAvatarPath = extractOwnedAvatarPath(existingProfile?.avatar_url ?? null, user.id);

  const updatePayload: Record<string, unknown> = {
    first_name: firstName,
    last_name: lastName || null,
    username,
    city,
    state,
    bio: bio || null,
    updated_at: new Date().toISOString(),
  };

  if (newAvatarPath) {
    // The server generates the public URL itself from the verified
    // path. The database never receives a URL chosen by the browser.
    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(newAvatarPath);
    updatePayload.avatar_url = publicUrlData.publicUrl;
  }

  const { error } = await supabase.from("profiles").update(updatePayload).eq("id", user.id);

  if (error) {
    // The row update itself failed, the new upload (if any) is now
    // orphaned, clean it up and leave the previous avatar and database
    // value exactly as they were.
    await removeAvatarObject(supabase, newAvatarPath);

    if (error.code === UNIQUE_VIOLATION) {
      return { error: "That username was just taken. Please choose another." };
    }
    return { error: "Something went wrong saving your profile. Please try again." };
  }

  // Only now, after the row update has actually succeeded, remove the
  // previous avatar: only if a new one really replaced it, only using
  // the path already re-verified as this user's own, and never if it
  // happens to be the exact same path as the one just saved.
  if (newAvatarPath && previousAvatarPath && previousAvatarPath !== newAvatarPath) {
    await removeAvatarObject(supabase, previousAvatarPath);
  }

  revalidatePath("/passport");
  redirect("/passport");
}
