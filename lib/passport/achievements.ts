export type AchievementCategory = "milestone" | "shop" | "city" | "drink";

export interface AchievementDefinition {
  key: string;
  name: string;
  category: AchievementCategory;
  description: string;
  threshold: number;
  getProgress: (stats: PassportAchievementStats) => number;
  /** Display-only, serializable unit metadata, so "6 cafés" vs
   *  "6 coffees" vs "6 cities" reads correctly wherever progress is
   *  shown, never a formatting function, just plain strings, so this
   *  data is always safe wherever it needs to travel, including across
   *  a Server -> Client Component boundary. */
    progressUnitSingular: string;
    progressUnitPlural: string;
  /** The plural unit plus its verb, e.g. "cafés explored", used for
   *  "X of Y {progressLabel}" style copy. */
    progressLabel: string;
}

export interface PassportAchievementStats {
  totalLogs: number;
  coffeeLogs: number;
  uniqueShops: number;
  uniqueCities: number;
  teaLogs: number;
}

/**
 * The 7 V1 achievements. This is the display/UX side of the system,
 * names, descriptions, categories, and how progress is derived from
 * already-computed stats. The actual AWARD decision never trusts this
 * file, evaluate_passport_achievements() in Postgres independently
 * re-derives qualification from drink_logs itself, this module can
 * only ever influence what's displayed, never what gets persisted.
 */
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    key: "first_sip",
    name: "First Sip",
    category: "milestone",
    description: "Log your first drink on Coffee Passport.",
    threshold: 1,
    getProgress: (s) => s.totalLogs,
    progressUnitSingular: "drink",
    progressUnitPlural: "drinks",
    progressLabel: "drinks logged",
  },
  {
    key: "coffee_25",
    name: "Coffee 25",
    category: "milestone",
    description: "Log 25 coffee drinks.",
    threshold: 25,
    getProgress: (s) => s.coffeeLogs,
    progressUnitSingular: "coffee",
    progressUnitPlural: "coffees",
    progressLabel: "coffees logged",
  },
  {
    key: "coffee_100",
    name: "Coffee 100",
    category: "milestone",
    description: "Log 100 coffee drinks.",
    threshold: 100,
    getProgress: (s) => s.coffeeLogs,
    progressUnitSingular: "coffee",
    progressUnitPlural: "coffees",
    progressLabel: "coffees logged",
  },
  {
    key: "shop_explorer_5",
    name: "First Five",
    category: "shop",
    description: "Explore 5 unique cafés.",
    threshold: 5,
    getProgress: (s) => s.uniqueShops,
    progressUnitSingular: "café",
    progressUnitPlural: "cafés",
    progressLabel: "cafés explored",
  },
  {
    key: "shop_explorer_10",
    name: "Shop Explorer",
    category: "shop",
    description: "Explore 10 unique cafés.",
    threshold: 10,
    getProgress: (s) => s.uniqueShops,
    progressUnitSingular: "café",
    progressUnitPlural: "cafés",
    progressLabel: "cafés explored",
  },
  {
    key: "city_explorer_5",
    name: "City Explorer",
    category: "city",
    description: "Explore coffee shops in 5 different cities.",
    threshold: 5,
    getProgress: (s) => s.uniqueCities,
    progressUnitSingular: "city",
    progressUnitPlural: "cities",
    progressLabel: "cities explored",
  },
  {
    key: "tea_curious",
    name: "Tea Curious",
    category: "drink",
    description: "Log 5 tea drinks.",
    threshold: 5,
    getProgress: (s) => s.teaLogs,
    progressUnitSingular: "tea",
    progressUnitPlural: "teas",
    progressLabel: "teas logged",
  },
];

export interface AchievementProgress {
  definition: AchievementDefinition;
  progress: number;
  percent: number;
  earned: boolean;
  earnedAt: string | null;
}

/** Never persisted, always recalculated fresh from whatever stats were
 *  just derived from the current drink_logs. earnedMap comes from the
 *  passport_achievements table, the one thing that IS persisted. */
export function computeAchievementProgress(
  stats: PassportAchievementStats,
  earnedMap: Map<string, string>
): AchievementProgress[] {
  return ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const rawProgress = definition.getProgress(stats);
    const earnedAt = earnedMap.get(definition.key) ?? null;
    return {
      definition,
      progress: Math.min(rawProgress, definition.threshold),
      percent: Math.min(100, Math.round((rawProgress / definition.threshold) * 100)),
      earned: earnedAt !== null,
      earnedAt,
    };
  });
}

/** Pure function, never itself passed as a prop, safe to call from
 *  either server or client code, only its string return value ever
 *  crosses any boundary. */
export function pluralizeUnit(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/** "4 cafés to go" / "1 café to unlock" etc, suffix varies by surface,
 *  the unit itself is always correct and consistent. */
export function formatRemainingPhrase(
  remaining: number,
  singular: string,
  plural: string,
  suffix: string
): string {
  return `${remaining} ${pluralizeUnit(remaining, singular, plural)} ${suffix}`;
}

/**
 * Client-safe display shape for Stamps: only primitives and strings,
 * no getProgress, no function of any kind. AchievementProgress (which
 * embeds the full AchievementDefinition, including getProgress) must
 * never be passed directly into a Client Component, Next.js can't
 * serialize a function across that boundary. Server components (like
 * UpNext) that never cross into client code can keep using
 * AchievementProgress directly, they don't need this.
 */
export interface StampDisplayItem {
  key: string;
  name: string;
  category: AchievementCategory;
  description: string;
  threshold: number;
  progress: number;
  earned: boolean;
  earnedAt: string | null;
  progressUnitSingular: string;
  progressUnitPlural: string;
}

export function toStampDisplayItems(progressList: AchievementProgress[]): StampDisplayItem[] {
  return progressList.map((item) => ({
    key: item.definition.key,
    name: item.definition.name,
    category: item.definition.category,
    description: item.definition.description,
    threshold: item.definition.threshold,
    progress: item.progress,
    earned: item.earned,
    earnedAt: item.earnedAt,
    progressUnitSingular: item.definition.progressUnitSingular,
    progressUnitPlural: item.definition.progressUnitPlural,
  }));
}

const UP_NEXT_MAX = 3;
const UP_NEXT_MIN_PERCENT_FLOOR = 15;
const UP_NEXT_MAX_PER_CATEGORY = 2;

/**
 * Deterministic, no personalization: excludes earned achievements,
 * sorts by closeness to completion, caps at 2 picks per category for
 * variety, and never pads a slot with a very distant goal (below a 15%
 * floor) purely to reach 3, fewer than 3 is fine if that's genuinely
 * all that's reasonably close right now. A below-floor goal is still
 * shown if it's literally the only thing left, so Up Next is never
 * empty while an achievement remains unearned.
 */
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

export interface PlaceExplored {
  city: string;
  state: string;
  shopCount: number;
}

/** Null-city shops are excluded entirely, the same precedent already
 *  established by the Coffee Map for shops without coordinates. */
export function computePlacesExplored(
  logs: { shopId: string; city: string | null; state: string | null }[]
): PlaceExplored[] {
  const map = new Map<string, { city: string; state: string; shopIds: Set<string> }>();

  for (const log of logs) {
    if (!log.city || !log.state) continue;
    const key = `${log.city.toLowerCase().trim()}|${log.state.toLowerCase().trim()}`;
    const existing = map.get(key);
    if (existing) {
      existing.shopIds.add(log.shopId);
    } else {
      map.set(key, { city: log.city, state: log.state, shopIds: new Set([log.shopId]) });
    }
  }

  return [...map.values()]
    .map((v) => ({ city: v.city, state: v.state, shopCount: v.shopIds.size }))
    .sort((a, b) => b.shopCount - a.shopCount);
}
