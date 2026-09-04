import Link from "next/link";
import { Bell } from "lucide-react";

import { getHeaderBadgeCounts } from "@/lib/dashboard/header-badges";

function BellIcon({ hasUnread, unreadCount }: { hasUnread: boolean; unreadCount: number }) {
  return (
    <Link
      href="/activity"
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-charcoal/60 hover:bg-crema hover:text-espresso"
      aria-label={hasUnread ? `Activity, ${unreadCount} unread` : "Activity"}
    >
      <Bell className="h-5 w-5" />
      {hasUnread && (
        <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2 rounded-full bg-sage" aria-hidden="true" />
      )}
    </Link>
  );
}

/**
 * Rendered instantly as the <Suspense> fallback around <NotificationBell />
 * — a fully clickable, real Bell Link, identical to the resolved state
 * except it has no unread dot yet. Never a disabled placeholder: the
 * bell must work immediately regardless of how long the badge count
 * takes to resolve.
 */
export function NotificationBellFallback() {
  return <BellIcon hasUnread={false} unreadCount={0} />;
}

/**
 * Reads getHeaderBadgeCounts(), the same react cache()-deduped fetch
 * the header's pending-friend-request dots read — all badge consumers
 * share one Promise.all per request rather than each doing their own
 * round trip. This component no longer takes props and no longer owns
 * its own separate query; AuthenticatedHeader wraps it in its own
 * <Suspense> boundary, so resolving here has no effect on when the
 * rest of the header becomes interactive — the shell (brand, nav
 * links, hamburger) is already rendered by the time this fills in.
 */
export async function NotificationBell() {
  const { hasUnread, unreadCount } = await getHeaderBadgeCounts();
  return <BellIcon hasUnread={hasUnread} unreadCount={unreadCount} />;
}
