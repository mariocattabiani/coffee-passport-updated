"use server";

import { createClient } from "@/lib/supabase/server";

export interface SavedItem {
  saveId: string;
  shopId: string;
  shopName: string;
  city: string | null;
  state: string | null;
  drinkId: string | null;
  drinkName: string | null;
  category: "coffee" | "tea" | null;
  createdAt: string;
  sourceVisible: boolean;
  sourceFirstName: string | null;
  sourceUsername: string | null;
}

interface MySavesRow {
  save_id: string;
  shop_id: string;
  shop_name: string;
  city: string | null;
  state: string | null;
  drink_id: string | null;
  drink_name: string | null;
  category: "coffee" | "tea" | null;
  created_at: string;
  source_log_id: string | null;
  source_visible: boolean;
  source_first_name: string | null;
  source_username: string | null;
}

/**
 * The current user's own saved drink/café intent, newest first.
 * get_my_saves is SECURITY DEFINER and hardcodes auth.uid() itself —
 * there is no parameter here for "whose saves", by design, this can
 * only ever return the caller's own.
 */
export async function getMySaves(): Promise<SavedItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_saves", { page_size: 100 });

  if (error) {
    console.error("get_my_saves failed:", error.message);
    throw new Error("Unable to load your saved drinks.");
  }

  const rows = (data ?? []) as MySavesRow[];

  return rows.map((r) => ({
    saveId: r.save_id,
    shopId: r.shop_id,
    shopName: r.shop_name,
    city: r.city,
    state: r.state,
    drinkId: r.drink_id,
    drinkName: r.drink_name,
    category: r.category,
    createdAt: r.created_at,
    sourceVisible: r.source_visible,
    sourceFirstName: r.source_first_name,
    sourceUsername: r.source_username,
  }));
}
