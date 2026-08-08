import type { BeverageCategory, Temperature } from "@/lib/supabase/types";

export interface LogFormData {
  shopId: string | null;
  shopName: string | null;
  drinkId: string | null;
  drinkName: string | null;
  beverageCategory: BeverageCategory;
  drinkRating: number | null;
  shopRating: number | null;
  photoFile: File | null;
  photoPreview: string | null;
  removePhoto: boolean;
  caption: string;
  price: string;
  size: string;
  temperature: Temperature | null;
}

export const INITIAL_LOG_FORM_DATA: LogFormData = {
  shopId: null,
  shopName: null,
  drinkId: null,
  drinkName: null,
  beverageCategory: "coffee",
  drinkRating: null,
  shopRating: null,
  photoFile: null,
  photoPreview: null,
  removePhoto: false,
  caption: "",
  price: "",
  size: "",
  temperature: null,
};
