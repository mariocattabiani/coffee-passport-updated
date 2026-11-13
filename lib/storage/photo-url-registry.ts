/**
 * Browser-only memory of drink-photo links this tab has ALREADY
 * downloaded successfully, keyed by Storage path ("<user>/<file>.jpg").
 *
 * WHY: every server render signs photos again, and each new signature is
 * a new URL, so the browser treats the same photo as a brand-new file and
 * downloads it again. When a page renders a photo whose path this tab
 * already downloaded under a still-valid link, DrinkPhotoImg reuses that
 * earlier link, so the browser can serve it from its own cache.
 *
 * PRIVACY: this never decides what a viewer may see. A link is only
 * reused for a path the server JUST rendered for this viewer under the
 * existing Storage policies. A post that went private or was deleted is
 * no longer rendered, so its path is never looked up. Entries also stop
 * being used shortly before their own token expires.
 *
 * Lives in one browser tab's memory only: nothing is persisted, shared
 * between users, or sent anywhere. A full page reload starts empty.
 */

const SIGNED_PATH_MARKER = "/storage/v1/object/sign/drink-photos/";
const MAX_ENTRIES = 500;
// Stop reusing a link this long before its token expires.
const SAFETY_MARGIN_MS = 15_000;

type Entry = { url: string; expiresAt: number };
const registry = new Map<string, Entry>();

/** "<user>/<file>.jpg" from a Supabase signed URL, or null. */
export function storagePathFromSignedUrl(url: string): string | null {
  const start = url.indexOf(SIGNED_PATH_MARKER);
  if (start === -1) return null;
  const rest = url.slice(start + SIGNED_PATH_MARKER.length);
  const end = rest.indexOf("?");
  try {
    return decodeURIComponent(end === -1 ? rest : rest.slice(0, end));
  } catch {
    return null;
  }
}

/** Expiry (ms since epoch) from the signed URL's token, or null. */
function tokenExpiry(url: string): number | null {
  try {
    const token = new URL(url).searchParams.get("token");
    const payload = token?.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const exp = JSON.parse(atob(padded))?.exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * The link to actually render for `url`: an earlier, still-valid link
 * for the same photo if this tab already downloaded one, else `url`.
 */
export function resolvePhotoUrl(url: string): string {
  const path = storagePathFromSignedUrl(url);
  if (!path) return url;
  const hit = registry.get(path);
  if (!hit) return url;
  if (hit.expiresAt - SAFETY_MARGIN_MS <= Date.now()) {
    registry.delete(path);
    return url;
  }
  return hit.url;
}

/** Call after a photo has downloaded and displayed successfully. */
export function rememberPhotoUrl(url: string): void {
  const path = storagePathFromSignedUrl(url);
  const expiresAt = tokenExpiry(url);
  if (!path || !expiresAt || expiresAt - SAFETY_MARGIN_MS <= Date.now()) return;
  const existing = registry.get(path);
  // Keep the link the browser already cached; never churn to a newer one.
  if (existing && existing.expiresAt - SAFETY_MARGIN_MS > Date.now()) return;
  registry.delete(path);
  registry.set(path, { url, expiresAt });
  while (registry.size > MAX_ENTRIES) {
    const oldest = registry.keys().next().value;
    if (oldest === undefined) break;
    registry.delete(oldest);
  }
}

/** Call when a link stopped working, so it is never reused. */
export function forgetPhotoUrl(url: string): void {
  const path = storagePathFromSignedUrl(url);
  if (path && registry.get(path)?.url === url) registry.delete(path);
}

/** A still-valid, already-downloaded link for this exact path, if any. */
export function lookupPhotoUrl(path: string): string | null {
  const hit = registry.get(path);
  if (!hit) return null;
  if (hit.expiresAt - SAFETY_MARGIN_MS <= Date.now()) {
    registry.delete(path);
    return null;
  }
  return hit.url;
}
