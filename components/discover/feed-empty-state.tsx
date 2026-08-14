import { Coffee } from "lucide-react";

export function FeedEmptyState() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-espresso/10">
        <Coffee className="h-6 w-6 text-espresso" />
      </div>
      <p className="mt-5 font-heading text-lg font-semibold text-espresso">
        Nothing public here yet.
      </p>
      <p className="mt-1 max-w-xs text-sm text-charcoal/60">
        Public logs from across Coffee Passport will show up here as people log their drinks.
      </p>
    </div>
  );
}
