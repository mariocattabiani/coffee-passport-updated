"use client";

import { useEffect } from "react";

/**
 * Locks the page body's scroll while active, restores whatever was
 * there before on cleanup, and never leaves a stuck style behind after
 * unmount, since the cleanup always runs regardless of why the effect
 * tears down (closing the map, navigating away, anything).
 *
 * position: fixed plus a negative top offset is the well-established
 * pattern for this on iOS Safari specifically, plain overflow:hidden
 * alone is known not to reliably stop Safari's own rubber-band scroll
 * from moving content behind a fixed overlay.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    const scrollY = window.scrollY;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
