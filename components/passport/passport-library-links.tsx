import Link from "next/link";
import { CircleCheck, Bookmark, ChevronRight } from "lucide-react";

interface PassportLibraryLinksProps {
  beenCount: number;
  wantToTryCount: number;
}

/**
 * The Beli-style "Been / Want to Try" entry point, adapted to Coffee
 * Passport's own visual language rather than copied. One responsive
 * grid, not two separately-coded mobile/desktop layouts: at the
 * default single column it reads as two full-width compact rows with
 * a gap between them (the "divider/separation" mobile wants), and at
 * `sm` and up the same two elements simply sit side by side as two
 * balanced utility cards (what desktop wants) — no duplicated markup,
 * one set of cards, two responsive arrangements.
 *
 * Deliberately placed right after PassportHeader and rendered
 * unconditionally, even when the user has zero logs: Want to Try can
 * be non-zero before someone has ever logged a coffee (the product
 * loop explicitly starts at Discover → Save, before Visit → Log), so
 * gating this row behind "has logs" would hide real, useful state for
 * exactly the new users this loop is meant to guide forward.
 */
export function PassportLibraryLinks({ beenCount, wantToTryCount }: PassportLibraryLinksProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Link
        href="/passport/been"
        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white px-5 py-4 shadow-soft transition-colors hover:border-espresso/30"
      >
        <span className="flex min-w-0 items-center gap-3">
          <CircleCheck className="h-5 w-5 shrink-0 text-sage" aria-hidden="true" />
          <span className="truncate font-medium text-charcoal">Been</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="font-heading text-lg font-semibold text-espresso">{beenCount}</span>
          <ChevronRight className="h-4 w-4 text-charcoal/30" aria-hidden="true" />
        </span>
      </Link>

      <Link
        href="/passport/want-to-try"
        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white px-5 py-4 shadow-soft transition-colors hover:border-espresso/30"
      >
        <span className="flex min-w-0 items-center gap-3">
          <Bookmark className="h-5 w-5 shrink-0 text-sage" aria-hidden="true" />
          <span className="truncate font-medium text-charcoal">Want to Try</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="font-heading text-lg font-semibold text-espresso">{wantToTryCount}</span>
          <ChevronRight className="h-4 w-4 text-charcoal/30" aria-hidden="true" />
        </span>
      </Link>
    </div>
  );
}
