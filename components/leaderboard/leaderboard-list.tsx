import Link from "next/link";
import { User } from "lucide-react";

import type { LeaderboardRow } from "@/lib/leaderboard/actions";

interface LeaderboardListProps {
  rows: LeaderboardRow[];
  emptyMessage: string;
  emptyCta?: { href: string; label: string };
}

/**
 * Rows sit directly on the page background — no large surrounding
 * rounded card/shadow. Subtle row dividers (divide-y) are the only
 * separation, so this reads as a native ranking list rather than a
 * dashboard widget. The empty state keeps its own small bordered
 * panel, since that's a single centered message, not a list of rows,
 * and benefits from a visible boundary the way the rows themselves
 * don't need.
 */
export function LeaderboardList({ rows, emptyMessage, emptyCta }: LeaderboardListProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white/60 p-8 text-center">
        <p className="text-sm text-charcoal/60">{emptyMessage}</p>
        {emptyCta && (
          <Link
            href={emptyCta.href}
            className="mt-3 inline-block text-sm font-medium text-sage hover:text-espresso"
          >
            {emptyCta.label}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60">
      {rows.map((row) => (
        <LeaderboardRowItem key={row.userId} row={row} />
      ))}
    </div>
  );
}

/** Tappable to /users/[username] when a username exists (it always
 *  should for a real account) — falls back to a plain, non-interactive
 *  row rather than a dead link if it's somehow missing. */
function LeaderboardRowItem({ row }: { row: LeaderboardRow }) {
  const displayName = row.firstName || row.username || "Someone";

  const content = (
    <div className={`flex min-w-0 items-center gap-3 px-4 py-3 ${row.isCurrentUser ? "bg-sage/[0.06]" : ""}`}>
      <span className="w-6 shrink-0 text-right text-sm font-semibold tabular-nums text-charcoal/50">
        {row.rank}
      </span>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-latte/30">
        {row.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <User className="h-4 w-4 text-espresso/40" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-charcoal">{displayName}</p>
        {row.username && <p className="truncate text-xs text-charcoal/40">@{row.username}</p>}
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-espresso">{row.drinkCount}</span>
    </div>
  );

  if (row.username) {
    return (
      <Link href={`/users/${row.username}`} className="block transition-colors hover:bg-crema/60">
        {content}
      </Link>
    );
  }

  return content;
}
