import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export interface HeaderBadgeCounts {
  hasPending: boolean;
  hasUnread: boolean;
  unreadCount: number;
}

/**
 * react's cache() de-dupes calls to the same function with the same
 * arguments (none, here) within a single render pass — NotificationBell
 * and both HeaderPendingDot instances (the desktop Friends nav button,
 * the mobile Discover tab) each call this independently, but the
 * Promise.all below only ever actually runs ONCE per request; every
 * other call just receives the already-resolved result. This is what
 * makes "one fetch, three separate Suspense-wrapped UI locations"
 * possible without prop-drilling across components that aren't
 * parent/child of each other, and without reaching for React Context
 * for something this narrow — AuthenticatedHeader itself no longer
 * fetches anything at all, it just places three independent Suspense
 * boundaries around consumers of this one shared cache entry.
 *
 * Both RPCs run through the ONE Supabase client created here, rather
 * than each going through its own createClient() call — createClient()
 * reads cookies to resolve the current session, so calling it twice
 * for what's already one combined fetch was pure duplicate work.
 * get_unread_notification_count is called directly via this shared
 * client instead of through lib/notifications/actions.ts's own
 * getUnreadNotificationCount() (left in place there, unremoved, since
 * other callers may still use it) specifically so both RPCs share the
 * same client/cookie read.
 *
 * Failure semantics unchanged from before: a pending-count error logs
 * a sanitized message and degrades to hasPending: false; an unread-
 * count error logs a sanitized message and degrades to
 * unreadCount: 0 / hasUnread: false. Neither failure throws — a badge
 * failing to load must never take down page navigation.
 */
export const getHeaderBadgeCounts = cache(async (): Promise<HeaderBadgeCounts> => {
  const supabase = await createClient();

  const [pendingResult, unreadResult] = await Promise.all([
    supabase.rpc("get_pending_request_count"),
    supabase.rpc("get_unread_notification_count"),
  ]);

  if (pendingResult.error) {
    console.error("get_pending_request_count failed:", pendingResult.error.message);
  }
  if (unreadResult.error) {
    console.error("get_unread_notification_count failed:", unreadResult.error.message);
  }

  const pendingCount = pendingResult.data;
  const unreadCount = typeof unreadResult.data === "number" && !unreadResult.error ? unreadResult.data : 0;

  return {
    hasPending: typeof pendingCount === "number" && pendingCount > 0,
    hasUnread: unreadCount > 0,
    unreadCount,
  };
});
