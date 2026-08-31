import Link from "next/link";
import { MapPin } from "lucide-react";

import { StarDisplay } from "@/components/logs/star-display";
import { LogCardMedia } from "@/components/logs/log-card-media";
import { CollapsibleCaption } from "@/components/logs/collapsible-caption";

export interface LogCardBodyData {
  drinkName: string;
  drinkRating: number;
  shopId: string;
  shopName: string;
  caption: string | null;
  category: "coffee" | "tea";
  temperature: "hot" | "iced" | null;
  photoUrl: string | null;
}

/**
 * The one shared social-log presentation used by both Discover/public
 * profiles (FeedCard) and the owner's own logs (LogCard). This is
 * deliberately just the body: media, drink+rating, café, caption,
 * coffee/tea + hot/iced tags. Identity headers and owner Edit/Delete
 * controls stay in the two thin wrapper components, since those are
 * the one meaningfully different piece between "someone else's public
 * post" and "my own log", everything else about how a coffee log
 * looks is now a single implementation, not two drifting copies.
 */
export function LogCardBody({ data }: { data: LogCardBodyData }) {
  return (
    <>
      <LogCardMedia photoUrl={data.photoUrl} alt={`${data.drinkName} at ${data.shopName}`} />

      <div className="min-w-0 px-3.5 py-2.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-charcoal">{data.drinkName}</p>
            <Link
              href={`/shops/${data.shopId}`}
              className="flex min-w-0 items-center gap-1 text-xs text-charcoal/50 hover:text-espresso hover:underline"
            >
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{data.shopName}</span>
            </Link>
          </div>
          <div className="shrink-0">
            <StarDisplay rating={data.drinkRating} size="h-3 w-3" showValue />
          </div>
        </div>

        {data.caption && <CollapsibleCaption text={data.caption} />}

        <div className="mt-2 flex items-center gap-2 text-xs text-charcoal/40">
          <span className="capitalize">{data.category}</span>
          {data.temperature && (
            <>
              <span aria-hidden="true">•</span>
              <span className="capitalize">{data.temperature}</span>
            </>
          )}
        </div>
      </div>
    </>
  );
}
