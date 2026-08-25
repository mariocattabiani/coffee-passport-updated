"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Next.js's standard error boundary convention, co-located with
 * page.tsx. Catches a thrown getDiscoveryResults/getDefaultExploreRegion
 * failure on the initial server render, so a real database error shows
 * a distinct, on-brand message instead of either a generic crash
 * screen or, worse, silently rendering as if there were simply no
 * cafés nearby.
 */
export default function ExploreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-crema px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-espresso/10">
        <AlertCircle className="h-6 w-6 text-espresso" aria-hidden="true" />
      </div>
      <p className="mt-5 font-heading text-xl font-semibold text-espresso">We couldn&apos;t load Explore.</p>
      <p className="mt-1 max-w-xs text-sm text-charcoal/60">
        Something went wrong loading café discovery. Please try again.
      </p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </div>
  );
}
