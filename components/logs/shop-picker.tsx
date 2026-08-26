"use client";

import { useMemo, useState } from "react";
import { Search, MapPin, Check, Pencil } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { Shop } from "@/lib/supabase/types";

interface ShopPickerProps {
  shops: Shop[];
  selectedShop: Shop | null;
  onSelect: (shop: Shop) => void;
  onChange: () => void;
}

export function ShopPicker({ shops, selectedShop, onSelect, onChange }: ShopPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter((shop) => shop.name.toLowerCase().includes(q));
  }, [shops, query]);

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
          onClick={onChange}
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
          placeholder="Search coffee shops..."
          className="pl-10"
          aria-label="Search coffee shops"
        />
      </div>

      <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
        {filtered.map((shop) => (
          <button
            key={shop.id}
            type="button"
            onClick={() => onSelect(shop)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white"
          >
            <div>
              <p className="text-sm font-medium text-charcoal">{shop.name}</p>
              {(shop.city || shop.state) && (
                <p className="text-xs text-charcoal/50">
                  {[shop.city, shop.state].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-charcoal/40">
            No shops match &quot;{query}&quot;.
          </p>
        )}
      </div>
    </div>
  );
}
