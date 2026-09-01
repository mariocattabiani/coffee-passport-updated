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
  photoPositionX: number;
  photoPositionY: number;
  removePhoto: boolean;
  caption: string;
  price: string;
  size: string;
  temperature: Temperature | null;
  /** "YYYY-MM-DD" if the person picked a backdated date, empty string
   *  if left as-is (meaning "use now"). */
  loggedAtDate: string;
  /** Public by default, per the Sprint 3E product decision. */
  visibility: "public" | "private";
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
  photoPositionX: 50,
  photoPositionY: 50,
  removePhoto: false,
  caption: "",
  price: "",
  size: "",
  temperature: null,
  loggedAtDate: "",
  visibility: "public",
};
