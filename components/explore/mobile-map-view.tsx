"use client";

import { useState } from "react";
import { ChevronLeft, Locate, SlidersHorizontal } from "lucide-react";

import { ExploreSearch } from "@/components/explore/explore-search";
import { ExploreMap } from "@/components/explore/explore-map";
import { MobileFilterRow } from "@/components/explore/mobile-filter-row";
import { SearchThisAreaButton } from "@/components/explore/search-this-area-button";
import { useScrollLock } from "@/lib/scroll-lock/use-scroll-lock";
import type { DiscoveryResult } from "@/lib/explore/actions";
import type { ExternalCafeResult } from "@/lib/explore/nearby-search-actions";
import type { ExploreFilters } from "@/lib/explore/types";

interface MobileMapViewProps {
  items: DiscoveryResult[];
  externalItems: ExternalCafeResult[];
  selectedShopId: string | null;
  selectedExternalPlaceId: string | null;
  onSelectShop: (id: string) => void;
  onSelectExternal: (id: string) => void;
  onCenterSettled: (lat: number, lng: number, zoom: number) => void;
  centerHint: { lat: number; lng: number } | null;
  initialViewport: { center: { lat: number; lng: number }; zoom: number } | null;
  currentLocation: { lat: number; lng: number } | null;
  recenterToken: number;
  onRecenter: () => void;
  selectedDistanceMiles: number | null;
  openingExternalId: string | null;
  onViewStored: (id: string) => void;
  onViewExternal: (item: ExternalCafeResult) => void;
  onDismissSelection: () => void;
  onClose: () => void;
  filters: ExploreFilters;
  onFiltersChange: (filters: ExploreFilters) => void;
  searchThisAreaVisible: boolean;
  onSearchThisArea: () => void;
  searchingArea: boolean;
}

/**
 * A true fixed, full-viewport overlay, not a bigger embedded box, it
 * sits above the app's own bottom nav (z-50), with its own Back button
 * as the only way out. Back only ever toggles UI state in the parent
 * (mobileTab back to "list"), it never touches browser history, List
 * and Map are the same page, not two routes.
 */
export function MobileMapView({
  items,
  externalItems,
  selectedShopId,
  selectedExternalPlaceId,
  onSelectShop,
  onSelectExternal,
  onCenterSettled,
  centerHint,
  initialViewport,
  currentLocation,
  recenterToken,
  onRecenter,
  selectedDistanceMiles,
  openingExternalId,
  onViewStored,
  onViewExternal,
  onDismissSelection,
  onClose,
  filters,
  onFiltersChange,
  searchThisAreaVisible,
  onSearchThisArea,
  searchingArea,
}: MobileMapViewProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  useScrollLock(true);

  return (
    <div className="fixed inset-0 z-50 bg-crema lg:hidden" style={{ height: "100dvh" }}>
      <div className="absolute inset-0">
        <ExploreMap
          variant="fullscreen"
          items={items}
          externalItems={externalItems}
          selectedShopId={selectedShopId}
          selectedExternalPlaceId={selectedExternalPlaceId}
          onSelectShop={onSelectShop}
          onSelectExternal={onSelectExternal}
          onCenterSettled={onCenterSettled}
          centerHint={centerHint}
          initialViewport={initialViewport}
          currentLocation={currentLocation}
          recenterToken={recenterToken}
          selectedDistanceMiles={selectedDistanceMiles}
          openingExternalId={openingExternalId}
          onViewStored={onViewStored}
          onViewExternal={onViewExternal}
          onDismissSelection={onDismissSelection}
        />
      </div>

      <div
        className="absolute inset-x-0 top-0 z-20 space-y-2 p-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to list"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-card"
          >
            <ChevronLeft className="h-5 w-5 text-charcoal" />
          </button>
          <div className="min-w-0 flex-1">
            <ExploreSearch />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-label="Filters"
            aria-expanded={filtersOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-card"
          >
            <SlidersHorizontal className="h-4 w-4 text-charcoal" />
          </button>
        </div>

        {filtersOpen && (
          <div className="rounded-2xl bg-white p-2 shadow-card">
            <MobileFilterRow filters={filters} onChange={onFiltersChange} />
          </div>
        )}

        {searchThisAreaVisible && (
          <div className="flex justify-center">
            <SearchThisAreaButton onSearch={onSearchThisArea} searching={searchingArea} />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onRecenter}
        aria-label="Recenter on my location"
        className="absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5rem)" }}
      >
        <Locate className="h-4 w-4 text-espresso" aria-hidden="true" />
      </button>
    </div>
  );
}
