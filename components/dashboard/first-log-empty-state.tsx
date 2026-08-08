import Link from "next/link";
import { Coffee } from "lucide-react";

import { Button } from "@/components/ui/button";

export function FirstLogEmptyState() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-white/60 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-espresso/10">
        <Coffee className="h-6 w-6 text-espresso" />
      </div>
      <p className="mt-5 font-heading text-lg font-semibold text-espresso">
        Your coffee passport starts with your first cup.
      </p>
      <p className="mt-1 max-w-xs text-sm text-charcoal/60">
        Log a drink and it will show up right here, with your rating, photo,
        and notes.
      </p>
      <Button asChild className="mt-6">
        <Link href="/log">Log your first coffee</Link>
      </Button>
    </div>
  );
}
