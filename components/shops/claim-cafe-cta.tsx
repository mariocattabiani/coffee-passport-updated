import { Store } from "lucide-react";

/**
 * Explicitly a placeholder, not a real feature: no route, no owner
 * role, no dashboard behind this. Deliberately subtle and disabled-
 * looking (muted colors, disabled cursor) so it never reads as a
 * working button that happens to do nothing when tapped.
 */
export function ClaimCafeCta() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-white/60 px-5 py-4">
      <div className="flex items-center gap-3">
        <Store className="h-4 w-4 shrink-0 text-charcoal/30" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-charcoal/70">Own or manage this café?</p>
          <p className="text-xs text-charcoal/50">Business tools are coming soon.</p>
        </div>
      </div>
      <button
        type="button"
        disabled
        className="shrink-0 cursor-not-allowed rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-charcoal/40 disabled:opacity-100"
      >
        Claim this page
      </button>
    </div>
  );
}
