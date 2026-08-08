"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Check, Pencil, Coffee, Leaf } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { createDrink } from "@/lib/drink-logs/actions";
import type { BeverageCategory, Drink } from "@/lib/supabase/types";

interface DrinkPickerProps {
  shopId: string;
  selectedDrink: Drink | null;
  onSelect: (drink: Drink) => void;
  onChange: () => void;
}

export function DrinkPicker({ shopId, selectedDrink, onSelect, onChange }: DrinkPickerProps) {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [newCategory, setNewCategory] = useState<BeverageCategory>("coffee");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("drinks")
      .select("*")
      .eq("shop_id", shopId)
      .order("name")
      .then(({ data }) => {
        if (!cancelled) {
          setDrinks((data as Drink[]) ?? []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [shopId]);

  const trimmedQuery = query.trim();
  const filtered = useMemo(() => {
    const q = trimmedQuery.toLowerCase();
    if (!q) return drinks;
    return drinks.filter((d) => d.name.toLowerCase().includes(q));
  }, [drinks, trimmedQuery]);

  const exactMatch = drinks.some((d) => d.name.toLowerCase() === trimmedQuery.toLowerCase());

  async function handleCreate() {
    setCreating(true);
    setError(null);
    const result = await createDrink(shopId, trimmedQuery, newCategory);
    setCreating(false);
    if (result.error || !result.drink) {
      setError(result.error ?? "Couldn't add that drink.");
      return;
    }
    setDrinks((prev) => [...prev, result.drink!]);
    onSelect(result.drink);
  }

  if (selectedDrink) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-espresso/20 bg-espresso/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-espresso text-crema">
            <Check className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-espresso">{selectedDrink.name}</p>
            <p className="text-xs capitalize text-charcoal/50">{selectedDrink.category}</p>
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
          placeholder="Search drinks..."
          className="pl-10"
          aria-label="Search drinks"
        />
      </div>

      <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
        {loading && <p className="px-3 py-4 text-sm text-charcoal/40">Loading drinks...</p>}

        {!loading &&
          filtered.map((drink) => (
            <button
              key={drink.id}
              type="button"
              onClick={() => onSelect(drink)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white"
            >
              <span className="text-sm font-medium text-charcoal">{drink.name}</span>
              <span className="text-xs capitalize text-charcoal/40">{drink.category}</span>
            </button>
          ))}

        {!loading && filtered.length === 0 && !trimmedQuery && (
          <p className="px-3 py-4 text-sm text-charcoal/40">
            No drinks logged here yet. Be the first.
          </p>
        )}
      </div>

      {!loading && trimmedQuery && !exactMatch && (
        <div className="mt-3 rounded-lg border border-dashed border-border bg-white p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-espresso">
            <Plus className="h-3.5 w-3.5" />
            Add "{trimmedQuery}"
          </p>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setNewCategory("coffee")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors ${
                newCategory === "coffee"
                  ? "border-espresso bg-espresso text-crema"
                  : "border-border bg-white text-charcoal hover:border-espresso/40"
              }`}
            >
              <Coffee className="h-3.5 w-3.5" />
              Coffee
            </button>
            <button
              type="button"
              onClick={() => setNewCategory("tea")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors ${
                newCategory === "tea"
                  ? "border-sage bg-sage/15 text-espresso"
                  : "border-border bg-white text-charcoal hover:border-sage/40"
              }`}
            >
              <Leaf className="h-3.5 w-3.5" />
              Tea
            </button>
          </div>

          {error && <p className="mt-2 text-xs text-error">{error}</p>}

          <Button
            type="button"
            size="sm"
            className="mt-3 w-full"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? "Adding..." : `Add drink`}
          </Button>
        </div>
      )}
    </div>
  );
}
