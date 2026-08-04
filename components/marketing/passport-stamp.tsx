import { cn } from "@/lib/utils";

interface PassportStampProps {
  label?: string;
  sublabel?: string;
  className?: string;
}

/**
 * A circular ink-stamp badge — the one "signature" visual element of the
 * marketing site. It nods to the passport concept (like a customs stamp)
 * without ever showing a literal passport book, per the design system's
 * "subtle passport influence" rule.
 */
export function PassportStamp({
  label = "COFFEE PASSPORT",
  sublabel = "EST. 2026",
  className,
}: PassportStampProps) {
  return (
    <div
      className={cn(
        "relative flex h-40 w-40 shrink-0 rotate-[-8deg] animate-stamp-in items-center justify-center sm:h-48 sm:w-48",
        className
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <defs>
          <path
            id="stampCircleTop"
            d="M 20,100 A 80,80 0 0 1 180,100"
            fill="none"
          />
          <path
            id="stampCircleBottom"
            d="M 180,100 A 80,80 0 0 1 20,100"
            fill="none"
          />
        </defs>
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke="#5B3A29"
          strokeWidth="2"
        />
        <circle
          cx="100"
          cy="100"
          r="78"
          fill="none"
          stroke="#5B3A29"
          strokeWidth="1"
          strokeDasharray="2 4"
        />
        <text fill="#5B3A29" fontSize="12.5" letterSpacing="3" fontWeight={600}>
          <textPath href="#stampCircleTop" startOffset="50%" textAnchor="middle">
            {label}
          </textPath>
        </text>
        <text fill="#5B3A29" fontSize="10" letterSpacing="2.5" fontWeight={500}>
          <textPath href="#stampCircleBottom" startOffset="50%" textAnchor="middle">
            {sublabel}
          </textPath>
        </text>
        {/* simple cup glyph at the center */}
        <g transform="translate(100,100)">
          <path
            d="M -22,-14 L 18,-14 L 14,16 A 16,16 0 0 1 -18,16 Z"
            fill="none"
            stroke="#5B3A29"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M 18,-8 C 32,-8 32,10 18,9"
            fill="none"
            stroke="#5B3A29"
            strokeWidth="2.5"
          />
          <path
            d="M -12,-14 C -12,-22 -4,-22 -6,-14"
            fill="none"
            stroke="#5B3A29"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}
