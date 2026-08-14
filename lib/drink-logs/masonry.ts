/**
 * Distributes an already-ordered list into N columns round-robin: item
 * i goes into column (i % columnCount). Within any single column, order
 * is strictly preserved from the source list, item i is always earlier
 * in the source list than item i + columnCount landing in that same
 * column. This deliberately does not rebalance by height, that keeps
 * placement fully deterministic and easy to reason about, at the cost
 * of columns not always ending at exactly the same height.
 */
export function distributeIntoColumns<T>(items: T[], columnCount: number): T[][] {
  const count = Math.max(1, columnCount);
  const columns: T[][] = Array.from({ length: count }, () => []);
  items.forEach((item, index) => {
    columns[index % count].push(item);
  });
  return columns;
}
