export interface MockShop {
  id: string;
  name: string;
  city: string;
}

// Placeholder data only. Once Google Places is integrated (a later sprint,
// per the PRD), this file goes away and shop search becomes real.
export const MOCK_SHOPS: MockShop[] = [
  { id: "fern-bloom", name: "Fern & Bloom", city: "Austin, TX" },
  { id: "north-end", name: "North End Coffee", city: "Austin, TX" },
  { id: "marble-bar", name: "The Marble Bar", city: "Austin, TX" },
  { id: "nine-bar", name: "Nine Bar Coffee", city: "Austin, TX" },
  { id: "reading-room", name: "The Reading Room", city: "Austin, TX" },
  { id: "willow-co", name: "Willow & Co.", city: "Austin, TX" },
  { id: "cardinal", name: "Cardinal Coffee Co.", city: "Austin, TX" },
  { id: "northside-roasters", name: "Northside Roasters", city: "Austin, TX" },
];
