import { MapPin } from "lucide-react";

export function CoffeeMapEmptyState() {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-white/60 px-6 text-center sm:h-80">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-espresso/10">
        <MapPin className="h-5 w-5 text-espresso" aria-hidden="true" />
      </div>
      <div>
        <p className="font-heading text-base font-semibold text-espresso">Your coffee map starts here</p>
        <p className="mt-1 max-w-xs text-sm text-charcoal/60">
          Log a coffee at a real café and it will show up here.
        </p>
      </div>
    </div>
  );
}
