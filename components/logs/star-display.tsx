import { Star } from "lucide-react";

interface StarDisplayProps {
  rating: number;
  size?: string;
  showValue?: boolean;
  /** When true, renders a single filled star + numeric value below
   *  `sm` instead of the full 5-star row, and the full 5-star row from
   *  `sm` up — a fast-scan feed treatment, not a data change. Both
   *  variants share one aria-label; only one is ever actually in the
   *  accessibility tree at a time since Tailwind's responsive
   *  `hidden`/`sm:hidden` compile to real `display: none`. */
  compactOnMobile?: boolean;
}

/**
 * Renders exactly 5 stars with true half-star fills, e.g. 2.5 renders as
 * 2 full, 1 half, 2 empty, never rounded up or down to a whole star.
 * Used anywhere a saved rating is displayed (dashboard cards today,
 * shop/drink pages later).
 */
export function StarDisplay({ rating, size = "h-4 w-4", showValue = false, compactOnMobile = false }: StarDisplayProps) {
  const label = `${rating.toFixed(1)} out of 5 stars`;

  const fullStars = (
    <div className="flex items-center gap-1.5" role="img" aria-label={label}>
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

  if (!compactOnMobile) return fullStars;

  return (
    <>
      <div className="flex shrink-0 items-center gap-1 sm:hidden" role="img" aria-label={label}>
        <Star className="h-3.5 w-3.5 shrink-0 fill-gold text-gold" strokeWidth={1.75} aria-hidden="true" />
        <span className="text-sm font-semibold text-espresso">{rating.toFixed(1)}</span>
      </div>
      <div className="hidden sm:block">{fullStars}</div>
    </>
  );
}
