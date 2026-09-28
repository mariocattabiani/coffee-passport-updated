/**
 * The shape deriveShopUserHistory actually reads off one of the
 * viewer's own logs at a single café. Deliberately narrower than
 * app/shops/[id]/page.tsx's own OwnLogRow (which also carries id,
 * caption, photo_url, price, size, temperature, created_at — none of
 * which this calculation touches) — OwnLogRow satisfies this shape
 * structurally, so the page passes `ownLogs` straight through with no
 * conversion.
 */
export interface ShopVisitLogRow {
  shop_rating: number;
  drink_rating: number;
  logged_at: string;
  drink: { id: string; name: string } | null;
}

export interface ShopVisitStats {
  logCount: number;
  avgOwnRating: number | null;
  mostRecentLoggedAt: string | null;
  favoriteDrinkName: string | null;
}

/**
 * "Your Passport here": a small, already-filtered (one user, one
 * shop) dataset, aggregated exactly the way Passport's own favorites
 * logic aggregates — this is not the large cross-user aggregation the
 * page's own RPCs (get_shop_rating_summary, get_shop_top_drinks, etc.)
 * exist to avoid doing client-side.
 *
 * Returns null for an empty history, matching the page's own
 * `ownLogs.length > 0` guard exactly.
 *
 * `logs` is expected already ordered newest-first — the same
 * assumption the page's own query guarantees — since
 * mostRecentLoggedAt is read directly off `logs[0]` rather than
 * computed by comparison.
 */
export function deriveShopUserHistory(logs: ShopVisitLogRow[]): ShopVisitStats | null {
  if (logs.length === 0) return null;

  const avgOwnRating = Math.round((logs.reduce((sum, l) => sum + l.shop_rating, 0) / logs.length) * 10) / 10;

  const drinkAgg = new Map<string, { name: string; count: number; ratingSum: number }>();
  for (const l of logs) {
    const key = l.drink?.id ?? "unknown";
    const name = l.drink?.name ?? "Unknown drink";
    const existing = drinkAgg.get(key);
    if (existing) {
      existing.count += 1;
      existing.ratingSum += l.drink_rating;
    } else {
      drinkAgg.set(key, { name, count: 1, ratingSum: l.drink_rating });
    }
  }
  const favorite = [...drinkAgg.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const avgA = a.ratingSum / a.count;
    const avgB = b.ratingSum / b.count;
    if (avgB !== avgA) return avgB - avgA;
    return a.name.localeCompare(b.name);
  })[0];

  return {
    logCount: logs.length,
    avgOwnRating,
    // Already ordered newest-first by the caller's own query.
    mostRecentLoggedAt: logs[0].logged_at,
    favoriteDrinkName: favorite?.name ?? null,
  };
}
