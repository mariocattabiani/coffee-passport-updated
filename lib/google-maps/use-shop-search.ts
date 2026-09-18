"use client";

import { useEffect, useRef, useState } from "react";

import { ShopSearchSession, type ShopSuggestion } from "@/lib/google-maps/autocomplete";

const DEBOUNCE_MS = 350;
export const MIN_QUERY_LENGTH = 3;

export type ShopSearchMode = "filtered" | "unrestricted";

/**
 * The shared two-stage café search behavior — one implementation, used
 * identically by Log Coffee's GoogleShopPicker, Explore's text search,
 * and onboarding's favorite café step, rather than three separate
 * copies of the same debounce/session/mode logic.
 *
 * mode starts "filtered" (ShopSearchSession's default 5-type filter)
 * for every fresh component instance — there is no persistence across
 * sessions or components, by design: opening Log Coffee or onboarding
 * fresh always starts filtered, exactly as required. A consumer flips
 * to "unrestricted" only in response to a real tap on a "Can't find
 * it? Search all places" control it renders itself; this hook never
 * changes mode on its own. Editing the query does NOT reset mode back
 * to filtered — staying in whichever mode the person is already in
 * while they refine their search is the least confusing behavior,
 * since switching modes out from under them mid-search would be more
 * surprising than useful.
 */
export function useShopSearch(query: string) {
  const [suggestions, setSuggestions] = useState<ShopSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ShopSearchMode>("filtered");

  const sessionRef = useRef<ShopSearchSession | null>(null);
  const requestIdRef = useRef(0);

  function getSession(): ShopSearchSession {
    if (!sessionRef.current) sessionRef.current = new ShopSearchSession();
    return sessionRef.current;
  }

  /** Abandoning the search entirely (component unmount) discards any
   *  half-used session token rather than ever reusing it later. */
  useEffect(() => {
    return () => {
      sessionRef.current?.reset();
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      requestIdRef.current += 1;
      sessionRef.current?.reset();
      sessionRef.current = null;
      setSuggestions([]);
      setSearching(false);
      setError(null);
      return;
    }

    setSearching(true);
    setError(null);
    const thisRequestId = ++requestIdRef.current;

    const timeout = setTimeout(async () => {
      try {
        const results = await getSession().search(trimmed, { unrestricted: mode === "unrestricted" });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, mode]);

  return { suggestions, searching, error, mode, setMode, getSession, resetSessionRef: sessionRef };
}
