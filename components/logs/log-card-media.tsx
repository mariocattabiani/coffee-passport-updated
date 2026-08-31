"use client";

import { useState } from "react";

import { PhotoLightbox } from "@/components/logs/photo-lightbox";

interface LogCardMediaProps {
  photoUrl: string | null;
  alt: string;
}

/**
 * The feed/card photo footprint. A fixed height (not aspect-ratio)
 * gives direct control over exactly how much vertical space a photo
 * takes at each breakpoint, independent of the source image's own
 * proportions: ~170px on mobile, ~200px from sm and up. This is
 * presentation only, the stored source image is never altered or
 * cropped, the full original always opens in the lightbox.
 */
export function LogCardMedia({ photoUrl, alt }: LogCardMediaProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!photoUrl) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="group relative block h-[170px] w-full overflow-hidden bg-charcoal/5 sm:h-[200px]"
        aria-label="View full photo"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
        />
      </button>
      {lightboxOpen && <PhotoLightbox src={photoUrl} alt={alt} onClose={() => setLightboxOpen(false)} />}
    </>
  );
}
