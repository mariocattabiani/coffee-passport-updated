export type AchievementCategory = "milestone" | "drink" | "explore" | "loyalty" | "content";
export type AchievementDifficulty = "Common" | "Uncommon" | "Rare" | "Legendary";
export type AchievementIcon = "coffee" | "cup" | "compass" | "store" | "camera" | "message" | "star" | "layers" | "map";

export interface PassportAchievementStats {
  totalLogs: number;
  coffeeLogs: number;
  teaLogs: number;
  uniqueShops: number;
  uniqueCities: number;
  uniqueStates: number;
  uniqueDrinkTypes: number;
  maxVisitsAtShop: number;
  photoLogs: number;
  captionLogs: number;
  fiveStarLogs: number;
  hotLogs: number;
  icedLogs: number;
  drinkNameCounts: Record<string, number>;
}

export interface AchievementDefinition {
  key: string;
  name: string;
  category: AchievementCategory;
  difficulty: AchievementDifficulty;
  icon: AchievementIcon;
  description: string;
  threshold: number;
  getProgress: (stats: PassportAchievementStats) => number;
  progressUnitSingular: string;
  progressUnitPlural: string;
  progressLabel: string;
}

interface AchievementLog {
  beverage_category: "coffee" | "tea";
  shop_id: string;
  drink_rating: number;
  caption: string | null;
  photo_url: string | null;
  temperature: "hot" | "iced" | null;
  drink: { name: string } | null;
  shop: {
    location_id: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
}

export interface EarnedAchievement {
  earnedAt: string;
  seenAt: string | null;
}

function normalizeDrinkName(name: string): string {
  return name.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

export function derivePassportAchievementStats(logs: AchievementLog[]): PassportAchievementStats {
  const shopCounts = new Map<string, number>();
  const drinkNameCounts: Record<string, number> = {};

  for (const log of logs) {
    shopCounts.set(log.shop_id, (shopCounts.get(log.shop_id) ?? 0) + 1);
    if (log.drink?.name) {
      const name = normalizeDrinkName(log.drink.name);
      drinkNameCounts[name] = (drinkNameCounts[name] ?? 0) + 1;
    }
  }

  return {
    totalLogs: logs.length,
    coffeeLogs: logs.filter((log) => log.beverage_category === "coffee").length,
    teaLogs: logs.filter((log) => log.beverage_category === "tea").length,
    uniqueShops: shopCounts.size,
    uniqueCities: new Set(
      logs.flatMap((log) => {
        if (log.shop?.location_id) return [`location:${log.shop.location_id}`];
        if (!log.shop?.city) return [];
        return [
          `fallback:${log.shop.city.trim().toLocaleLowerCase("en-US")}|${log.shop.state?.trim().toLocaleLowerCase("en-US") ?? ""}|${log.shop.country?.trim().toLocaleLowerCase("en-US") ?? ""}`,
        ];
      })
    ).size,
    uniqueStates: new Set(
      logs
        .filter(
          (log) =>
            log.shop?.state && log.shop.country?.trim().toLocaleLowerCase("en-US") === "united states"
        )
        .map((log) => log.shop!.state!.trim().toLocaleLowerCase("en-US"))
    ).size,
    uniqueDrinkTypes: Object.keys(drinkNameCounts).length,
    maxVisitsAtShop: Math.max(0, ...shopCounts.values()),
    photoLogs: logs.filter((log) => Boolean(log.photo_url)).length,
    captionLogs: logs.filter((log) => Boolean(log.caption?.trim())).length,
    fiveStarLogs: logs.filter((log) => Number(log.drink_rating) === 5).length,
    hotLogs: logs.filter((log) => log.temperature === "hot").length,
    icedLogs: logs.filter((log) => log.temperature === "iced").length,
    drinkNameCounts,
  };
}

const drinkProgress = (...names: string[]) => (stats: PassportAchievementStats) =>
  names.reduce((total, name) => total + (stats.drinkNameCounts[normalizeDrinkName(name)] ?? 0), 0);

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  { key: "first_sip", name: "First Sip", category: "milestone", difficulty: "Common", icon: "cup", description: "Log your first drink on Coffee Passport.", threshold: 1, getProgress: (s) => s.totalLogs, progressUnitSingular: "drink", progressUnitPlural: "drinks", progressLabel: "drinks logged" },
  { key: "coffee_25", name: "Coffee 25", category: "milestone", difficulty: "Uncommon", icon: "coffee", description: "Log 25 coffee drinks.", threshold: 25, getProgress: (s) => s.coffeeLogs, progressUnitSingular: "coffee", progressUnitPlural: "coffees", progressLabel: "coffees logged" },
  { key: "coffee_100", name: "Coffee 100", category: "milestone", difficulty: "Legendary", icon: "coffee", description: "Log 100 coffee drinks.", threshold: 100, getProgress: (s) => s.coffeeLogs, progressUnitSingular: "coffee", progressUnitPlural: "coffees", progressLabel: "coffees logged" },
  { key: "shop_explorer_5", name: "First Five", category: "explore", difficulty: "Uncommon", icon: "compass", description: "Explore 5 unique cafés.", threshold: 5, getProgress: (s) => s.uniqueShops, progressUnitSingular: "café", progressUnitPlural: "cafés", progressLabel: "cafés explored" },
  { key: "shop_explorer_10", name: "Shop Explorer", category: "explore", difficulty: "Rare", icon: "compass", description: "Explore 10 unique cafés.", threshold: 10, getProgress: (s) => s.uniqueShops, progressUnitSingular: "café", progressUnitPlural: "cafés", progressLabel: "cafés explored" },
  { key: "city_explorer_5", name: "City Explorer", category: "explore", difficulty: "Rare", icon: "map", description: "Explore coffee shops in 5 different cities.", threshold: 5, getProgress: (s) => s.uniqueCities, progressUnitSingular: "city", progressUnitPlural: "cities", progressLabel: "cities explored" },
  { key: "tea_curious", name: "Tea Curious", category: "drink", difficulty: "Uncommon", icon: "cup", description: "Log 5 tea drinks.", threshold: 5, getProgress: (s) => s.teaLogs, progressUnitSingular: "tea", progressUnitPlural: "teas", progressLabel: "teas logged" },

  { key: "first_latte", name: "Latte Be Honest", category: "drink", difficulty: "Common", icon: "cup", description: "Log your first latte.", threshold: 1, getProgress: drinkProgress("Latte"), progressUnitSingular: "latte", progressUnitPlural: "lattes", progressLabel: "lattes logged" },
  { key: "first_cappuccino", name: "Foam Sweet Foam", category: "drink", difficulty: "Common", icon: "cup", description: "Log your first cappuccino.", threshold: 1, getProgress: drinkProgress("Cappuccino"), progressUnitSingular: "cappuccino", progressUnitPlural: "cappuccinos", progressLabel: "cappuccinos logged" },
  { key: "first_flat_white", name: "Flat Out", category: "drink", difficulty: "Common", icon: "cup", description: "Log your first flat white.", threshold: 1, getProgress: drinkProgress("Flat White"), progressUnitSingular: "flat white", progressUnitPlural: "flat whites", progressLabel: "flat whites logged" },
  { key: "first_cortado", name: "Cut to the Chase", category: "drink", difficulty: "Common", icon: "cup", description: "Log your first cortado.", threshold: 1, getProgress: drinkProgress("Cortado"), progressUnitSingular: "cortado", progressUnitPlural: "cortados", progressLabel: "cortados logged" },
  { key: "first_espresso", name: "Small Cup, Big Decisions", category: "drink", difficulty: "Common", icon: "coffee", description: "Log your first espresso.", threshold: 1, getProgress: drinkProgress("Espresso"), progressUnitSingular: "espresso", progressUnitPlural: "espressos", progressLabel: "espressos logged" },
  { key: "first_americano", name: "Watered Down, Never Washed Up", category: "drink", difficulty: "Common", icon: "coffee", description: "Log your first Americano.", threshold: 1, getProgress: drinkProgress("Americano"), progressUnitSingular: "Americano", progressUnitPlural: "Americanos", progressLabel: "Americanos logged" },
  { key: "first_drip_coffee", name: "Old Reliable", category: "drink", difficulty: "Common", icon: "coffee", description: "Log your first drip coffee.", threshold: 1, getProgress: drinkProgress("Drip Coffee"), progressUnitSingular: "drip coffee", progressUnitPlural: "drip coffees", progressLabel: "drip coffees logged" },
  { key: "first_cold_brew", name: "Cold Blooded", category: "drink", difficulty: "Common", icon: "cup", description: "Log your first cold brew or nitro cold brew.", threshold: 1, getProgress: drinkProgress("Cold Brew", "Nitro Cold Brew"), progressUnitSingular: "cold brew", progressUnitPlural: "cold brews", progressLabel: "cold brews logged" },
  { key: "first_mocha", name: "Chocolate Has Entered the Chat", category: "drink", difficulty: "Common", icon: "cup", description: "Log your first mocha.", threshold: 1, getProgress: drinkProgress("Mocha"), progressUnitSingular: "mocha", progressUnitPlural: "mochas", progressLabel: "mochas logged" },
  { key: "first_macchiato", name: "Marked for Greatness", category: "drink", difficulty: "Common", icon: "cup", description: "Log your first macchiato.", threshold: 1, getProgress: drinkProgress("Macchiato"), progressUnitSingular: "macchiato", progressUnitPlural: "macchiatos", progressLabel: "macchiatos logged" },
  { key: "first_chai_latte", name: "Spice Route", category: "drink", difficulty: "Common", icon: "cup", description: "Log your first chai latte.", threshold: 1, getProgress: drinkProgress("Chai Latte"), progressUnitSingular: "chai latte", progressUnitPlural: "chai lattes", progressLabel: "chai lattes logged" },
  { key: "first_matcha", name: "Green Machine", category: "drink", difficulty: "Common", icon: "cup", description: "Log your first matcha.", threshold: 1, getProgress: drinkProgress("Matcha"), progressUnitSingular: "matcha", progressUnitPlural: "matchas", progressLabel: "matchas logged" },
  { key: "first_tea", name: "Leaf Me Alone", category: "drink", difficulty: "Common", icon: "cup", description: "Log your first tea.", threshold: 1, getProgress: (s) => s.teaLogs, progressUnitSingular: "tea", progressUnitPlural: "teas", progressLabel: "teas logged" },
  { key: "passport_sampler", name: "Passport Sampler", category: "drink", difficulty: "Uncommon", icon: "layers", description: "Log 5 different drink types.", threshold: 5, getProgress: (s) => s.uniqueDrinkTypes, progressUnitSingular: "drink type", progressUnitPlural: "drink types", progressLabel: "drink types tried" },
  { key: "switch_hitter", name: "Switch Hitter", category: "drink", difficulty: "Uncommon", icon: "layers", description: "Log both coffee and tea.", threshold: 2, getProgress: (s) => Number(s.coffeeLogs > 0) + Number(s.teaLogs > 0), progressUnitSingular: "category", progressUnitPlural: "categories", progressLabel: "categories tried" },
  { key: "hot_and_cold", name: "Hot and Cold", category: "drink", difficulty: "Uncommon", icon: "layers", description: "Log both a hot and an iced drink.", threshold: 2, getProgress: (s) => Number(s.hotLogs > 0) + Number(s.icedLogs > 0), progressUnitSingular: "temperature", progressUnitPlural: "temperatures", progressLabel: "temperatures tried" },

  { key: "regular_behavior", name: "Regular Behavior", category: "loyalty", difficulty: "Uncommon", icon: "store", description: "Visit the same café 5 times.", threshold: 5, getProgress: (s) => s.maxVisitsAtShop, progressUnitSingular: "visit", progressUnitPlural: "visits", progressLabel: "visits to one café" },
  { key: "they_know_your_order", name: "They Know Your Order", category: "loyalty", difficulty: "Rare", icon: "store", description: "Visit the same café 10 times.", threshold: 10, getProgress: (s) => s.maxVisitsAtShop, progressUnitSingular: "visit", progressUnitPlural: "visits", progressLabel: "visits to one café" },

  { key: "first_photo", name: "Proof or It Didn't Happen", category: "content", difficulty: "Common", icon: "camera", description: "Add a photo to a log.", threshold: 1, getProgress: (s) => s.photoLogs, progressUnitSingular: "photo", progressUnitPlural: "photos", progressLabel: "photo logs" },
  { key: "photo_10", name: "Camera Eats First", category: "content", difficulty: "Rare", icon: "camera", description: "Add photos to 10 logs.", threshold: 10, getProgress: (s) => s.photoLogs, progressUnitSingular: "photo", progressUnitPlural: "photos", progressLabel: "photo logs" },
  { key: "first_caption", name: "Caption This", category: "content", difficulty: "Common", icon: "message", description: "Write your first caption.", threshold: 1, getProgress: (s) => s.captionLogs, progressUnitSingular: "caption", progressUnitPlural: "captions", progressLabel: "captioned logs" },
  { key: "perfect_score", name: "Perfect Score", category: "content", difficulty: "Common", icon: "star", description: "Give a drink 5 stars.", threshold: 1, getProgress: (s) => s.fiveStarLogs, progressUnitSingular: "five-star rating", progressUnitPlural: "five-star ratings", progressLabel: "five-star ratings" },

  { key: "state_lines", name: "State Lines", category: "explore", difficulty: "Rare", icon: "map", description: "Log cafés in 2 different states.", threshold: 2, getProgress: (s) => s.uniqueStates, progressUnitSingular: "state", progressUnitPlural: "states", progressLabel: "states explored" },
];

export interface AchievementProgress {
  definition: AchievementDefinition;
  progress: number;
  percent: number;
  earned: boolean;
  earnedAt: string | null;
  isNew: boolean;
}

export function computeAchievementProgress(stats: PassportAchievementStats, earnedMap: Map<string, EarnedAchievement>): AchievementProgress[] {
  return ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const rawProgress = definition.getProgress(stats);
    const earned = earnedMap.get(definition.key);
    return { definition, progress: Math.min(rawProgress, definition.threshold), percent: Math.min(100, Math.round((rawProgress / definition.threshold) * 100)), earned: Boolean(earned), earnedAt: earned?.earnedAt ?? null, isNew: Boolean(earned && earned.seenAt === null) };
  });
}

export function pluralizeUnit(count: number, singular: string, plural: string): string { return count === 1 ? singular : plural; }
export function formatRemainingPhrase(remaining: number, singular: string, plural: string, suffix: string): string { return `${remaining} ${pluralizeUnit(remaining, singular, plural)} ${suffix}`; }

export interface StampDisplayItem {
  key: string;
  name: string;
  category: AchievementCategory;
  difficulty: AchievementDifficulty;
  icon: AchievementIcon;
  description: string;
  threshold: number;
  progress: number;
  earned: boolean;
  earnedAt: string | null;
  isNew: boolean;
  progressUnitSingular: string;
  progressUnitPlural: string;
}

export function toStampDisplayItems(progressList: AchievementProgress[]): StampDisplayItem[] {
  return progressList.map((item) => ({ key: item.definition.key, name: item.definition.name, category: item.definition.category, difficulty: item.definition.difficulty, icon: item.definition.icon, description: item.definition.description, threshold: item.definition.threshold, progress: item.progress, earned: item.earned, earnedAt: item.earnedAt, isNew: item.isNew, progressUnitSingular: item.definition.progressUnitSingular, progressUnitPlural: item.definition.progressUnitPlural }));
}

export interface UpNextGoalDisplay { name: string; progress: number; threshold: number; percent: number; progressUnitPlural: string; }
export function toUpNextGoalDisplay(goal: AchievementProgress | null): UpNextGoalDisplay | null {
  if (!goal) return null;
  return { name: goal.definition.name, progress: goal.progress, threshold: goal.definition.threshold, percent: goal.percent, progressUnitPlural: goal.definition.progressUnitPlural };
}

const UP_NEXT_MAX = 3;
const UP_NEXT_MIN_PERCENT_FLOOR = 15;
const UP_NEXT_MAX_PER_CATEGORY = 2;

export function selectUpNext(progressList: AchievementProgress[]): AchievementProgress[] {
  const candidates = [...progressList].filter((p) => !p.earned).sort((a, b) => b.percent - a.percent);
  const picked: AchievementProgress[] = [];
  const categoryCounts = new Map<AchievementCategory, number>();
  for (const candidate of candidates) {
    if (picked.length >= UP_NEXT_MAX) break;
    if (candidate.percent < UP_NEXT_MIN_PERCENT_FLOOR && picked.length > 0) continue;
    const count = categoryCounts.get(candidate.definition.category) ?? 0;
    if (count >= UP_NEXT_MAX_PER_CATEGORY) continue;
    picked.push(candidate);
    categoryCounts.set(candidate.definition.category, count + 1);
  }
  if (picked.length < UP_NEXT_MAX) {
    for (const candidate of candidates) {
      if (picked.length >= UP_NEXT_MAX) break;
      if (picked.includes(candidate)) continue;
      if (candidate.percent < UP_NEXT_MIN_PERCENT_FLOOR && picked.length > 0) continue;
      picked.push(candidate);
    }
  }
  return picked;
}

export interface PlaceExplored { city: string; state: string; shopCount: number; }
export function computePlacesExplored(logs: { shopId: string; city: string | null; state: string | null }[]): PlaceExplored[] {
  const map = new Map<string, { city: string; state: string; shopIds: Set<string> }>();
  for (const log of logs) {
    if (!log.city || !log.state) continue;
    const key = `${log.city.toLowerCase().trim()}|${log.state.toLowerCase().trim()}`;
    const existing = map.get(key);
    if (existing) existing.shopIds.add(log.shopId);
    else map.set(key, { city: log.city, state: log.state, shopIds: new Set([log.shopId]) });
  }
  return [...map.values()].map((v) => ({ city: v.city, state: v.state, shopCount: v.shopIds.size })).sort((a, b) => b.shopCount - a.shopCount);
}
