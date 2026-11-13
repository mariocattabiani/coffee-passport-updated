/**
 * Drink-photo size variants. Pure helpers, safe on server and client.
 *
 * Every drink photo has its full original at "<user>/<log>.jpg" (1600px
 * longest edge, unchanged) and, for photos uploaded or backfilled since
 * this existed, a lighter "card" copy beside it at "<user>/<log>.card.jpg".
 *
 * The card copy is what feeds, grids, café pages and Explore display.
 * The full original is what the full-screen photo viewer shows. Older
 * photos without a card copy simply keep using the original.
 *
 * Storage access to a card copy follows its original exactly: see
 * supabase/drink_photo_card_variant.sql (public.is_public_drink_photo).
 */

/** Longest edge of the card copy, in pixels. ~2.9x a 375pt phone card. */
export const CARD_MAX_DIMENSION = 1080;
export const CARD_JPEG_QUALITY = 0.8;

const CARD_SUFFIX = ".card.jpg";

export function isCardPath(path: string): boolean {
  return path.toLowerCase().endsWith(CARD_SUFFIX);
}

/** "<user>/<log>.jpg" -> "<user>/<log>.card.jpg" */
export function cardPathFor(path: string): string {
  if (isCardPath(path)) return path;
  return path.replace(/\.jpg$/i, CARD_SUFFIX);
}

/** "<user>/<log>.card.jpg" -> "<user>/<log>.jpg" */
export function fullPathFor(path: string): string {
  if (!isCardPath(path)) return path;
  return path.slice(0, -CARD_SUFFIX.length) + ".jpg";
}
