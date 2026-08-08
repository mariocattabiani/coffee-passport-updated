import { Star } from "lucide-react";

interface StarDisplayProps {
  rating: number;
  size?: string;
  showValue?: boolean;
}

/**
 * Renders exactly 5 stars with true half-star fills, e.g. 2.5 renders as
 * 2 full, 1 half, 2 empty, never rounded up or down to a whole star.
 * Used anywhere a saved rating is displayed (dashboard cards today,
 * shop/drink pages later).
 */
export function StarDisplay({ rating, size = "h-4 w-4", showValue = false }: StarDisplayProps) {
  return (
    <div
      className="flex items-center gap-1.5"
      role="img"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      <div className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((starIndex) => {
          const fillPercent = Math.max(0, Math.min(1, rating - starIndex)) * 100;
          return (
            <div key={starIndex} className={`relative ${size} shrink-0`} aria-hidden="true">
              <Star className={`absolute inset-0 ${size} text-charcoal/20`} strokeWidth={1.75} />
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
                <Star className={`${size} fill-gold text-gold`} strokeWidth={1.75} />
              </div>
            </div>
          );
        })}
      </div>
      {showValue && <span className="text-sm font-semibold text-espresso">{rating.toFixed(1)}</span>}
    </div>
  );
}
