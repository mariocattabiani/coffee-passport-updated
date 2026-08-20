"use client";

import { useEffect, useRef, useState } from "react";
import { Search, MapPin, Check, Pencil, Loader2, AlertCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { findOrCreateShop } from "@/lib/shops/actions";
import { ShopSearchSession, type ShopSuggestion } from "@/lib/google-maps/autocomplete";
import type { Shop } from "@/lib/supabase/types";

interface GoogleShopPickerProps {
  selectedShop: Shop | null;
  onSelect: (shop: Shop) => void;
  onChange: () => void;
}

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 3;

export function GoogleShopPicker({ selectedShop, onSelect, onChange }: GoogleShopPickerProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ShopSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<ShopSearchSession | null>(null);
  const requestIdRef = useRef(0);

  function getSession() {
    if (!sessionRef.current) {
      sessionRef.current = new ShopSearchSession();
    }
    return sessionRef.current;
  }

  // Abandoning the picker (unmount) means any half-used session token
  // is discarded rather than ever being reused later.
  useEffect(() => {
    return () => {
      sessionRef.current?.reset();
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      // Invalidate anything already in flight from a longer query, a
      // stale response landing after the field was cleared must never
      // repopulate suggestions.
      requestIdRef.current += 1;
      // Falling back below the threshold counts as abandoning the
      // search, not just unmounting the picker, so the token is reset
      // and the session itself is dropped rather than reused.
      sessionRef.current?.reset();
      sessionRef.current = null;
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    setError(null);
    const thisRequestId = ++requestIdRef.current;

    const timeout = setTimeout(async () => {
      try {
        const results = await getSession().search(trimmed);
        // A faster, later request may have already landed, ignore this
        // stale one rather than overwriting newer results.
        if (thisRequestId === requestIdRef.current) {
          setSuggestions(results);
          setSearching(false);
        }
      } catch {
        if (thisRequestId === requestIdRef.current) {
          setError("Couldn't search cafés right now. Please try again.");
          setSearching(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [query]);

  async function handleSelectSuggestion(suggestion: ShopSuggestion) {
    setSelecting(true);
    setError(null);

    try {
      const place = await getSession().selectPlace(suggestion);
      const result = await findOrCreateShop({
        googlePlaceId: place.googlePlaceId,
        name: place.name,
        address: place.formattedAddress,
        city: place.city,
        state: place.state,
        country: place.country,
        latitude: place.latitude,
        longitude: place.longitude,
      });

      if (result.error || !result.shop) {
        setError(result.error ?? "Couldn't save that café. Please try again.");
        setSelecting(false);
        return;
      }

      onSelect(result.shop);
    } catch {
      setError("Couldn't look up that café. Please try again.");
      setSelecting(false);
    } finally {
      // A fresh session starts the next time this picker is used.
      sessionRef.current = null;
    }
  }

  function handleChange() {
    sessionRef.current?.reset();
    sessionRef.current = null;
    setQuery("");
    setSuggestions([]);
    setError(null);
    onChange();
  }

  if (selectedShop) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-espresso/20 bg-espresso/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-espresso text-crema">
            <Check className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-espresso">{selectedShop.name}</p>
            {(selectedShop.city || selectedShop.state) && (
              <p className="flex items-center gap-1 text-xs text-charcoal/50">
                <MapPin className="h-3 w-3" />
                {[selectedShop.city, selectedShop.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleChange}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-charcoal/60 hover:bg-white hover:text-espresso"
        >
          <Pencil className="h-3 w-3" />
          Change
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cafés..."
          className="pl-10 pr-10"
          aria-label="Search cafés"
          disabled={selecting}
        />
        {searching && (
          <Loader2
            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-charcoal/30"
            aria-hidden="true"
          />
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-error/10 p-3 text-sm text-error">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
        {suggestions.map((s) => (
          <button
            key={s.placeId}
            type="button"
            onClick={() => handleSelectSuggestion(s)}
            disabled={selecting}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white disabled:opacity-50"
          >
            <div>
              <p className="text-sm font-medium text-charcoal">{s.mainText}</p>
              {s.secondaryText && <p className="text-xs text-charcoal/50">{s.secondaryText}</p>}
            </div>
          </button>
        ))}

        {!searching && query.trim().length >= MIN_QUERY_LENGTH && suggestions.length === 0 && !error && (
          <p className="px-3 py-6 text-center text-sm text-charcoal/40">No cafés found for &quot;{query}&quot;.</p>
        )}
        {query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH && (
          <p className="px-3 py-4 text-center text-xs text-charcoal/30">Keep typing to search...</p>
        )}
      </div>
    </div>
  );
}
