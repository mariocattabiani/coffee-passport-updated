import type { FeedItem } from "@/components/discover/feed-card";
import { CoffeeLogGridTile } from "@/components/logs/coffee-log-grid-tile";

interface ProfileActivityGridProps {
  items: FeedItem[];
}

/**
 * Recent Coffees on a public profile now uses the exact same visual
 * gallery-grid concept as Passport — CoffeeLogGridTile, no Like/
 * Comment/Save on the tile itself, tap straight to /logs/[id] for the
 * full post and its social actions. 2 columns mobile, 3 from `md`,
 * matching Passport's own grid exactly. This only works well because
 * the section now renders full-width on the page (see
 * app/users/[username]/page.tsx) rather than squeezed into the old
 * ~60%-wide right column — 3 columns in that narrower space would
 * have reproduced the exact "tiny cramped cards" problem the previous
 * FeedCard-based version of this component was built to avoid in the
 * first place.
 *
 * No currentUserId here anymore: CoffeeLogGridTile has no social/
 * optimistic state of its own to scope to a viewer — that all lives on
 * /logs/[id] instead, which still receives it directly.
 */
export function ProfileActivityGrid({ items }: ProfileActivityGridProps) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-3 md:gap-4">
      {items.map((item) => (
        <CoffeeLogGridTile
          key={item.logId}
          data={{
            id: item.logId,
            photoUrl: item.photoUrl,
            photoPositionX: item.photoPositionX,
            photoPositionY: item.photoPositionY,
            drinkName: item.drinkName,
            shopName: item.shopName,
            shopCity: item.shopCity,
            shopState: item.shopState,
            category: item.category,
            temperature: item.temperature,
          }}
        />
      ))}
    </div>
  );
}
