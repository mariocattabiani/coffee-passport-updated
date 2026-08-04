import { cn } from "@/lib/utils";

interface StampBadgeProps {
  label: string;
  rotate?: number;
  color?: string;
  className?: string;
}

export function StampBadge({
  label,
  rotate = -6,
  color = "#5B3A29",
  className,
}: StampBadgeProps) {
  const pathId = `stampPath-${label.replace(/\s+/g, "")}`;
  return (
    <div
      className={cn("h-24 w-24 shrink-0", className)}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <defs>
          <path id={pathId} d="M 12,50 A 38,38 0 1 1 88,50" fill="none" />
        </defs>
        <circle cx="50" cy="50" r="44" fill="none" stroke={color} strokeWidth="1.5" />
        <circle
          cx="50"
          cy="50"
          r="37"
          fill="none"
          stroke={color}
          strokeWidth="1"
          strokeDasharray="1.5 3"
        />
        <text fill={color} fontSize="7.5" letterSpacing="1.5" fontWeight={600}>
          <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
            {label}
          </textPath>
        </text>
        <circle cx="50" cy="68" r="2" fill={color} />
      </svg>
    </div>
  );
}
