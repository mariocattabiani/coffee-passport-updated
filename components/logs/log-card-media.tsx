"use client";

import { useState } from "react";

import { PhotoLightbox } from "@/components/logs/photo-lightbox";

interface LogCardMediaProps {
  photoUrl: string | null;
  alt: string;
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
 * with whatever column width it lands in instead. This is presentation
 * only either way, the stored source image is never altered or
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
        className="group relative block h-[200px] w-full overflow-hidden bg-charcoal/5 sm:h-auto sm:aspect-[4/3]"
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
