import { MapPinOff, Users, SearchX, LocateOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ExploreEmptyVariant =
  | "no-shops-in-area"
  | "no-filter-matches"
  | "no-friend-activity"
  | "location-denied"
  | "search-no-results"
  | "external-search-unavailable";

const CONTENT: Record<ExploreEmptyVariant, { icon: LucideIcon; title: string; body: string }> = {
  "no-shops-in-area": {
    icon: MapPinOff,
    title: "No cafés here yet.",
    body: "Try zooming out or searching for a specific café by name.",
  },
  "no-filter-matches": {
    icon: SearchX,
    title: "Nothing matches those filters.",
    body: "Try clearing a filter or widening your distance.",
  },
  "no-friend-activity": {
    icon: Users,
    title: "No friends have logged here yet.",
    body: "Try a different filter, or check back later.",
  },
  "location-denied": {
    icon: LocateOff,
    title: "Location isn't available.",
    body: "You can still find a café by searching for it by name.",
  },
  "search-no-results": {
    icon: SearchX,
    title: "No cafés found.",
    body: "Try a different spelling or a nearby landmark.",
  },
  "external-search-unavailable": {
    icon: SearchX,
    title: "Search is temporarily unavailable.",
    body: "Stored Coffee Passport cafés are still shown below.",
  },
};

/**
 * A no-photo or no-rating card is handled inline within ResultCard
 * itself (a per-card fallback, not a whole-page empty state), only
 * the full-section states live here.
 */
export function ExploreEmptyState({ variant }: { variant: ExploreEmptyVariant }) {
  const { icon: Icon, title, body } = CONTENT[variant];
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white/60 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-espresso/10">
        <Icon className="h-6 w-6 text-espresso" aria-hidden="true" />
      </div>
      <p className="mt-5 font-heading text-lg font-semibold text-espresso">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-charcoal/60">{body}</p>
    </div>
  );
}
