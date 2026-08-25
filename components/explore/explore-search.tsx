"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, MapPin } from "lucide-react";

import { Input } from "@/components/ui/input";
import { searchStoredShops, type StoredShopMatch } from "@/lib/explore/actions";
import { findShopByGooglePlaceId } from "@/lib/shops/actions";
import { AddExternalCafeDialog } from "@/components/explore/add-external-cafe-dialog";
import { ShopSearchSession, type ShopSuggestion, type SelectedShopPlace } from "@/lib/google-maps/autocomplete";

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 3;

/**
 * A typeahead leading directly to a café's page, not a live filter of
 * the browse grid, this keeps search and browse as two clear, separate
 * mental models rather than one component trying to be both. Stored
 * Coffee Passport matches always render first, external Google
 * suggestions beneath them, never labeled as "Google" anywhere.
 * Reuses ShopSearchSession exactly as the logging flow already does,
 * same 3-character minimum, same debounce, same session token
 * lifecycle, this file introduces no new Google interaction pattern.
 */
export function ExploreSearch() {
  const [query, setQuery] = useState("");
  const [storedMatches, setStoredMatches] = useState<StoredShopMatch[]>([]);
  const [externalMatches, setExternalMatches] = useState<ShopSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [open, setOpen] = useState(false);
  const [pendingPlace, setPendingPlace] = useState<SelectedShopPlace | null>(null);
  const requestIdRef = useRef(0);
  const sessionRef = useRef<ShopSearchSession | null>(null);
  const router = useRouter();

  function getSession() {
    if (!sessionRef.current) sessionRef.current = new ShopSearchSession();
    return sessionRef.current;
  }

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      // Invalidate anything already in flight, a stale response landing
      // after the field was cleared must never repopulate the dropdown.
      requestIdRef.current += 1;
      setStoredMatches([]);
      setExternalMatches([]);
      setSearching(false);
      setSearchError(false);
      setOpen(false);
      return;
    }

    setSearching(true);
    setOpen(true);
    const thisRequestId = ++requestIdRef.current;

    const timeout = setTimeout(async () => {
      const stored = await searchStoredShops(trimmed);
      if (thisRequestId !== requestIdRef.current) return;
      setStoredMatches(stored);

      try {
        const external = await getSession().search(trimmed);
        if (thisRequestId === requestIdRef.current) {
          setExternalMatches(external);
          setSearchError(false);
        }
      } catch {
        if (thisRequestId === requestIdRef.current) {
          setExternalMatches([]);
          setSearchError(true);
        }
      } finally {
        if (thisRequestId === requestIdRef.current) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [query]);

  function handleSelectStored(match: StoredShopMatch) {
    setOpen(false);
    router.push(`/shops/${match.shopId}`);
  }

  async function handleSelectExternal(suggestion: ShopSuggestion) {
    setSelecting(true);
    try {
      const place = await getSession().selectPlace(suggestion);

      const existing = await findShopByGooglePlaceId(place.googlePlaceId);
      if (existing) {
        setOpen(false);
        router.push(`/shops/${existing.id}`);
        return;
      }

      setOpen(false);
      setPendingPlace(place);
    } finally {
      setSelecting(false);
    }
  }

  function handleCafeCreated(shop: { id: string }) {
    setPendingPlace(null);
    router.push(`/shops/${shop.id}`);
  }

  const hasResults = storedMatches.length > 0 || externalMatches.length > 0;
  const showNoResults = open && !searching && !hasResults && !searchError && query.trim().length >= MIN_QUERY_LENGTH;
  const showError = open && !searching && searchError && storedMatches.length === 0;

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= MIN_QUERY_LENGTH && setOpen(true)}
          placeholder="Search cafés by name..."
          className="pl-10 pr-10"
          aria-label="Search for a café"
        />
        {(searching || selecting) && (
          <Loader2
            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-charcoal/30"
            aria-hidden="true"
          />
        )}
      </div>

      {open && hasResults && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-border bg-white shadow-card">
          {storedMatches.map((m) => (
            <button
              key={m.shopId}
              type="button"
              onClick={() => handleSelectStored(m)}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm hover:bg-crema/60"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-sage" aria-hidden="true" />
              <span className="truncate font-medium text-charcoal">{m.name}</span>
            </button>
          ))}
          {externalMatches.map((s) => (
            <button
              key={s.placeId}
              type="button"
              onClick={() => handleSelectExternal(s)}
              disabled={selecting}
              className="flex w-full items-start gap-2.5 border-t border-border/60 px-4 py-3 text-left text-sm hover:bg-crema/60 disabled:opacity-50"
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-charcoal/30" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate font-medium text-charcoal">{s.mainText}</p>
                {s.secondaryText && <p className="truncate text-xs text-charcoal/40">{s.secondaryText}</p>}
                <p className="mt-0.5 text-xs font-medium text-sage">Not explored on Coffee Passport yet</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showNoResults && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-border bg-white p-4 text-center text-sm text-charcoal/50 shadow-card">
          No cafés found for &quot;{query.trim()}&quot;
        </div>
      )}

      {showError && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-border bg-white p-4 text-center text-sm text-charcoal/50 shadow-card">
          Search is temporarily unavailable, stored Coffee Passport cafés are still shown below.
        </div>
      )}

      {pendingPlace && (
        <AddExternalCafeDialog
          place={{
            googlePlaceId: pendingPlace.googlePlaceId,
            googleName: pendingPlace.name,
            googleSecondaryText: pendingPlace.formattedAddress,
          }}
          onCreated={handleCafeCreated}
          onCancel={() => setPendingPlace(null)}
        />
      )}
    </div>
  );
}
