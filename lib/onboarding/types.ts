import type { ShopPreferenceStatus } from "@/lib/supabase/types";

export interface WizardData {
  firstName: string;
  lastName: string;
  username: string;
  city: string;
  state: string;
  bio: string;
  avatarFile: File | null;
  avatarPreview: string | null;
  favoriteDrinks: string[];
  shopPreferences: Record<string, { shopName: string; status: ShopPreferenceStatus }>;
}

export const INITIAL_WIZARD_DATA: WizardData = {
  firstName: "",
  lastName: "",
  username: "",
  city: "",
  state: "",
  bio: "",
  avatarFile: null,
  avatarPreview: null,
  favoriteDrinks: [],
  shopPreferences: {},
};
