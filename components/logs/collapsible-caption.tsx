"use client";

import { useState } from "react";

interface CollapsibleCaptionProps {
  text: string;
}

// Rough heuristic for "would this wrap past 3 lines at typical card
// width". Short captions render plainly with no reserved space for a
// toggle that would never be needed; only genuinely long captions pay
// for the collapse/expand affordance.
const COLLAPSE_THRESHOLD = 165;

export function CollapsibleCaption({ text }: CollapsibleCaptionProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > COLLAPSE_THRESHOLD;

  if (!isLong) {
    return <p className="mt-2 break-words text-sm text-charcoal/70">{text}</p>;
  }

  return (
    <div className="mt-2 min-w-0 break-words text-sm text-charcoal/70">
      <p className={expanded ? "" : "line-clamp-3"}>{text}</p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-0.5 font-medium text-espresso/70 hover:text-espresso"
      >
        {expanded ? "less" : "more"}
      </button>
    </div>
  );
}
