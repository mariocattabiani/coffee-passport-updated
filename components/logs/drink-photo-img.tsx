"use client";

import { useEffect, useState, type ImgHTMLAttributes } from "react";

import { resignDrinkPhoto } from "@/lib/storage/resign-photo";

type DrinkPhotoImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & {
  src: string | null | undefined;
};

const SIGNED_PATH_MARKER = "/storage/v1/object/sign/drink-photos/";

/** Pulls "<user>/<file>.jpg" back out of a Supabase signed URL. */
function storagePathFromSignedUrl(url: string): string | null {
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

/**
 * The one <img> used for drink photos (never avatars, which live in the
 * public bucket and already cache correctly).
 *
 * 1. loading="lazy" + decoding="async" by default, so photos below the
 *    fold are not downloaded until the viewer actually scrolls near
 *    them. This is the bandwidth fix; callers can still pass
 *    loading="eager" where an image must load immediately.
 *
 * 2. Expired-link recovery. Public-surface signed URLs live 5 minutes.
 *    With lazy loading, an image first requested more than 5 minutes
 *    after the page rendered would otherwise show as broken. On error,
 *    this asks the server for ONE fresh URL (under the viewer's own
 *    session, so Storage policies still decide) and retries once. If
 *    the post has gone private or been deleted, the server refuses and
 *    the image is hidden instead of retried. Never loops.
 */
export function DrinkPhotoImg({ src, loading = "lazy", decoding = "async", alt = "", ...rest }: DrinkPhotoImgProps) {
  const [currentSrc, setCurrentSrc] = useState(src ?? null);
  const [retried, setRetried] = useState(false);
  const [failed, setFailed] = useState(false);

  // A new src from the parent (new page data) resets recovery state.
  useEffect(() => {
    setCurrentSrc(src ?? null);
    setRetried(false);
    setFailed(false);
  }, [src]);

  async function handleError() {
    if (retried || !currentSrc) {
      setFailed(true);
      return;
    }
    setRetried(true);
    const path = storagePathFromSignedUrl(currentSrc);
    const fresh = path ? await resignDrinkPhoto(path).catch(() => null) : null;
    if (fresh) {
      setCurrentSrc(fresh);
    } else {
      setFailed(true);
    }
  }

  if (!currentSrc || failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...rest} src={currentSrc} alt={alt} loading={loading} decoding={decoding} onError={handleError} />
  );
}
