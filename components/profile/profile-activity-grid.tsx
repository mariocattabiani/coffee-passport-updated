import { FeedCard, type FeedItem } from "@/components/discover/feed-card";

interface ProfileActivityGridProps {
  items: FeedItem[];
  currentUserId: string;
}

/**
 * Recent Coffees on a public profile deliberately does not reuse
 * FeedColumns. FeedColumns picks its column count from the browser
 * viewport width via matchMedia, which is correct for Discover (a
 * full-width feed) but wrong here: on the profile's two-column desktop
 * layout, Recent Coffees lives in a right-hand column that's only
 * ~60% of the page, not the full viewport, so a viewport-driven "lg =
 * 3 columns" decision would cram 3 columns into a column meant for 2
 * and reproduce the exact "tiny cramped cards" problem this pass
 * exists to fix.
 *
 * This is a plain CSS grid instead: 1 column until `lg`, 2 columns at
 * `lg` and above. It reads its own available width from its own
 * container via ordinary responsive Tailwind classes, no JS, no
 * hydration-order concerns, and it caps at 2 columns everywhere,
 * matching the profile's deliberately less-dense Recent Coffees.
 *
 * The card itself (FeedCard) is unchanged and identical to the one
 * Discover uses, only the containing layout differs, exactly as
 * intended: one shared card, two different feed layouts.
 */
export function ProfileActivityGrid({ items, currentUserId }: ProfileActivityGridProps) {
  return (
    <div className="grid grid-cols-1 divide-y divide-border/60 sm:gap-4 sm:divide-y-0 lg:grid-cols-2">
      {items.map((item) => (
        <FeedCard key={item.logId} item={item} currentUserId={currentUserId} />
      ))}
    </div>
  );
}
