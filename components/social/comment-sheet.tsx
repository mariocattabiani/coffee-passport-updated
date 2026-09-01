"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import { CommentSection } from "@/components/social/comment-section";

interface CommentSheetProps {
  logId: string;
  currentUserId: string;
  ownerUserId: string;
  drinkName: string;
  shopName: string;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

// Everything actually focusable inside this sheet: the close button,
// the "View post" link, and whatever CommentSection itself renders
// (the comment input, its Send button, and each comment's delete
// button once loaded) — the same minimal-selector approach already
// used in PhotoLightbox, not a generic modal framework.
const FOCUSABLE_SELECTOR = 'button, [href], input, [tabindex]:not([tabindex="-1"])';

/**
 * Mobile: a bottom sheet, filling most (not all) of the viewport
 * height, so the feed stays visually present behind it and the
 * person's scroll position is never lost just to read a few comments.
 * Desktop: a centered modal instead of a sheet, since there's no
 * "bottom of the screen" affordance that makes sense on a wide
 * viewport.
 *
 * Focus handling matches PhotoLightbox exactly: the element that had
 * focus before opening (the comment button that triggered this) is
 * saved and restored on close/unmount, and Tab/Shift+Tab is kept
 * cycling within the sheet's own focusable elements rather than
 * escaping into the feed behind it.
 */
export function CommentSheet({
  logId,
  currentUserId,
  ownerUserId,
  drinkName,
  shopName,
  onClose,
  onCountChange,
}: CommentSheetProps) {
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
      ).filter((el) => !el.hasAttribute("disabled"));
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Comments"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[80vh] w-full max-w-lg min-w-0 flex-col rounded-t-2xl bg-white shadow-card sm:h-[70vh] sm:rounded-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex min-w-0 shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-charcoal">Comments</p>
            <p className="truncate text-xs text-charcoal/50">
              {drinkName} · {shopName}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href={`/logs/${logId}`}
              onClick={onClose}
              className="whitespace-nowrap text-xs font-medium text-charcoal/50 hover:text-espresso"
            >
              View post
            </Link>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close comments"
              className="rounded-full p-1.5 text-charcoal/40 hover:bg-crema hover:text-charcoal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <CommentSection
          logId={logId}
          currentUserId={currentUserId}
          ownerUserId={ownerUserId}
          onCountChange={onCountChange}
        />
      </div>
    </div>
  );
}
