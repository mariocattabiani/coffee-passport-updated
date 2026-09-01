import Link from "next/link";
import { Bell } from "lucide-react";

import { getUnreadNotificationCount } from "@/lib/notifications/actions";

/**
 * A subtle dot, not a loud count badge, matching "do not make it
 * visually loud" — and the exact same visual language already used for
 * the pending-friend-request dot elsewhere in this header. Async
 * Server Component, same pattern as AuthenticatedHeader's own pending-
 * request fetch: one cheap indexed count query per page load, not a
 * client-side poll.
 */
export async function NotificationBell() {
  const unreadCount = await getUnreadNotificationCount();
  const hasUnread = unreadCount > 0;

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
