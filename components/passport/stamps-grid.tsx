import type { StampDisplayItem } from "@/lib/passport/achievements";
import { StampCard } from "@/components/passport/stamp-card";

/**
 * The full collection, every stamp at once — this is exactly what the
 * main Passport page's Stamps section used to look like before the
 * compact-rail redesign. Living here instead keeps that browseable
 * "see everything, locked and earned" experience available without
 * it costing vertical space on the page someone visits far more often.
 */
export function StampsGrid({ items }: { items: StampDisplayItem[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-6 rounded-2xl border border-border bg-white p-6 shadow-soft sm:justify-start">
      {items.map((item) => (
        <StampCard key={item.key} item={item} />
      ))}
    </div>
  );
}
