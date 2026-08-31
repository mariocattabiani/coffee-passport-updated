export interface BeenCafe {
  shopId: string;
  shopName: string;
  city: string | null;
  state: string | null;
  logCount: number;
  /** Distinct drink names tried at this café, in most-recently-had
   *  order. A drink logged 4 times appears once here — logCount still
   *  reflects every log, this list is "what", not "how many times". */
  drinkNames: string[];
  lastLoggedAt: string;
}

interface BeenLogInput {
  shopId: string;
  shopName: string;
  city: string | null;
  state: string | null;
  drinkName: string;
  loggedAt: string;
}

/**
 * Aggregates a user's own drink logs into Been café entries: cafés
 * they've actually visited (at least one log), per the V1 definition
 * "unique café, not unique coffee". Callers are expected to pass logs
 * already sorted newest-logged-first (the same order every other
 * Passport query in this codebase already uses), so the first log seen
 * for a given shop is naturally its most recent visit, and the first
 * occurrence of each distinct drink name at that shop is its most
 * recent order too — no extra sort/lookup needed for either.
 *
 * Sorted most-recently-visited first, matching the same "Newest"
 * default already established as Coffee Trail's own default sort —
 * this answers "what have I been up to lately", which is what a
 * personal history view is for; alphabetical reads more like a
 * reference lookup and was considered and rejected as the V1 default.
 */
export function buildBeenCafes(logs: BeenLogInput[]): BeenCafe[] {
  const map = new Map<string, BeenCafe>();

  for (const log of logs) {
    const existing = map.get(log.shopId);
    if (existing) {
      existing.logCount += 1;
      if (!existing.drinkNames.includes(log.drinkName)) {
        existing.drinkNames.push(log.drinkName);
      }
    } else {
      map.set(log.shopId, {
        shopId: log.shopId,
        shopName: log.shopName,
        city: log.city,
        state: log.state,
        logCount: 1,
        drinkNames: [log.drinkName],
        lastLoggedAt: log.loggedAt,
      });
    }
  }

  return [...map.values()].sort((a, b) => (a.lastLoggedAt > b.lastLoggedAt ? -1 : 1));
}
