/**
 * Formats a timestamp as a short relative string ("2h ago", "3d ago"),
 * falling back to a plain date once it's more than a week old.
 */
export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatPrice(price: number | null): string | null {
  if (price === null) return null;
  return `$${price.toFixed(2)}`;
}
