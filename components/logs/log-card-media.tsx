"use client";

import { useState } from "react";

import { PhotoLightbox } from "@/components/logs/photo-lightbox";

interface LogCardMediaProps {
  photoUrl: string | null;
  alt: string;
  /** Normalized 0-100 focal position, applied as CSS object-position
   *  so every display shape (mobile's fixed height, desktop's
   *  aspect-[4/3]) crops around the same user-chosen subject instead
   *  of each ratio independently center-cropping the photo. Null
   *  (never customized, or a log from before this existed) renders as
   *  50/50 — dead center, pixel-identical to the old behavior. */
  positionX?: number | null;
  positionY?: number | null;
}

/**
 * The feed/card photo footprint — the one canonical shape used
 * everywhere a drink-log photo appears at "card" size: Discover,
 * public profiles, Passport's Coffee Trail, Dashboard's recent logs,
 * and the shop page's own-history cards, all through this one
 * component. aspect-[4/3] at every breakpoint (previously a fixed
 * 200px strip on mobile, only 4:3 from sm up) — moderately taller and
 * less panoramic than the old fixed-height treatment, without going
 * portrait: at a typical ~340-380px mobile card width that's roughly
 * 255-285px tall, noticeably more photo-forward than the old 200px
 * while staying well short of "one photo fills the screen". Desktop
 * is unchanged, since it was already 4:3 — mobile and desktop now
 * share one consistent shape instead of two different ones.
 *
 * The stored source image itself is never altered or cropped by this
 * component — object-position only shifts which part of the full
 * image is visible within this frame, the full original always opens
 * in the lightbox regardless of position.
 */
export function LogCardMedia({ photoUrl, alt, positionX, positionY }: LogCardMediaProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!photoUrl) return null;

  const objectPosition = `${positionX ?? 50}% ${positionY ?? 50}%`;

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="group relative block aspect-[4/3] w-full overflow-hidden bg-charcoal/5"
        aria-label="View full photo"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          style={{ objectPosition }}
        />
      </button>
      {lightboxOpen && <PhotoLightbox src={photoUrl} alt={alt} onClose={() => setLightboxOpen(false)} />}
    </>
  );
}
