import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  /** Number of content-row placeholders below the heading. */
  rows?: number;
  /** Row height — taller for card/tile-style content, shorter for
   *  dense list rows (leaderboard, friends, activity). */
  rowHeight?: "sm" | "md" | "lg";
  maxWidth?: string;
}

const ROW_HEIGHT_CLASS: Record<NonNullable<PageSkeletonProps["rowHeight"]>, string> = {
  sm: "h-12",
  md: "h-20",
  lg: "h-40",
};

/**
 * Deliberately has NO dependency on auth/data/the real
 * AuthenticatedHeader — that's the entire point of a route's
 * loading.tsx: Next.js renders this instantly on navigation, before
 * any server work has even started, so it can never be blocked by the
 * same queries it exists to cover for. It intentionally does not try
 * to replicate the fixed header/bottom-nav shell (a static stand-in
 * for a dynamic, auth-dependent component risks looking subtly wrong
 * or flickering when the real shell mounts a moment later) — a
 * content-only skeleton on the same page background is a large,
 * low-risk improvement over the current blank-screen gap on its own.
 */
export function PageSkeleton({ rows = 5, rowHeight = "md", maxWidth = "max-w-2xl" }: PageSkeletonProps) {
  return (
    <div className="min-h-dvh w-full bg-crema px-6 py-8 sm:py-12">
      <div className={`mx-auto w-full ${maxWidth} space-y-6`}>
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className={`w-full rounded-xl ${ROW_HEIGHT_CLASS[rowHeight]}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
