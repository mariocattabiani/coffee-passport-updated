export type ShopPreferenceStatus = "favorite" | "want_to_try" | "been";

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
