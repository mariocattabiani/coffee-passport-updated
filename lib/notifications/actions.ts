"use server";

import { createClient } from "@/lib/supabase/server";

export interface NotificationItem {
  notificationId: string;
  type: "like" | "comment" | "comment_reply" | "comment_like";
  actorUserId: string;
  actorFirstName: string | null;
  actorUsername: string | null;
  actorAvatarUrl: string | null;
  drinkLogId: string | null;
  /** Null whenever targetAvailable is false — never rely on this for
   *  anything but display when targetAvailable is true. */
  drinkName: string | null;
  /** True only when the underlying log is public right now. False
   *  covers "log deleted" and "log went private" identically — no
   *  signal exists here to tell those two apart, by design. */
  targetAvailable: boolean;
  commentBody: string | null;
  createdAt: string;
  readAt: string | null;
}

interface NotificationRow {
  notification_id: string;
  type: "like" | "comment" | "comment_reply" | "comment_like";
  actor_user_id: string;
  actor_first_name: string | null;
  actor_username: string | null;
  actor_avatar_url: string | null;
  drink_log_id: string | null;
  drink_name: string | null;
  target_available: boolean;
  comment_body: string | null;
  created_at: string;
  read_at: string | null;
}

/** The Activity feed: the current user's own notifications, newest
 *  first. get_my_notifications is hardcoded to auth.uid() itself, no
 *  parameter here could ever ask for someone else's. */
export async function getMyNotifications(): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_notifications", { page_size: 50 });

  if (error) {
    console.error("get_my_notifications failed:", error.message);
    throw new Error("Unable to load your activity.");
  }

  const rows = (data ?? []) as NotificationRow[];
  return rows.map((r) => ({
    notificationId: r.notification_id,
    type: r.type,
    actorUserId: r.actor_user_id,
    actorFirstName: r.actor_first_name,
    actorUsername: r.actor_username,
    actorAvatarUrl: r.actor_avatar_url,
    drinkLogId: r.drink_log_id,
    drinkName: r.drink_name,
    targetAvailable: r.target_available,
    commentBody: r.comment_body,
    createdAt: r.created_at,
    readAt: r.read_at,
  }));
}

/**
 * Deliberately degrades to 0 on failure rather than throwing, the one
 * intentional exception to "errors must not masquerade as empty
 * states" in this whole sprint: this powers a small badge that renders
 * on every authenticated page via AuthenticatedHeader, and matches the
 * exact precedent already set by get_pending_request_count in that
 * same component, which does the same thing. A failing badge count
 * shouldn't take down every page in the app; the actual Activity page
 * (getMyNotifications above) still throws normally on a real failure.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_unread_notification_count");

  if (error) {
    console.error("get_unread_notification_count failed:", error.message);
    return 0;
  }

  return typeof data === "number" ? data : 0;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notification_read", { target_notification_id: notificationId });

  if (error) {
    console.error("mark_notification_read failed:", error.message);
    throw new Error("Couldn't update that notification.");
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_all_notifications_read");

  if (error) {
    console.error("mark_all_notifications_read failed:", error.message);
    throw new Error("Couldn't update your notifications.");
  }
}
