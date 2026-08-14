"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { PersonRow } from "@/components/friends/person-row";
import { searchUsers, type UserSearchResult } from "@/lib/friends/search";

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

export function PeopleSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      // Invalidate anything already in flight from a longer query, a
      // stale response landing after the field was cleared must never
      // repopulate results.
      requestIdRef.current += 1;
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const thisRequestId = ++requestIdRef.current;

    const timeout = setTimeout(async () => {
      const found = await searchUsers(trimmed);
      if (thisRequestId === requestIdRef.current) {
        setResults(found);
        setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/30" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or @username..."
          className="pl-10 pr-10"
          aria-label="Search for people"
        />
        {searching && (
          <Loader2
            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-charcoal/30"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="mt-3 space-y-2">
        {results.map((r) => (
          <PersonRow
            key={r.userId}
            userId={r.userId}
            username={r.username}
            firstName={r.firstName}
            avatarUrl={r.avatarUrl}
            friendshipState={r.friendshipState}
          />
        ))}
        {!searching && query.trim().length >= MIN_QUERY_LENGTH && results.length === 0 && (
          <p className="px-1 py-6 text-center text-sm text-charcoal/40">No one found.</p>
        )}
        {query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH && (
          <p className="px-1 py-4 text-center text-xs text-charcoal/30">Keep typing to search...</p>
        )}
      </div>
    </div>
  );
}
