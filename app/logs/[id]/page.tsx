import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { User } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getPublicLog } from "@/lib/social/log-detail-actions";
import { AuthenticatedHeader } from "@/components/dashboard/authenticated-header";
import { LogCardBody } from "@/components/logs/log-card-body";
import { SocialActionRow } from "@/components/logs/social-action-row";
import { CommentSection } from "@/components/social/comment-section";
import { formatRelativeDate } from "@/lib/drink-logs/format";

export const metadata: Metadata = {
  title: "Coffee Passport",
};

interface LogDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * The one dedicated place to see a single public post in full: photo,
 * drink, rating, café, caption, tags, Like/Comment/Save, and the whole
 * comment thread inline (not a sheet — this page already IS the
 * detail view, so CommentSection renders directly rather than inside
 * CommentSheet's overlay chrome). Reachable from Activity taps and
 * from "View post" inside the feed's CommentSheet.
 *
 * getPublicLog returns null both when the log doesn't exist and when
 * it exists but isn't public — notFound() either way, deliberately: a
 * private log must never be distinguishable from one that was never
 * there at all, just by guessing its URL.
 */
export default async function LogDetailPage({ params }: LogDetailPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const log = await getPublicLog(id);
  if (!log) notFound();

  const displayName = log.firstName || log.username || "Someone";

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-crema pb-24 sm:pb-10">
      <AuthenticatedHeader />

      <main className="mx-auto w-full max-w-lg px-6 py-8 sm:py-12">
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
          <div className="flex min-w-0 items-center gap-2 px-4 py-3">
            {log.username ? (
              <Link href={`/users/${log.username}`} className="flex min-w-0 items-center gap-2 hover:opacity-80">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-latte/30">
                  {log.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={log.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-espresso/40" />
                  )}
                </div>
                <p className="truncate text-sm font-medium text-charcoal">
                  {displayName}
                  <span className="ml-1 font-normal text-charcoal/40">@{log.username}</span>
                </p>
              </Link>
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-latte/30">
                  {log.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={log.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-espresso/40" />
                  )}
                </div>
                <p className="truncate text-sm font-medium text-charcoal">{displayName}</p>
              </div>
            )}
            <p className="ml-auto shrink-0 text-xs text-charcoal/40">{formatRelativeDate(log.loggedAt)}</p>
          </div>

          <LogCardBody
            compactRatingOnMobile={false}
            data={{
              drinkName: log.drinkName,
              drinkRating: log.drinkRating,
              shopId: log.shopId,
              shopName: log.shopName,
              caption: log.caption,
              category: log.category,
              temperature: log.temperature,
              photoUrl: log.photoUrl,
              photoPositionX: log.photoPositionX,
              photoPositionY: log.photoPositionY,
            }}
          />

          <SocialActionRow
            logId={log.logId}
            shopId={log.shopId}
            drinkId={log.drinkId}
            shopName={log.shopName}
            drinkName={log.drinkName}
            ownerUserId={log.ownerUserId}
            currentUserId={user.id}
            initialLikeCount={log.likeCount}
            initialViewerHasLiked={log.viewerHasLiked}
            initialViewerHasSaved={log.viewerHasSaved}
            initialCommentCount={log.commentCount}
            commentsHref="#comments"
          />
        </div>

        <div id="comments" className="mt-4 overflow-hidden rounded-2xl border border-border bg-white shadow-soft scroll-mt-6">
          <div className="border-b border-border/60 px-4 py-3">
            <p className="text-sm font-medium text-charcoal">Comments</p>
          </div>
          <div className="h-[60vh] min-h-[320px]">
            <CommentSection logId={log.logId} currentUserId={user.id} ownerUserId={log.ownerUserId} />
          </div>
        </div>
      </main>
    </div>
  );
}
