"use client";

import { Sparkles, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SearchThisAreaButtonProps {
  onSearch: () => void;
  searching: boolean;
  disabled?: boolean;
}

/**
 * The only trigger for a Nearby Search request anywhere in the app.
 * Disabled while a request is in flight, so a rapid double-click can
 * never produce two requests, that plus the unchanged-signature check
 * in ExploreClient are the two layers of client-side abuse protection.
 */
export function SearchThisAreaButton({ onSearch, searching, disabled }: SearchThisAreaButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={onSearch} disabled={searching || disabled} className="gap-1.5">
      {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
      {searching ? "Searching..." : "Search this area"}
    </Button>
  );
}
