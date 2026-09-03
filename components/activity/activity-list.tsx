"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, User } from "lucide-react";

import { markNotificationRead, markAllNotificationsRead, type NotificationItem } from "@/lib/notifications/actions";
import { formatRelativeDate } from "@/lib/drink-logs/format";

/**
 * One sentence fragment per notification type, all four handled in
 * one place rather than scattered inline ternaries. targetAvailable
 * false always collapses to the same generic "no longer available"
 * copy regardless of type — the specific drink/comment content is
 * already nulled server-side by then, this just keeps the wording
 * consistent with that.
 */
function notificationText(item: NotificationItem): string {
  if (!item.targetAvailable) {
    switch (item.type) {
      case "like":
        return "liked a post that's no longer available";
      case "comment_like":
        return "liked a comment that's no longer available";
      case "comment_reply":
        return "replied to a comment that's no longer available";
      default:
        return "commented on a post that's no longer available";
    }
  }

  switch (item.type) {
    case "like":
      return `liked your ${item.drinkName}`;
    case "comment_like":
      return "liked your comment";
    case "comment_reply":
      return item.drinkName ? `replied to your comment on ${item.drinkName}` : "replied to your comment";
    default:
      return `commented on your ${item.drinkName}`;
  }
}

interface ActivityListProps {
  initialItems: NotificationItem[];
}

/**
 * Newest first, compact rows, one unified list for both event types
 * rather than separate Like/Comment sections — matching "design ONE
 * unified notification/activity system", not two parallel ones.
 *
 * Tapping a row marks it read and, when the target is still available,
 * navigates to /logs/[id] — for a Comment notification specifically,
 * this lands on the post detail page where the comment thread is right
 * there, effectively "opening comments" without a separate deep link
 * scheme. When the target isn't available (source log deleted or gone
 * private), the row still marks read on tap but never navigates
 * anywhere — there's nothing left to show.
 */
export function ActivityList({ initialItems }: ActivityListProps) {
  const [items, setItems] = useState(initialItems);
  const [markingAll, setMarkingAll] = useState(false);

  const hasUnread = items.some((item) => item.readAt === null);

  async function handleRowClick(item: NotificationItem) {
    if (item.readAt === null) {
      setItems((prev) =>
        prev.map((i) => (i.notificationId === item.notificationId ? { ...i, readAt: new Date().toISOString() } : i))
      );
      try {
        await markNotificationRead(item.notificationId);
      } catch {
        // Not critical enough to roll back a read-state flip over — a
        // failed mark-read just means it may show as unread again on
        // next load, not a broken experience worth reverting for.
      }
    }
  }

  async function handleMarkAllRead() {
    if (markingAll || !hasUnread) return;
    setMarkingAll(true);
    const prev = items;
    setItems((cur) => cur.map((i) => (i.readAt === null ? { ...i, readAt: new Date().toISOString() } : i)));
    try {
      await markAllNotificationsRead();
    } catch {
      setItems(prev);
    } finally {
      setMarkingAll(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white/60 p-8 text-center">
        <p className="text-sm text-charcoal/60">
          Nothing here yet. Activity on your public coffees — likes and comments — will show up here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {hasUnread && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="text-xs font-medium text-charcoal/50 hover:text-espresso"
          >
            Mark all as read
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
        <div className="divide-y divide-border/60">
          {items.map((item) => {
            const actorName = item.actorFirstName || item.actorUsername || "Someone";
            const isUnread = item.readAt === null;
            const canNavigate = item.targetAvailable && item.drinkLogId;

            const content = (
              <div className={`flex min-w-0 items-start gap-3 px-4 py-3.5 ${isUnread ? "bg-sage/5" : ""}`}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-latte/30">
                  {item.actorAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.actorAvatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-espresso/40" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-charcoal">
                    <span className="font-medium">{actorName}</span> {notificationText(item)}
                  </p>
                  {item.targetAvailable &&
                    (item.type === "comment" || item.type === "comment_reply") &&
                    item.commentBody && (
                      <p className="mt-0.5 truncate text-sm text-charcoal/60">&quot;{item.commentBody}&quot;</p>
                    )}
                  <p className="mt-1 text-xs text-charcoal/40">{formatRelativeDate(item.createdAt)}</p>
                </div>

                <div className="mt-0.5 shrink-0 text-charcoal/30">
                  {item.type === "like" || item.type === "comment_like" ? (
                    <Heart className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  )}
                </div>

                {isUnread && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sage" aria-hidden="true" />
                )}
              </div>
            );

            return canNavigate ? (
              <Link
                key={item.notificationId}
                href={`/logs/${item.drinkLogId}`}
                onClick={() => handleRowClick(item)}
                className="block transition-colors hover:bg-crema/60"
              >
                {content}
              </Link>
            ) : (
              <button
                key={item.notificationId}
                type="button"
                onClick={() => handleRowClick(item)}
                className="block w-full text-left transition-colors hover:bg-crema/60"
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
