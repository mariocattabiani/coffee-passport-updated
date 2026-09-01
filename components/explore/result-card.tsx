import Link from "next/link";
import { Users } from "lucide-react";

import { StarDisplay } from "@/components/logs/star-display";
import { CafeThumbnailPlaceholder } from "@/components/explore/cafe-thumbnail-placeholder";
import type { DiscoveryResult } from "@/lib/explore/actions";

interface ResultCardProps {
  item: DiscoveryResult;
  distanceMiles: number | null;
  selected?: boolean;
}

/**
 * Only ever rendered for stored Coffee Passport shops, external Google
 * suggestions are handled entirely inside ExploreSearch's own
 * self-contained dropdown (they never enter this grid, this list, or
 * the map), so this card never needs to represent "we don't know
 * this yet" states, only "we do know this, here's what we know."
 */
export function ResultCard({ item, distanceMiles, selected }: ResultCardProps) {
  const locationLine =
    distanceMiles !== null ? `${distanceMiles.toFixed(1)} mi away` : [item.city, item.state].filter(Boolean).join(", ");

  return (
    <Link
      href={`/shops/${item.shopId}`}
      className={`flex w-full min-w-0 max-w-full gap-3 overflow-hidden rounded-xl border p-4 shadow-soft transition-shadow hover:shadow-card ${
        selected ? "border-espresso bg-crema/50 shadow-card" : "border-border bg-white"
      }`}
    >
      {item.photoUrl ? (
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-charcoal/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.photoUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <CafeThumbnailPlaceholder name={item.name} size="md" />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium text-charcoal">{item.name}</p>
          {item.isChain && (
            <span className="shrink-0 rounded-full bg-charcoal/5 px-2 py-0.5 text-[10px] font-medium text-charcoal/50">
              Chain
            </span>
          )}
        </div>
        {locationLine && <p className="truncate text-xs text-charcoal/50">{locationLine}</p>}

        <div className="mt-1.5 flex items-center gap-2">
          {item.ratingAvg !== null ? (
            <StarDisplay rating={item.ratingAvg} size="h-3 w-3" showValue />
          ) : (
            <span className="text-xs font-medium text-sage">New on Coffee Passport</span>
          )}
        </div>

        {item.topDrinkName && (
          <p className="mt-1 truncate text-xs text-charcoal/60">
            Top drink: <span className="font-medium text-charcoal">{item.topDrinkName}</span>
            {item.topDrinkRating !== null && (
              <span className="text-charcoal/40"> ({item.topDrinkRating.toFixed(1)})</span>
            )}
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <span className={item.visitedByMe ? "font-medium text-espresso" : "text-charcoal/40"}>
            {item.visitedByMe ? "In your Passport" : "New to you"}
          </span>
          {item.friendVisitCount > 0 && (
            <span className="flex items-center gap-1 text-charcoal/50">
              <Users className="h-3 w-3" aria-hidden="true" />
              {item.friendVisitCount} {item.friendVisitCount === 1 ? "friend has" : "friends have"} been here
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
