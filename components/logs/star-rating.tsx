"use client";

import { useId, useState } from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

const VALUES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

interface StarRatingProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}

export function StarRating({ label, value, onChange }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const groupId = useId();
  const displayValue = hoverValue ?? value ?? 0;

  function moveTo(nextValue: number) {
    onChange(Math.max(0.5, Math.min(5, nextValue)));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = value ? VALUES.indexOf(value) : -1;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      moveTo(VALUES[Math.min(currentIndex + 1, VALUES.length - 1)] ?? VALUES[0]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      moveTo(currentIndex <= 0 ? VALUES[0] : VALUES[currentIndex - 1]);
    } else if (e.key === "Home") {
      e.preventDefault();
      moveTo(VALUES[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      moveTo(VALUES[VALUES.length - 1]);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p id={groupId} className="text-sm font-medium text-charcoal">
          {label}
        </p>
        <span
          className={cn(
            "text-sm font-semibold tabular-nums transition-opacity",
            value !== null ? "text-espresso opacity-100" : "opacity-0"
          )}
          aria-hidden="true"
        >
          {(value ?? 0).toFixed(1)}
        </span>
      </div>

      <div
        role="radiogroup"
        aria-labelledby={groupId}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => setHoverValue(null)}
        className="mt-2 flex gap-1"
      >
        {[0, 1, 2, 3, 4].map((starIndex) => {
          const fillPercent = Math.max(0, Math.min(1, displayValue - starIndex)) * 100;
          const halfValue = starIndex + 0.5;
          const fullValue = starIndex + 1;
          // Roving tabindex: only the currently-selected star stop (or
          // the very first one, if nothing is picked yet) is a tab
          // stop, matching the standard radiogroup keyboard pattern.
          const halfIsTabbable = value === halfValue || (value === null && starIndex === 0);
          const fullIsTabbable = value === fullValue;

          return (
            <div key={starIndex} className="relative h-9 w-9 shrink-0">
              <Star className="absolute inset-0 h-9 w-9 text-charcoal/20" strokeWidth={1.75} />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillPercent}%` }}
                aria-hidden="true"
              >
                <Star className="h-9 w-9 fill-gold text-gold" strokeWidth={1.75} />
              </div>

              <button
                type="button"
                role="radio"
                aria-checked={value === halfValue}
                aria-label={`${halfValue} out of 5 stars`}
                tabIndex={halfIsTabbable ? 0 : -1}
                className="absolute inset-y-0 left-0 w-1/2 rounded-l-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-espresso"
                onMouseEnter={() => setHoverValue(halfValue)}
                onFocus={() => setHoverValue(halfValue)}
                onBlur={() => setHoverValue(null)}
                onClick={() => onChange(halfValue)}
              />
              <button
                type="button"
                role="radio"
                aria-checked={value === fullValue}
                aria-label={`${fullValue} out of 5 stars`}
                tabIndex={fullIsTabbable ? 0 : -1}
                className="absolute inset-y-0 right-0 w-1/2 rounded-r-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-espresso"
                onMouseEnter={() => setHoverValue(fullValue)}
                onFocus={() => setHoverValue(fullValue)}
                onBlur={() => setHoverValue(null)}
                onClick={() => onChange(fullValue)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
