import Link from "next/link";
import { IdCard } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PassportEmptyState() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-espresso/10">
        <IdCard className="h-6 w-6 text-espresso" />
      </div>
      <p className="mt-5 font-heading text-xl font-semibold text-espresso">
        Your passport is ready for its first stamp.
      </p>
      <p className="mt-1 max-w-xs text-sm text-charcoal/60">
        Log your first coffee to start building your coffee history.
      </p>
      <Button asChild className="mt-6">
        <Link href="/log">Log your first coffee</Link>
      </Button>
    </div>
  );
}
