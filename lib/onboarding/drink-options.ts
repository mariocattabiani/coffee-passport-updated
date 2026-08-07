export type BeverageCategory = "coffee" | "tea";

export interface DrinkOption {
  name: string;
  category: BeverageCategory;
}

// Coffee is the primary, default-visible category. Tea is a smaller,
// secondary category (see components/onboarding/step-drinks.tsx for how
// the two are displayed with different visual weight).
export const DRINK_OPTIONS: DrinkOption[] = [
  { name: "Latte", category: "coffee" },
  { name: "Cappuccino", category: "coffee" },
  { name: "Flat White", category: "coffee" },
  { name: "Cortado", category: "coffee" },
  { name: "Espresso", category: "coffee" },
  { name: "Americano", category: "coffee" },
  { name: "Drip Coffee", category: "coffee" },
  { name: "Cold Brew", category: "coffee" },
  { name: "Nitro Cold Brew", category: "coffee" },
  { name: "Mocha", category: "coffee" },
  { name: "Macchiato", category: "coffee" },
  { name: "Chai Latte", category: "coffee" },
  { name: "Matcha", category: "coffee" },
  { name: "Green Tea", category: "tea" },
  { name: "Black Tea", category: "tea" },
  { name: "Oolong", category: "tea" },
  { name: "Peach", category: "tea" },
];
