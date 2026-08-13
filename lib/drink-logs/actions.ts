"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { BeverageCategory, Drink, Temperature } from "@/lib/supabase/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const UNIQUE_VIOLATION = "23505";
const VALID_RATINGS = new Set([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);
const VALID_CATEGORIES = new Set<BeverageCategory>(["coffee", "tea"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Postgres's ILIKE treats % and _ as wildcards. The name being searched
// here is user-typed text, not a pattern, so any literal % or _ in it
// needs escaping before it's used in an ILIKE filter.
function escapeForIlike(value: string) {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
function isValidRating(n: number) {
  return VALID_RATINGS.has(n);
}
function isValidPrice(n: number | null) {
  return n === null || (n >= 0 && n < 1000);
}
function isValidCaption(s: string | null) {
  return s === null || s.length <= 500;
}
function isValidSize(s: string | null) {
  return s === null || s.length <= 40;
}
function isValidTemperature(t: string | null) {
  return t === null || t === "hot" || t === "iced";
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidTimeZone(tz: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts a "YYYY-MM-DD" calendar date, as picked in someone's own
 * local timezone, into the UTC instant for local noon on that date in
 * that timezone. This is the standard technique for this conversion
 * using only the native Intl API (no date library needed): make a
 * first guess treating the numbers as UTC, ask Intl what that instant
 * actually displays as in the target timezone, then correct the guess
 * by the difference. One pass is sufficient, IANA zone offsets don't
 * change within the same instant being evaluated.
 */
function zonedDateToUtcNoon(dateOnly: string, timeZone: string): Date {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(guess);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const shownAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );

  const diff = guess.getTime() - shownAsUtc;
  return new Date(guess.getTime() + diff);
}

/**
 * Turns an optional "YYYY-MM-DD" date (as picked in the user's own
 * local calendar) plus their browser-reported IANA timezone into a
 * stored timestamptz value that displays back as that same calendar
 * date to them. Falls back to UTC if the timezone is missing or
 * unrecognized, rather than failing the whole request. Returns
 * { value: null, error: null } when no date was picked at all, meaning
 * "use now()".
 */
function resolveLoggedAt(
  dateOnly: string | null,
  timeZone: string | null
): { loggedAt: string | null; loggedDate: string | null; error: string | null } {
  if (!dateOnly) {
    return { loggedAt: null, loggedDate: null, error: null };
  }
  if (!DATE_ONLY_PATTERN.test(dateOnly)) {
    return { loggedAt: null, loggedDate: null, error: "That date doesn't look right. Please try again." };
  }

  const safeTimeZone = timeZone && isValidTimeZone(timeZone) ? timeZone : "UTC";

  let timestamp: Date;
  try {
    timestamp = zonedDateToUtcNoon(dateOnly, safeTimeZone);
  } catch {
    return { loggedAt: null, loggedDate: null, error: "That date doesn't look right. Please try again." };
  }
  if (Number.isNaN(timestamp.getTime())) {
    return { loggedAt: null, loggedDate: null, error: "That date doesn't look right. Please try again." };
  }

  // "Today" is evaluated in the same timezone the date was picked in,
  // today in Tokyo and today in New York aren't the same UTC instant,
  // and a date should only be rejected if it's truly in the future from
  // the person's own point of view. The en-CA locale formats dates as
  // YYYY-MM-DD, matching dateOnly's shape, so this is a safe string
  // comparison.
  const todayInZone = new Intl.DateTimeFormat("en-CA", { timeZone: safeTimeZone }).format(new Date());
  if (dateOnly > todayInZone) {
    return { loggedAt: null, loggedDate: null, error: "You can't log a coffee for a future date." };
  }

  // dateOnly itself, exactly as the person picked it, is what gets
  // stored as logged_date. logged_at is derived from it for sorting,
  // but logged_date is the calendar day of record, never reconstructed
  // later by slicing a UTC timestamp, which can land on the wrong day
  // for timezones several hours ahead of UTC.
  return { loggedAt: timestamp.toISOString(), loggedDate: dateOnly, error: null };
}

interface RatableFields {
  drinkRating: number;
  shopRating: number;
  caption: string | null;
  price: number | null;
  size: string | null;
  temperature: Temperature | null;
}

// Shared by both create and edit. The database's check constraints are
// the final backstop either way, this just turns a malformed request
// into a friendly message instead of a raw Postgres error.
function validateLogFields(input: RatableFields): string | null {
  if (!isValidRating(input.drinkRating) || !isValidRating(input.shopRating)) {
    return "Please choose a rating between 0.5 and 5 stars.";
  }
  if (!isValidPrice(input.price)) {
    return "Please enter a valid price under $1,000.";
  }
  if (!isValidCaption(input.caption)) {
    return "That caption is a bit too long.";
  }
  if (!isValidSize(input.size)) {
    return "That size is a bit too long.";
  }
  if (!isValidTemperature(input.temperature)) {
    return "Something went wrong with that request. Please try again.";
  }
  return null;
}

async function removePhoto(supabase: SupabaseServerClient, path: string | null) {
  if (path) {
    await supabase.storage.from("drink-photos").remove([path]);
  }
}

export interface CreateDrinkResult {
  drink?: Drink;
  error?: string;
}

/**
 * Adds a new drink to a shop's menu, or, if someone else added the exact
 * same drink (case-insensitively) moments earlier, hands back that
 * existing drink instead of failing. The database's unique index is the
 * real source of truth here, this function just makes losing that race
 * feel seamless instead of like an error.
 */
export async function createDrink(
  shopId: string,
  name: string,
  category: BeverageCategory
): Promise<CreateDrinkResult> {
  // TypeScript's type only constrains callers written in TypeScript, a
  // server action can still be invoked with an arbitrary request body,
  // so the value is checked again here at runtime.
  if (!VALID_CATEGORIES.has(category)) {
    return { error: "Please choose a valid drink category." };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Please enter a drink name." };
  }
  if (trimmed.length > 80) {
    return { error: "That name is a bit too long." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: inserted, error } = await supabase
    .from("drinks")
    .insert({ shop_id: shopId, name: trimmed, category, created_by: user.id })
    .select()
    .single<Drink>();

  if (!error && inserted) {
    return { drink: inserted };
  }

  if (error?.code === UNIQUE_VIOLATION) {
    const { data: existing } = await supabase
      .from("drinks")
      .select()
      .eq("shop_id", shopId)
      .ilike("name", escapeForIlike(trimmed))
      .maybeSingle<Drink>();

    if (existing) {
      return { drink: existing };
    }
  }

  return { error: "Couldn't add that drink. Please try again." };
}

export interface CreateDrinkLogInput extends RatableFields {
  id: string;
  shopId: string;
  drinkId: string;
  photoPath: string | null;
  /** "YYYY-MM-DD" if backdated, null to use now(). */
  loggedAtDate: string | null;
  /** IANA timezone the date above was picked in, e.g. "America/New_York". */
  timeZone: string | null;
}

export async function createDrinkLog(input: CreateDrinkLogInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!isValidUuid(input.id)) {
    return { error: "Something went wrong starting that log. Please try again." };
  }

  // The only Storage path this log is ever allowed to reference is the
  // deterministic one derived from the signed-in user and this log's
  // own id, never whatever string the browser happens to send. If a
  // client-supplied photoPath doesn't match, the request is rejected
  // outright, and nothing is deleted, an unrecognized path might not
  // even belong to this user.
  const expectedPhotoPath = `${user.id}/${input.id}.jpg`;
  let photoPath: string | null = null;
  if (input.photoPath !== null) {
    if (input.photoPath !== expectedPhotoPath) {
      return { error: "Something went wrong with that photo. Please try again." };
    }
    photoPath = expectedPhotoPath;
  }

  const validationError = validateLogFields(input);
  if (validationError) {
    await removePhoto(supabase, photoPath);
    return { error: validationError };
  }

  const { loggedAt, loggedDate, error: dateError } = resolveLoggedAt(input.loggedAtDate, input.timeZone);
  if (dateError) {
    await removePhoto(supabase, photoPath);
    return { error: dateError };
  }

  // The stored drink record is the source of truth, never the client,
  // for both its beverage category and which shop it actually belongs
  // to. A drink id that doesn't exist, or one that exists but belongs
  // to a different shop than the one submitted, is rejected here rather
  // than trusted. Postgres also enforces this pairing directly, see
  // drink_logging_schema.sql, this check exists so a bad pairing gets a
  // friendly error instead of a raw constraint violation.
  const { data: drink } = await supabase
    .from("drinks")
    .select("id, shop_id, category")
    .eq("id", input.drinkId)
    .maybeSingle<{ id: string; shop_id: string; category: BeverageCategory }>();

  if (!drink) {
    await removePhoto(supabase, photoPath);
    return { error: "That drink couldn't be found. Please pick it again." };
  }

  if (drink.shop_id !== input.shopId) {
    await removePhoto(supabase, photoPath);
    return { error: "Something went wrong with that selection. Please try again." };
  }

  const { error } = await supabase.from("drink_logs").insert({
    id: input.id,
    user_id: user.id,
    shop_id: input.shopId,
    drink_id: input.drinkId,
    beverage_category: drink.category,
    drink_rating: input.drinkRating,
    shop_rating: input.shopRating,
    caption: input.caption,
    photo_url: photoPath,
    price: input.price,
    size: input.size,
    temperature: input.temperature,
    ...(loggedAt ? { logged_at: loggedAt, logged_date: loggedDate } : {}),
  });

  if (error) {
    // The photo (if any) already made it to Storage successfully before
    // this insert ran. If the row itself failed to save, that photo is
    // now orphaned, clean it up rather than leaving it behind. RLS on
    // storage.objects also guarantees this can only ever touch this
    // same user's own folder, regardless.
    await removePhoto(supabase, photoPath);
    return { error: "Something went wrong saving your log. Please try again." };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export interface UpdateDrinkLogInput extends RatableFields {
  /** Path already uploaded to, if the user replaced or added a photo.
   *  Always the same deterministic {userId}/{logId}.jpg path, so a
   *  replacement overwrites the old file in Storage automatically. */
  newPhotoPath: string | null;
  /** True if the user removed the photo without replacing it. */
  removePhoto: boolean;
  /** "YYYY-MM-DD", always the prefilled existing value unless the user
   *  changed it, so an unrelated edit never resets logged_at to now. */
  loggedAtDate: string | null;
  timeZone: string | null;
}

export async function updateDrinkLog(logId: string, input: UpdateDrinkLogInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!isValidUuid(logId)) {
    return { error: "That log couldn't be found." };
  }

  // Same rule as create: the only path this edit is ever allowed to
  // write is the deterministic one for this user and this specific log.
  const expectedPhotoPath = `${user.id}/${logId}.jpg`;
  let newPhotoPath: string | null = null;
  if (input.newPhotoPath !== null) {
    if (input.newPhotoPath !== expectedPhotoPath) {
      return { error: "Something went wrong with that photo. Please try again." };
    }
    newPhotoPath = expectedPhotoPath;
  }

  // The database is the source of truth for what photo (if any) this
  // log currently has, never a value supplied by the browser.
  const { data: existing } = await supabase
    .from("drink_logs")
    .select("photo_url")
    .eq("id", logId)
    .eq("user_id", user.id)
    .maybeSingle<{ photo_url: string | null }>();

  if (!existing) {
    return { error: "That log couldn't be found." };
  }
  const existingPhotoPath = existing.photo_url;

  // Only a genuinely new upload with nothing previously on record counts
  // as orphaned if something fails below. If a photo already existed,
  // newPhotoPath is the exact same deterministic path as
  // existingPhotoPath, so it's not a new object, it's the row's own
  // current photo, already-committed and still legitimately pointed to
  // by the unchanged row if the update below never lands.
  async function cleanupIfOrphaned() {
    if (newPhotoPath && !existingPhotoPath) {
      await removePhoto(supabase, newPhotoPath);
    }
  }

  const validationError = validateLogFields(input);
  if (validationError) {
    await cleanupIfOrphaned();
    return { error: validationError };
  }

  const { loggedAt, loggedDate, error: dateError } = resolveLoggedAt(input.loggedAtDate, input.timeZone);
  if (dateError) {
    await cleanupIfOrphaned();
    return { error: dateError };
  }

  const updatePayload: Record<string, unknown> = {
    drink_rating: input.drinkRating,
    shop_rating: input.shopRating,
    caption: input.caption,
    price: input.price,
    size: input.size,
    temperature: input.temperature,
    updated_at: new Date().toISOString(),
  };

  // Only ever written when a real date resolved. loggedAtDate is always
  // prefilled from the log's existing value on the edit form, so this
  // is a round-trip of the same date and calendar day unless the person
  // actually changed it, never a silent reset to now().
  if (loggedAt) {
    updatePayload.logged_at = loggedAt;
    updatePayload.logged_date = loggedDate;
  }

  if (newPhotoPath) {
    updatePayload.photo_url = newPhotoPath;
  } else if (input.removePhoto) {
    updatePayload.photo_url = null;
  }

  const { error } = await supabase
    .from("drink_logs")
    .update(updatePayload)
    .eq("id", logId)
    .eq("user_id", user.id);

  if (error) {
    await cleanupIfOrphaned();
    return { error: "Something went wrong saving your changes. Please try again." };
  }

  // Only remove the old Storage object once the row itself is safely
  // updated, and only for a genuine removal. A same-path replacement
  // already overwrote the old file the moment the upload succeeded,
  // there's nothing left at the old path to separately clean up.
  if (input.removePhoto && existingPhotoPath) {
    await removePhoto(supabase, existingPhotoPath);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteDrinkLog(logId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!isValidUuid(logId)) {
    return { error: "That log couldn't be found." };
  }

  // Fetch the row first so the photo path being deleted always comes
  // from the database, never from whatever the browser happened to send.
  const { data: existing } = await supabase
    .from("drink_logs")
    .select("photo_url")
    .eq("id", logId)
    .eq("user_id", user.id)
    .maybeSingle<{ photo_url: string | null }>();

  if (!existing) {
    return { error: "That log couldn't be found." };
  }

  const { error } = await supabase
    .from("drink_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", user.id);

  if (error) {
    return { error: "Something went wrong deleting that log. Please try again." };
  }

  // Best-effort: the log row is already gone either way, and RLS
  // guarantees this can only ever remove this same user's own file.
  await removePhoto(supabase, existing.photo_url);

  revalidatePath("/dashboard");
  return { success: true };
}
