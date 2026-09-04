import { getHeaderBadgeCounts } from "@/lib/dashboard/header-badges";

/**
 * Renders only the dot itself (or nothing) — used inside both the
 * desktop Friends nav button and the mobile Discover tab (which
 * doubles as the pending-request indicator on mobile, since Friends
 * isn't its own bottom-nav slot). Both usages read the same shared
 * getHeaderBadgeCounts() cache entry NotificationBell already
 * triggers, so having two (or more) instances of this component on
 * the page never means two separate RPC round trips.
 *
 * Suspense fallback for this one is simply null: the nav item it sits
 * inside is already fully rendered and clickable without the dot, the
 * dot is a pure enhancement, never something worth blocking on or
 * showing a placeholder for.
 */
export async function HeaderPendingDot() {
  const { hasPending } = await getHeaderBadgeCounts();
  if (!hasPending) return null;

  return <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2 rounded-full bg-sage" aria-hidden="true" />;
}
