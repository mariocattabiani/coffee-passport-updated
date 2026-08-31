"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface PhotoLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

// Everything actually focusable inside this lightbox: the close button
// plus the image itself (tabIndex 0 below). A real focus trap only
// needs to know the first and last of these, not build a generic
// modal framework around arbitrary focusable descendants.
const FOCUSABLE_SELECTOR = 'button, [href], [tabindex]:not([tabindex="-1"])';

/**
 * Full-screen photo viewer. Deliberately built with plain React/Tailwind
 * rather than a new dependency: this is one image, shown at its original
 * aspect ratio, with a restrained backdrop and a close affordance, not a
 * gallery or carousel (that's Phase 2, once multi-photo exists).
 *
 * Reuses whatever signed URL the caller already has (`src` is passed
 * straight through from the feed/card), never re-signs on tap.
 *
 * Focus handling: the element that had focus before opening (the photo
 * trigger button) is saved and restored on close/unmount. While open,
 * Tab/Shift+Tab is kept cycling within the lightbox's own focusable
 * elements rather than escaping into the page behind it.
 */
export function PhotoLightbox({ src, alt, onClose }: PhotoLightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !dialogRef.current.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !dialogRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [onClose]);

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/90 p-4"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={onClose}
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-crema transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-crema"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
        aria-label="Close photo"
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        tabIndex={0}
        className="max-h-full max-w-full rounded-lg object-contain focus:outline-none focus:ring-2 focus:ring-crema"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
