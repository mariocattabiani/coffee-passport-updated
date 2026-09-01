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
 * The feed/card photo footprint. Mobile keeps the approved fixed
 * 200px height unchanged. Desktop switches from a second fixed height
 * to a proportional aspect-[4/3]: a fixed height across the masonry's
 * genuinely variable column widths (roughly 320px at 3 columns up to
 * ~490px+ at 2 columns, or wider still on a public profile) produces
 * an inconsistent, often very letterboxed crop — a 490px-wide photo
 * at a flat 220px tall is over 2:1, distinctly panoramic regardless of
 * the source photo's own composition. aspect-[4/3] scales sensibly
 * with whatever column width it lands in instead.
 *
 * The stored source image itself is never altered or cropped by this
 * component — object-position only shifts which part of the full
 * image is visible within whatever frame this renders at, the full
 * original always opens in the lightbox regardless of position.
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
        className="group relative block h-[200px] w-full overflow-hidden bg-charcoal/5 sm:h-auto sm:aspect-[4/3]"
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
