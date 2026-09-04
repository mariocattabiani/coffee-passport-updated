import { cn } from "@/lib/utils";

/** A single pulsing placeholder block. Matches the animate-pulse
 *  convention already used for Explore's own loading state — this
 *  just makes that pattern reusable across every route's loading.tsx
 *  instead of it existing in one place only. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-charcoal/10", className)} aria-hidden="true" />;
}
