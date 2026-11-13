"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

import { resignDrinkPhoto } from "@/lib/storage/resign-photo";
import { fullPathFor, isCardPath } from "@/lib/storage/photo-variants";
import {
  forgetPhotoUrl,
  rememberPhotoUrl,
  resolvePhotoUrl,
  storagePathFromSignedUrl,
} from "@/lib/storage/photo-url-registry";

type DrinkPhotoImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & {
  src: string | null | undefined;
};

/**
 * The one <img> used for drink photos (never avatars, which live in the
 * public bucket and already cache correctly).
 *
 * 1. loading="lazy" + decoding="async" by default, so photos below the
 *    fold are not downloaded until the viewer scrolls near them.
 *
 * 2. Reuse of already-downloaded links (lib/storage/photo-url-registry).
 *    Every server render signs photos again with a NEW link, which the
 *    browser would download again in full. If this tab already displayed
 *    the same photo under a still-valid link, that earlier link is used
 *    instead, so the browser serves it from its cache. The choice is made
 *    in the useState initializer, i.e. while React is building the element,
 *    BEFORE the <img> exists in the page, so the new link is never
 *    requested. (On a full page load the registry is empty, so the
 *    server-rendered link is used and hydration matches.)
 *
 * 3. Recovery, never looping:
 *      reused link fails  -> fall back to the fresh link from the server
 *      fresh link fails   -> ask the server to re-sign it once (viewer's
 *                            own session, Storage policies still decide)
 *      card copy fails    -> also try the full original once
 *      all refused        -> hide the image (e.g. post went private)
 */
export function DrinkPhotoImg({
  src,
  loading = "lazy",
  decoding = "async",
  alt = "",
  onLoad,
  ...rest
}: DrinkPhotoImgProps) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(() => (src ? resolvePhotoUrl(src) : null));
  const [triedServerLink, setTriedServerLink] = useState(false);
  // Storage paths already re-signed for this element; each at most once.
  const resignedPaths = useRef(new Set<string>());
  const [failed, setFailed] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);

  // Photos from a full page load can finish downloading before React
  // attaches onLoad, so that event is never seen. Remember any photo
  // that is already fully loaded when this element mounts or changes.
  useEffect(() => {
    const el = imgRef.current;
    if (el && currentSrc && el.complete && el.naturalWidth > 0) {
      rememberPhotoUrl(currentSrc);
    }
  }, [currentSrc]);

  // A genuinely NEW src from the parent (not the first mount) restarts
  // the process. The ref check keeps this from running on mount, which
  // would otherwise swap a reused link back to the new one.
  const lastPropSrc = useRef(src);
  useEffect(() => {
    if (lastPropSrc.current === src) return;
    lastPropSrc.current = src;
    setCurrentSrc(src ? resolvePhotoUrl(src) : null);
    setTriedServerLink(false);
    resignedPaths.current = new Set();
    setFailed(false);
  }, [src]);

  async function handleError() {
    if (!currentSrc) {
      setFailed(true);
      return;
    }
    forgetPhotoUrl(currentSrc);

    if (src && currentSrc !== src && !triedServerLink) {
      setTriedServerLink(true);
      setCurrentSrc(src);
      return;
    }

    const path = storagePathFromSignedUrl(currentSrc);
    if (!path) {
      setFailed(true);
      return;
    }

    // Re-sign the same photo once; for a lighter card copy, then also try
    // its full original once (covers an expired link AND a card copy that
    // is missing or broken). Every path is tried at most once, so this
    // always terminates.
    const candidates = isCardPath(path) ? [path, fullPathFor(path)] : [path];
    for (const candidate of candidates) {
      if (resignedPaths.current.has(candidate)) continue;
      resignedPaths.current.add(candidate);
      const fresh = await resignDrinkPhoto(candidate).catch(() => null);
      if (fresh) {
        setCurrentSrc(fresh);
        return;
      }
    }
    setFailed(true);
  }

  if (!currentSrc || failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      loading={loading}
      decoding={decoding}
      onLoad={(event) => {
        rememberPhotoUrl(currentSrc);
        onLoad?.(event);
      }}
      onError={handleError}
    />
  );
}
