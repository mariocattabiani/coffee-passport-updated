export type ShopPreferenceStatus = "favorite" | "want_to_try" | "been";
export type BeverageCategory = "coffee" | "tea";
export type Temperature = "hot" | "iced";

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;
  avatar_url: string | null;
  favorite_drinks: string[];
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShopPreference {
  id: string;
  profile_id: string;
  shop_id: string;
  shop_name: string;
  status: ShopPreferenceStatus;
  created_at: string;
}

export interface Shop {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  is_chain: boolean;
  created_at: string;
  updated_at: string;
}

export interface Drink {
  id: string;
  shop_id: string;
  name: string;
  category: BeverageCategory;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DrinkLog {
  id: string;
  user_id: string;
  shop_id: string;
  drink_id: string;
  beverage_category: BeverageCategory;
  drink_rating: number;
  shop_rating: number;
  caption: string | null;
  // Storage object path (bucket is private), not a public URL.
  photo_url: string | null;
  price: number | null;
  size: string | null;
  temperature: Temperature | null;
  created_at: string;
  logged_at: string;
  logged_date: string | null;
  visibility: "public" | "private";
  updated_at: string;
}
