import { User } from "lucide-react";

import { StarDisplay } from "@/components/logs/star-display";
import { formatRelativeDate } from "@/lib/drink-logs/format";

export interface ShopActivityItem {
  logId: string;
  loggedAt: string;
  drinkRating: number;
  caption: string | null;
  temperature: "hot" | "iced" | null;
  photoUrl: string | null;
  drinkName: string;
  category: "coffee" | "tea";
  username: string | null;
  firstName: string | null;
  avatarUrl: string | null;
}

interface WhatPeopleAreDrinkingProps {
  items: ShopActivityItem[];
}

/**
 * Complementary to Top Drinks, not a replacement: Top Drinks answers
 * "what's best here", this answers "what does it actually look like".
 * Public logs only, the RPC behind this already filters that. A more
 * compact horizontal-scroll strip rather than full masonry, since this
 * is a secondary section on an already-composed page, not the main
 * event the way Discover is.
 */
export function WhatPeopleAreDrinking({ items }: WhatPeopleAreDrinkingProps) {
  if (items.length === 0) {
    return (
      <section>
        <h2 className="mb-4 font-heading text-xl font-semibold text-espresso">What people are drinking</h2>
        <p className="rounded-xl border border-dashed border-border bg-white/60 p-6 text-center text-sm text-charcoal/60">
          No public activity here yet.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="font-heading text-xl font-semibold text-espresso">What people are drinking</h2>
        <p className="text-sm text-charcoal/60">Recent public logs from the Coffee Passport community</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((item) => {
          const displayName = item.firstName || item.username || "Someone";
          return (
            <div
              key={item.logId}
              className="w-52 shrink-0 overflow-hidden rounded-xl border border-border bg-white shadow-soft"
            >
              {item.photoUrl ? (
                <div className="relative aspect-square w-full bg-charcoal/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.photoUrl} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-espresso/5">
                  <p className="px-4 text-center text-sm font-medium text-espresso/50">{item.drinkName}</p>
                </div>
              )}
              <div className="p-3">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-latte/30">
                    {item.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-2.5 w-2.5 text-espresso/40" />
                    )}
                  </div>
                  <p className="truncate text-xs font-medium text-charcoal">{displayName}</p>
                  <p className="ml-auto shrink-0 text-[10px] text-charcoal/40">
                    {formatRelativeDate(item.loggedAt)}
                  </p>
                </div>
                {item.photoUrl && (
                  <p className="mt-1.5 truncate text-sm font-medium text-charcoal">{item.drinkName}</p>
                )}
                <div className="mt-1">
                  <StarDisplay rating={item.drinkRating} size="h-3 w-3" showValue />
                </div>
                {item.caption && <p className="mt-1.5 line-clamp-2 text-xs text-charcoal/60">{item.caption}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
