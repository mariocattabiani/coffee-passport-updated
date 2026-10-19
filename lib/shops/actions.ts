"use server";

import { createClient } from "@/lib/supabase/server";
import type { Shop } from "@/lib/supabase/types";

const MAX_PLACE_ID_LENGTH = 255;
const MAX_NAME_LENGTH = 120;

/**
 * Pure lookup, no side effects, no creation. Used first, always,
 * before ever considering creating a shop: if a Google-discovered café
 * is already in Coffee Passport, we open the existing record, we never
 * create a second one.
 */
export async function findShopByGooglePlaceId(googlePlaceId: string): Promise<Shop | null> {
  const placeId = googlePlaceId.trim();
  if (!placeId) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("shops").select("*").eq("google_place_id", placeId).maybeSingle<Shop>();

  return data ?? null;
}

export interface CreateCoffeePassportShopInput {
  googlePlaceId: string;

  /**
   * Coffee Passport's user-confirmed permanent display name.
   *
   * The browser never supplies physical geography here. Google place
   * verification, address normalization, coordinates, and canonical
   * location resolution are all owned by create-google-shop.
   */
  name: string;
}

export interface CreateCoffeePassportShopResult {
  shop?: Shop;
  error?: string;
}

/**
 * Website adapter for Coffee Passport's authoritative Google-backed
 * shop creation pipeline.
 *
 * Web and native intentionally use the same Supabase Edge Function.
 * The client confirms only the Google Place ID and Coffee Passport
 * display name. The backend independently verifies the place with
 * Google and owns all geographic persistence.
 */
export async function createCoffeePassportShop(
  input: CreateCoffeePassportShopInput
): Promise<CreateCoffeePassportShopResult> {
  const googlePlaceId = input.googlePlaceId.trim();
  const name = input.name.trim();

  if (!googlePlaceId) {
    return {
      error: "Missing place information. Please try again.",
    };
  }

  if (googlePlaceId.length > MAX_PLACE_ID_LENGTH) {
    return {
      error:
        "Something went wrong with that selection. Please try again.",
    };
  }

  if (!name) {
    return {
      error: "Please enter a café name.",
    };
  }

  if (name.length > MAX_NAME_LENGTH) {
    return {
      error: "That name is too long.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Please log in and try again.",
    };
  }

  /*
   * This server action runs on Next.js, not in the browser.
   * Explicitly forward the current user's Supabase access token to
   * create-google-shop so the Edge Function can independently verify
   * the caller.
   */
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (
    sessionError ||
    !session?.access_token
  ) {
    console.error(
      "createCoffeePassportShop session unavailable:",
      sessionError?.message ?? "no access token"
    );

    return {
      error: "Please log in and try again.",
    };
  }

  const { data, error } =
    await supabase.functions.invoke(
      "create-google-shop",
      {
        body: {
          googlePlaceId,
          confirmedName: name,
        },
        headers: {
          Authorization:
            `Bearer ${session.access_token}`,
        },
      }
    );

  if (error) {
    let functionErrorBody: unknown = null;
    let functionStatus: number | null = null;

    try {
      const context =
        "context" in error
          ? (error as { context?: Response }).context
          : undefined;

      if (context) {
        functionStatus = context.status;

        const cloned = context.clone();

        try {
          functionErrorBody = await cloned.json();
        } catch {
          functionErrorBody = await context.text();
        }
      }
    } catch (contextError) {
      console.error(
        "Could not read create-google-shop error response:",
        contextError
      );
    }

    console.error(
      "create-google-shop invocation failed:",
      {
        message: error.message,
        status: functionStatus,
        body: functionErrorBody,
      }
    );

    const serverMessage =
      functionErrorBody &&
      typeof functionErrorBody === "object" &&
      "error" in functionErrorBody &&
      typeof (functionErrorBody as { error?: unknown }).error === "string"
        ? (functionErrorBody as { error: string }).error
        : null;

    return {
      error:
        serverMessage ??
        "Something went wrong saving that café. Please try again.",
    };
  }

  if (
    !data?.success ||
    !data?.shop
  ) {
    return {
      error:
        data?.error ??
        "Something went wrong saving that café. Please try again.",
    };
  }

  return {
    shop: data.shop as Shop,
  };
}

