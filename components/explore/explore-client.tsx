"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { List as ListIcon, Map as MapIcon } from "lucide-react";

import { ExploreSearch } from "@/components/explore/explore-search";
import { FilterBar } from "@/components/explore/filter-bar";
import { FiltersPopover } from "@/components/explore/filters-popover";
import { MobileFilterRow } from "@/components/explore/mobile-filter-row";
import { SortControl } from "@/components/explore/sort-control";
import { FindCoffeeNearMe } from "@/components/explore/find-coffee-near-me";
import { PassportProgressModule } from "@/components/explore/passport-progress-module";
import { ResultCard } from "@/components/explore/result-card";
import { ExternalResultCard } from "@/components/explore/external-result-card";
import { AddExternalCafeDialog } from "@/components/explore/add-external-cafe-dialog";
import { SearchThisAreaButton } from "@/components/explore/search-this-area-button";
import { GoogleAttribution } from "@/components/explore/google-attribution";
import { ExploreMap } from "@/components/explore/explore-map";
import { MobileMapView } from "@/components/explore/mobile-map-view";
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
// How far the map has to move, from the center of the last loaded
// region, before the contextual Search This Area button appears.
// Tunable, deliberately not a tiny distance, so trivial accidental
// pans don't flash the button in and out.
const SEARCH_THIS_AREA_THRESHOLD_MILES = 0.75;
const PASSPORT_MODULE_MOBILE_INDEX = 2;
const MOBILE_LOCAL_DISCOVERY_ZOOM = 15;

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
 * truth for list/map synchronization. Filtered and sorted results are
 * derived with useMemo, never their own separate state.
 *
 * External results (Nearby Search) exist only in this component's own
 * state, never persisted, only ever populated by Find Coffee Near Me
 * or an explicit Search This Area click, never automatically.
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
  const pendingFindNearMeRef = useRef(false);
  const router = useRouter();

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [mobileMapViewport, setMobileMapViewport] = useState<{
    center: { lat: number; lng: number };
    zoom: number;
  } | null>(null);
  // The center of whichever region's results are currently displayed,
  // distinct from mapCenter (the live pan position), used only to
  // decide whether Search This Area should appear.
  const [lastLoadedCenter, setLastLoadedCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [externalResults, setExternalResults] = useState<ExternalCafeResult[]>([]);
  const [searchingArea, setSearchingArea] = useState(false);
  const [searchAreaError, setSearchAreaError] = useState(false);
  const [selectedExternalPlaceId, setSelectedExternalPlaceId] = useState<string | null>(null);
  const [openingExternalId, setOpeningExternalId] = useState<string | null>(null);
  const [addCafeContext, setAddCafeContext] = useState<ExternalCafeResult | null>(null);
  const [recenterToken, setRecenterToken] = useState(0);
  const externalCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastSearchSignatureRef = useRef<string | null>(null);

  const hasLocation = location.status === "granted" && location.latitude !== null && location.longitude !== null;

  async function runFindNearMeFlow(lat: number, lng: number) {
    setRegionLoading(true);
    setLocationError(false);
    setSearchAreaError(false);
    setMapCenter(null);
    setMobileMapViewport(null);
    sortTouchedRef.current = false;

    try {
      const [storedResults, nearbyOutcome] = await Promise.all([
        getDiscoveryResults(boundsAroundPoint(lat, lng)),
        searchNearbyExternalCafes(lat, lng, SEARCH_RADIUS_METERS),
      ]);

      setResults(storedResults);
      setCurrentRegionLabel(null);
      setSort("nearby");
      setLastLoadedCenter({ lat, lng });
      lastSearchSignatureRef.current = buildSearchSignature(lat, lng, SEARCH_RADIUS_METERS);

      if (nearbyOutcome.success) {
        setExternalResults(nearbyOutcome.results);
      } else {
        setSearchAreaError(true);
      }
    } catch {
      setLocationError(true);
    } finally {
      setRegionLoading(false);
    }
  }

  function handleFindCoffeeNearMe() {
    if (hasLocation) {
      // Already granted, this tap is a deliberate refresh/recenter
      // request, redo the whole flow with the current coordinates.
      runFindNearMeFlow(location.latitude!, location.longitude!);
      return;
    }
    pendingFindNearMeRef.current = true;
    location.requestLocation();
  }

  useEffect(() => {
    if (!hasLocation || !pendingFindNearMeRef.current) return;
    pendingFindNearMeRef.current = false;
    runFindNearMeFlow(location.latitude!, location.longitude!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLocation, location.latitude, location.longitude]);

  function handleRetryLocation() {
    if (location.latitude === null || location.longitude === null) return;
    runFindNearMeFlow(location.latitude, location.longitude);
  }

  function handleSortChange(next: SortOption) {
    sortTouchedRef.current = true;
    setSort(next);
  }

  function handleCenterSettled(lat: number, lng: number) {
    setMapCenter({ lat, lng });
  }

  function handleMobileViewportSettled(lat: number, lng: number, zoom: number) {
    const center = { lat, lng };
    setMapCenter(center);
    setMobileMapViewport({ center, zoom });
  }

  function handleRecenter() {
    // Pure camera move, no fetch, no Google request.
    setRecenterToken((t) => t + 1);
  }

  function getSearchCenter(): { lat: number; lng: number } | null {
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
    setLastLoadedCenter(center);
  }

  async function handleOpenExternal(item: ExternalCafeResult) {
    setOpeningExternalId(item.googlePlaceId);

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

  function handleSelectMarker(shopId: string) {
    setSelectedShopId(shopId);
    const el = cardRefs.current.get(shopId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function handleDismissSelection() {
    setSelectedShopId(null);
    setSelectedExternalPlaceId(null);
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

  const trueEmpty = results.length === 0 && externalResults.length === 0;
  const filteredEmpty = !trueEmpty && sortedItems.length === 0;

  let listEmptyVariant: "no-friend-activity" | "no-filter-matches" | null = null;
  if (filteredEmpty) {
    listEmptyVariant = filters.quick.includes("friends") ? "no-friend-activity" : "no-filter-matches";
  }

  const canSearchArea = getSearchCenter() !== null;

  const searchThisAreaVisible =
    lastLoadedCenter !== null &&
    mapCenter !== null &&
    haversineMiles(lastLoadedCenter.lat, lastLoadedCenter.lng, mapCenter.lat, mapCenter.lng) >
      SEARCH_THIS_AREA_THRESHOLD_MILES;

  const selectedItemForDistance =
    results.find((r) => r.shopId === selectedShopId) ??
    externalResults.find((r) => r.googlePlaceId === selectedExternalPlaceId) ??
    null;
  const selectedDistanceMiles =
    selectedItemForDistance && hasLocation
      ? haversineMiles(
          location.latitude!,
          location.longitude!,
          selectedItemForDistance.latitude,
          selectedItemForDistance.longitude
        )
      : null;

  const centerHint = lastLoadedCenter ?? (hasLocation ? { lat: location.latitude!, lng: location.longitude! } : null);
  const currentLocation = hasLocation ? { lat: location.latitude!, lng: location.longitude! } : null;
  const mobileInitialViewport =
    mobileMapViewport ??
    (currentLocation ? { center: currentLocation, zoom: MOBILE_LOCAL_DISCOVERY_ZOOM } : null);

  function renderCard(entry: ExploreResultItem, distance: number | null) {
    if (entry.source === "stored") {
      return (
        <div
          key={entry.data.shopId}
          className="min-w-0 max-w-full"
          ref={(el) => {
            if (el) cardRefs.current.set(entry.data.shopId, el);
            else cardRefs.current.delete(entry.data.shopId);
          }}
        >
          <ResultCard item={entry.data} distanceMiles={distance} selected={entry.data.shopId === selectedShopId} />
        </div>
      );
    }
    return (
      <div
        key={entry.data.googlePlaceId}
        className="min-w-0 max-w-full"
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
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-4">
      {/* Two distinct intents, kept visibly separate: search is "I know
          the café," Find Coffee Near Me is "show me what's around." */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 sm:flex-1">
          <ExploreSearch />
        </div>
        <FindCoffeeNearMe
          status={location.status}
          hasLocation={hasLocation}
          regionLabel={currentRegionLabel}
          onFind={handleFindCoffeeNearMe}
        />
      </div>

      {/* Mobile: one light filter row. Desktop: the fuller row plus the
          distance popover. */}
      <div className="min-w-0 max-w-full lg:hidden">
        <MobileFilterRow filters={filters} onChange={setFilters} />
      </div>
      <div className="hidden items-center justify-between gap-3 lg:flex">
        <FilterBar filters={filters} onChange={setFilters} hasLocation={hasLocation} />
        <div className="flex items-center gap-2">
          <SortControl value={sort} onChange={handleSortChange} hasLocation={hasLocation} />
          <FiltersPopover filters={filters} onChange={setFilters} hasLocation={hasLocation} />
        </div>
      </div>

      {location.status === "denied" && (
        <p className="text-xs text-charcoal/50">Location isn&apos;t available, you can still search by name.</p>
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

      {/* Desktop: Passport progress sits here, above the grid, kept
          slim. Mobile: it's spliced lower, into the list itself, so it
          never delays the first cafés. */}
      <div className="hidden lg:block">
        <PassportProgressModule goal={upNextGoal} />
      </div>

      <div className="lg:hidden">
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
            <FindCoffeeNearMe
              status={location.status}
              hasLocation={hasLocation}
              regionLabel={currentRegionLabel}
              onFind={handleFindCoffeeNearMe}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Map mode: a genuine full-screen overlay, not an
              embedded box, tapping a marker there shows a compact
              preview and never forces a switch back to List. */}
          {mobileTab === "map" && (
            <MobileMapView
              items={results}
              externalItems={externalResults}
              selectedShopId={selectedShopId}
              selectedExternalPlaceId={selectedExternalPlaceId}
              onSelectShop={handleSelectMarker}
              onSelectExternal={handleSelectExternalMarker}
              onCenterSettled={handleMobileViewportSettled}
              centerHint={centerHint}
              initialViewport={mobileInitialViewport}
              currentLocation={currentLocation}
              recenterToken={recenterToken}
              onRecenter={handleRecenter}
              selectedDistanceMiles={selectedDistanceMiles}
              openingExternalId={openingExternalId}
              onViewStored={(shopId) => router.push(`/shops/${shopId}`)}
              onViewExternal={handleOpenExternal}
              onDismissSelection={handleDismissSelection}
              onClose={() => setMobileTab("list")}
              filters={filters}
              onFiltersChange={setFilters}
              searchThisAreaVisible={searchThisAreaVisible}
              onSearchThisArea={handleSearchThisArea}
              searchingArea={searchingArea}
            />
          )}

          <div
            className={`grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2 lg:items-start ${
              mobileTab === "map" ? "hidden lg:grid" : ""
            }`}
          >
            <div className="min-w-0 space-y-3">
              {filteredEmpty ? (
                <ExploreEmptyState variant={listEmptyVariant!} />
              ) : (
                <>
                  {externalResults.length > 0 && (
                    <div className="pb-1">
                      <GoogleAttribution />
                    </div>
                  )}
                  {sortedItems.map(({ entry, distance }, index) => (
                    <Fragment key={entry.source === "stored" ? entry.data.shopId : entry.data.googlePlaceId}>
                      {renderCard(entry, distance)}
                      {index === PASSPORT_MODULE_MOBILE_INDEX && upNextGoal && (
                        <div className="lg:hidden">
                          <PassportProgressModule goal={upNextGoal} />
                        </div>
                      )}
                    </Fragment>
                  ))}
                </>
              )}
            </div>

            {/* Desktop-only embedded map, mobile uses the full-screen
                overlay above instead while Map is active. */}
            <div className="hidden lg:sticky lg:top-24 lg:block">
              <ExploreMap
                items={results}
                selectedShopId={selectedShopId}
                onSelectShop={handleSelectMarker}
                externalItems={externalResults}
                selectedExternalPlaceId={selectedExternalPlaceId}
                onSelectExternal={handleSelectExternalMarker}
                onCenterSettled={handleCenterSettled}
                centerHint={centerHint}
                currentLocation={currentLocation}
                recenterToken={recenterToken}
                selectedDistanceMiles={selectedDistanceMiles}
                openingExternalId={openingExternalId}
                onViewStored={(shopId) => router.push(`/shops/${shopId}`)}
                onViewExternal={handleOpenExternal}
                onDismissSelection={handleDismissSelection}
              />
              {searchThisAreaVisible && (
                <div className="mt-3 flex justify-center">
                  <SearchThisAreaButton
                    onSearch={handleSearchThisArea}
                    searching={searchingArea}
                    disabled={!canSearchArea}
                  />
                </div>
              )}
            </div>
          </div>
        </>
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
