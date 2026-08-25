"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Locate, List as ListIcon, Map as MapIcon, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ExploreSearch } from "@/components/explore/explore-search";
import { FilterBar } from "@/components/explore/filter-bar";
import { SortControl } from "@/components/explore/sort-control";
import { PassportProgressModule } from "@/components/explore/passport-progress-module";
import { ResultCard } from "@/components/explore/result-card";
import { ExternalResultCard } from "@/components/explore/external-result-card";
import { AddExternalCafeDialog } from "@/components/explore/add-external-cafe-dialog";
import { SearchThisAreaButton } from "@/components/explore/search-this-area-button";
import { GoogleAttribution } from "@/components/explore/google-attribution";
import { ExploreMap } from "@/components/explore/explore-map";
import { ExploreEmptyState } from "@/components/explore/explore-empty-state";
import { useGeolocation } from "@/lib/geolocation/use-geolocation";
import { haversineMiles, boundsAroundPoint } from "@/lib/explore/geo";
import { getDiscoveryResults, type DiscoveryResult } from "@/lib/explore/actions";
import { searchNearbyExternalCafes, type ExternalCafeResult } from "@/lib/explore/nearby-search-actions";
import { findShopByGooglePlaceId } from "@/lib/shops/actions";
import type { Shop } from "@/lib/supabase/types";
import type { ExploreFilters, SortOption, ExploreResultItem } from "@/lib/explore/types";
import type { UpNextGoalDisplay } from "@/lib/passport/achievements";

interface ExploreClientProps {
  initialResults: DiscoveryResult[];
  regionLabel: string | null;
  upNextGoal: UpNextGoalDisplay | null;
}

const DEFAULT_FILTERS: ExploreFilters = { shopType: "all", quick: [], maxDistanceMiles: null };
// Fixed for V1, not zoom-adaptive, kept predictable and cost-safe.
const SEARCH_RADIUS_METERS = 5000;
const SPARSE_RESULT_THRESHOLD = 3;

function buildSearchSignature(lat: number, lng: number, radiusMeters: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)},${radiusMeters}`;
}

function ratingValue(entry: ExploreResultItem): number {
  return entry.source === "stored" ? entry.data.ratingAvg ?? -1 : -1;
}
function logCountValue(entry: ExploreResultItem): number {
  return entry.source === "stored" ? entry.data.ratingCount : 0;
}
function isNewToMe(entry: ExploreResultItem): boolean {
  return entry.source === "external" ? true : !entry.data.visitedByMe;
}

/**
 * selectedShopId/selectedExternalPlaceId are the single sources of
 * truth for list/map synchronization, a card click and a marker click
 * both only ever call their one corresponding setter. Filtered and
 * sorted results are derived with useMemo, never their own separate
 * state, so there is nothing to keep in sync or forget to update after
 * a filter or sort change.
 *
 * External results (Nearby Search) exist only in this component's own
 * state, never persisted, never surviving a reload, and only ever
 * populated by an explicit "Search this area" click, there is no path
 * anywhere in this file that calls searchNearbyExternalCafes
 * automatically.
 */
export function ExploreClient({ initialResults, regionLabel, upNextGoal }: ExploreClientProps) {
  const [results, setResults] = useState<DiscoveryResult[]>(initialResults);
  const [currentRegionLabel, setCurrentRegionLabel] = useState(regionLabel);
  const [filters, setFilters] = useState<ExploreFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortOption>("top_rated");
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"list" | "map">("list");
  const [regionLoading, setRegionLoading] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const location = useGeolocation();
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const sortTouchedRef = useRef(false);

  // Search This Area state, entirely separate from the stored-results
  // pipeline above.
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [externalResults, setExternalResults] = useState<ExternalCafeResult[]>([]);
  const [searchingArea, setSearchingArea] = useState(false);
  const [searchAreaError, setSearchAreaError] = useState(false);
  const [selectedExternalPlaceId, setSelectedExternalPlaceId] = useState<string | null>(null);
  const [openingExternalId, setOpeningExternalId] = useState<string | null>(null);
  const [addCafeContext, setAddCafeContext] = useState<ExternalCafeResult | null>(null);
  const externalCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Rounded center + radius of the last successful search, a second
  // click without a meaningful move is a no-op, not a second request.
  const lastSearchSignatureRef = useRef<string | null>(null);
  const router = useRouter();

  const hasLocation = location.status === "granted" && location.latitude !== null && location.longitude !== null;

  async function handleUseLocation() {
    location.requestLocation();
  }

  const locationFetchedRef = useRef(false);

  function fetchDiscoveryForLocation(lat: number, lng: number) {
    let cancelled = false;
    setRegionLoading(true);
    setLocationError(false);

    getDiscoveryResults(boundsAroundPoint(lat, lng))
      .then((r) => {
        if (cancelled) return;
        setResults(r);
        setCurrentRegionLabel(null);
        // A fresh location grant takes priority over any stale manual
        // pan from before it arrived.
        setMapCenter(null);
        if (!sortTouchedRef.current) setSort("nearby");
      })
      .catch(() => {
        if (cancelled) return;
        setLocationError(true);
      })
      .finally(() => {
        if (!cancelled) setRegionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }

  useEffect(() => {
    if (!hasLocation || locationFetchedRef.current) return;
    locationFetchedRef.current = true;
    return fetchDiscoveryForLocation(location.latitude!, location.longitude!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLocation, location.latitude, location.longitude]);

  function handleRetryLocation() {
    if (location.latitude === null || location.longitude === null) return;
    fetchDiscoveryForLocation(location.latitude, location.longitude);
  }

  function handleSortChange(next: SortOption) {
    sortTouchedRef.current = true;
    setSort(next);
  }

  function handleCenterSettled(lat: number, lng: number) {
    setMapCenter({ lat, lng });
  }

  function getSearchCenter(): { lat: number; lng: number } | null {
    // The map has been manually moved since the region last loaded,
    // that takes priority.
    if (mapCenter) return mapCenter;
    if (hasLocation) return { lat: location.latitude!, lng: location.longitude! };
    return null;
  }

  async function handleSearchThisArea() {
    const center = getSearchCenter();
    if (!center || searchingArea) return;

    const signature = buildSearchSignature(center.lat, center.lng, SEARCH_RADIUS_METERS);
    if (signature === lastSearchSignatureRef.current) return;

    setSearchingArea(true);
    setSearchAreaError(false);

    const outcome = await searchNearbyExternalCafes(center.lat, center.lng, SEARCH_RADIUS_METERS);

    setSearchingArea(false);
    if (!outcome.success) {
      setSearchAreaError(true);
      return;
    }
    lastSearchSignatureRef.current = signature;
    setExternalResults(outcome.results);
  }

  async function handleOpenExternal(item: ExternalCafeResult) {
    setOpeningExternalId(item.googlePlaceId);

    // Never create anything on click alone. If Coffee Passport already
    // has this café, open it directly, no dialog, no second Google
    // request either, this is a plain database lookup.
    const existing = await findShopByGooglePlaceId(item.googlePlaceId);
    if (existing) {
      router.push(`/shops/${existing.id}`);
      return;
    }

    setOpeningExternalId(null);
    setAddCafeContext(item);
  }

  function handleCafeCreated(shop: Shop) {
    setAddCafeContext(null);
    router.push(`/shops/${shop.id}`);
  }

  function handleSelectExternalMarker(placeId: string) {
    setSelectedExternalPlaceId(placeId);
    const el = externalCardRefs.current.get(placeId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const combinedItems: ExploreResultItem[] = useMemo(() => {
    const stored: ExploreResultItem[] = results.map((data) => ({ source: "stored" as const, data }));
    const external: ExploreResultItem[] = externalResults.map((data) => ({ source: "external" as const, data }));
    return [...stored, ...external];
  }, [results, externalResults]);

  const filteredItems = useMemo(() => {
    return combinedItems.filter((entry) => {
      if (filters.maxDistanceMiles !== null && hasLocation) {
        const d = haversineMiles(location.latitude!, location.longitude!, entry.data.latitude, entry.data.longitude);
        if (d > filters.maxDistanceMiles) return false;
      }

      if (entry.source === "external") {
        // External results only ever pass filters they can honestly
        // satisfy, we don't fabricate a rating, visited state, friend
        // count, or chain classification for a café we don't yet know.
        if (filters.shopType !== "all") return false;
        if (filters.quick.includes("visited")) return false;
        if (filters.quick.includes("highly_rated")) return false;
        if (filters.quick.includes("friends")) return false;
        return true;
      }

      const item = entry.data;
      if (filters.shopType === "independent" && item.isChain) return false;
      if (filters.shopType === "chain" && !item.isChain) return false;
      if (filters.quick.includes("new") && item.visitedByMe) return false;
      if (filters.quick.includes("visited") && !item.visitedByMe) return false;
      if (filters.quick.includes("highly_rated") && (item.ratingAvg === null || item.ratingAvg < 4)) return false;
      if (filters.quick.includes("friends") && item.friendVisitCount === 0) return false;
      return true;
    });
  }, [combinedItems, filters, hasLocation, location.latitude, location.longitude]);

  const sortedItems = useMemo(() => {
    const withDistance = filteredItems.map((entry) => ({
      entry,
      distance: hasLocation
        ? haversineMiles(location.latitude!, location.longitude!, entry.data.latitude, entry.data.longitude)
        : null,
    }));

    const list = [...withDistance];
    switch (sort) {
      case "nearby":
        list.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        break;
      case "most_logged":
        list.sort((a, b) => logCountValue(b.entry) - logCountValue(a.entry));
        break;
      case "new_to_me":
        list.sort((a, b) => Number(isNewToMe(b.entry)) - Number(isNewToMe(a.entry)));
        break;
      case "top_rated":
      default:
        list.sort((a, b) => ratingValue(b.entry) - ratingValue(a.entry));
    }
    return list;
  }, [filteredItems, sort, hasLocation, location.latitude, location.longitude]);

  function handleSelectMarker(shopId: string) {
    setSelectedShopId(shopId);
    const el = cardRefs.current.get(shopId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const filtersActive = filters.shopType !== "all" || filters.quick.length > 0 || filters.maxDistanceMiles !== null;

  // trueEmpty now means nothing at all, not even after a search,
  // that's the only state that replaces the whole map/list body. A
  // sparse-but-nonzero region, or a filter reducing the list to zero,
  // both keep the full layout and the map visible.
  const trueEmpty = results.length === 0 && externalResults.length === 0;
  const filteredEmpty = !trueEmpty && sortedItems.length === 0;
  const sparse = results.length > 0 && results.length < SPARSE_RESULT_THRESHOLD && externalResults.length === 0;

  let listEmptyVariant: "no-friend-activity" | "no-filter-matches" | null = null;
  if (filteredEmpty) {
    listEmptyVariant = filters.quick.includes("friends") ? "no-friend-activity" : "no-filter-matches";
  }

  const canSearchArea = getSearchCenter() !== null;

  const selectedItemForDistance =
    results.find((r) => r.shopId === selectedShopId) ??
    externalResults.find((r) => r.googlePlaceId === selectedExternalPlaceId) ??
    null;
  const selectedDistanceMiles =
    selectedItemForDistance && hasLocation
      ? haversineMiles(location.latitude!, location.longitude!, selectedItemForDistance.latitude, selectedItemForDistance.longitude)
      : null;

  function handleDismissSelection() {
    setSelectedShopId(null);
    setSelectedExternalPlaceId(null);
  }

  return (
    <div className="space-y-4">
      <ExploreSearch />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterBar filters={filters} onChange={setFilters} hasLocation={hasLocation} />
        <div className="flex flex-wrap items-center gap-2">
          <SortControl value={sort} onChange={handleSortChange} hasLocation={hasLocation} />
          {!hasLocation && (
            <Button variant="outline" size="sm" onClick={handleUseLocation} className="gap-1.5">
              <Locate className="h-3.5 w-3.5" />
              {location.status === "pending" ? "Locating..." : "Use my location"}
            </Button>
          )}
          <SearchThisAreaButton onSearch={handleSearchThisArea} searching={searchingArea} disabled={!canSearchArea} />
        </div>
      </div>

      <PassportProgressModule goal={upNextGoal} />

      {location.status === "denied" && (
        <p className="text-xs text-charcoal/50">Location isn&apos;t available, you can still search by name.</p>
      )}
      {!hasLocation && currentRegionLabel && (
        <p className="text-xs text-charcoal/40">Showing cafés near {currentRegionLabel}</p>
      )}
      {locationError && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-white/60 px-3.5 py-2.5 text-xs text-charcoal/60">
          <span>We couldn&apos;t refresh cafés for your location.</span>
          <button type="button" onClick={handleRetryLocation} className="font-medium text-espresso hover:underline">
            Try again
          </button>
        </div>
      )}
      {searchAreaError && (
        <p className="text-xs text-charcoal/50">Nearby search couldn&apos;t be completed. Please try again.</p>
      )}
      {sparse && !searchingArea && (
        <button
          type="button"
          onClick={handleSearchThisArea}
          disabled={!canSearchArea}
          className="flex items-center gap-1.5 text-xs font-medium text-espresso hover:underline disabled:opacity-50"
        >
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Want more options? Search nearby cafés
        </button>
      )}

      <div className="sm:hidden">
        <div className="flex rounded-full border border-border bg-white p-0.5">
          <button
            type="button"
            onClick={() => setMobileTab("list")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium ${
              mobileTab === "list" ? "bg-espresso text-crema" : "text-charcoal"
            }`}
          >
            <ListIcon className="h-3.5 w-3.5" />
            List
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("map")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium ${
              mobileTab === "map" ? "bg-espresso text-crema" : "text-charcoal"
            }`}
          >
            <MapIcon className="h-3.5 w-3.5" />
            Map
          </button>
        </div>
      </div>

      {regionLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-white/60" />
          ))}
        </div>
      ) : trueEmpty ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white/60 px-6 py-14 text-center">
          <p className="font-heading text-lg font-semibold text-espresso">Be the first to explore here.</p>
          <p className="mt-1 max-w-xs text-sm text-charcoal/60">
            We don&apos;t have any Coffee Passport cafés in this area yet.
          </p>
          <div className="mt-6">
            <SearchThisAreaButton onSearch={handleSearchThisArea} searching={searchingArea} disabled={!canSearchArea} />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <div className={`space-y-3 ${mobileTab === "map" ? "hidden lg:block" : ""}`}>
            {filteredEmpty ? (
              <ExploreEmptyState variant={listEmptyVariant!} />
            ) : (
              <>
                {externalResults.length > 0 && (
                  <div className="pb-1">
                    <GoogleAttribution />
                  </div>
                )}
                {sortedItems.map(({ entry, distance }) =>
                  entry.source === "stored" ? (
                    <div
                      key={entry.data.shopId}
                      ref={(el) => {
                        if (el) cardRefs.current.set(entry.data.shopId, el);
                        else cardRefs.current.delete(entry.data.shopId);
                      }}
                    >
                      <ResultCard item={entry.data} distanceMiles={distance} selected={entry.data.shopId === selectedShopId} />
                    </div>
                  ) : (
                    <div
                      key={entry.data.googlePlaceId}
                      ref={(el) => {
                        if (el) externalCardRefs.current.set(entry.data.googlePlaceId, el);
                        else externalCardRefs.current.delete(entry.data.googlePlaceId);
                      }}
                    >
                      <ExternalResultCard
                        item={entry.data}
                        distanceMiles={distance}
                        selected={entry.data.googlePlaceId === selectedExternalPlaceId}
                        opening={openingExternalId === entry.data.googlePlaceId}
                        onOpen={handleOpenExternal}
                      />
                    </div>
                  )
                )}
              </>
            )}
          </div>

          <div className={`lg:sticky lg:top-24 ${mobileTab === "list" ? "hidden lg:block" : ""}`}>
            {/* The full, unfiltered region here, deliberately decoupled
                from the filtered list, a restrictive filter should
                never make the map go blank. */}
            <ExploreMap
              items={results}
              selectedShopId={selectedShopId}
              onSelectShop={handleSelectMarker}
              externalItems={externalResults}
              selectedExternalPlaceId={selectedExternalPlaceId}
              onSelectExternal={handleSelectExternalMarker}
              onCenterSettled={handleCenterSettled}
              selectedDistanceMiles={selectedDistanceMiles}
              openingExternalId={openingExternalId}
              onViewStored={(shopId) => router.push(`/shops/${shopId}`)}
              onViewExternal={handleOpenExternal}
              onDismissSelection={handleDismissSelection}
            />
          </div>
        </div>
      )}

      {addCafeContext && (
        <AddExternalCafeDialog
          place={{
            googlePlaceId: addCafeContext.googlePlaceId,
            googleName: addCafeContext.name,
            googleSecondaryText: addCafeContext.formattedAddress,
          }}
          onCreated={handleCafeCreated}
          onCancel={() => setAddCafeContext(null)}
        />
      )}
    </div>
  );
}
