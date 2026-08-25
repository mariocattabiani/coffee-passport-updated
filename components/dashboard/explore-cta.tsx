import Link from "next/link";
import { MapPinned, ArrowRight } from "lucide-react";

/** A compact, always-relevant entry point into café discovery, the
 *  "Where should I go?" half of the loop, paired alongside Continue
 *  Your Passport's "how am I progressing?" half. */
export function ExploreCta() {
  return (
    <Link
      href="/explore"
      className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white p-5 shadow-soft transition-shadow hover:shadow-card"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage/10">
          <MapPinned className="h-4 w-4 text-sage" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sage">Explore</p>
          <p className="mt-0.5 font-medium text-espresso">Find a café worth your next coffee</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-charcoal/40" aria-hidden="true" />
    </Link>
  );
}
