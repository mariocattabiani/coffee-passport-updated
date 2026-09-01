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

interface LogCardBodyProps {
  data: LogCardBodyData;
  /** Compact `★ 4.5` below `sm`, full 5-star row from `sm` up. Neutral
   *  default (off): LogCardBody itself makes no assumption about
   *  which surface is rendering it, since it's shared by both the
   *  public social feed (FeedCard) and the owner's own private
   *  Passport Coffee Trail (LogCard) — two different products with
   *  different needs, not one feed with two entry points. Callers
   *  that actually want the fast-scan social treatment (FeedCard) opt
   *  in explicitly; Passport's own LogCard deliberately does not, and
   *  keeps its pre-existing full-star presentation unchanged. */
  compactRatingOnMobile?: boolean;
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
 *
 * One consistent px-4 horizontal rhythm throughout (header, this body,
 * the action row below all agree) — previously header used px-3 and
 * this body used px-3.5, two slightly different insets on the same
 * post that read as unintentional rather than designed.
 */
export function LogCardBody({ data, compactRatingOnMobile = false }: LogCardBodyProps) {
  return (
    <>
      <LogCardMedia photoUrl={data.photoUrl} alt={`${data.drinkName} at ${data.shopName}`} />

      <div className="min-w-0 px-4 py-3">
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
            <StarDisplay
              rating={data.drinkRating}
              size="h-3 w-3"
              showValue
              compactOnMobile={compactRatingOnMobile}
            />
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
