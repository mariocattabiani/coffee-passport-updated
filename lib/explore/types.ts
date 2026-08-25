import type { DiscoveryResult } from "@/lib/explore/actions";
import type { ExternalCafeResult } from "@/lib/explore/nearby-search-actions";

export type ShopTypeFilter = "all" | "independent" | "chain";
export type QuickFilter = "new" | "visited" | "highly_rated" | "friends";
export type SortOption = "nearby" | "top_rated" | "most_logged" | "new_to_me";

export interface ExploreFilters {
  shopType: ShopTypeFilter;
  quick: QuickFilter[];
  maxDistanceMiles: number | null;
}

/**
 * A stored café carries the full DiscoveryResult shape, Coffee
 * Passport rating, Top Drink, visited state, friend count, all of it.
 * An external café, only ever appearing after an explicit
 * "Search this area" click, carries none of that, by construction,
 * there's no field to fake data into. Never persisted merely for
 * appearing in this list.
 */
export type ExploreResultItem =
  | { source: "stored"; data: DiscoveryResult }
  | { source: "external"; data: ExternalCafeResult };
