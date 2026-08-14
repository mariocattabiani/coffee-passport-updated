import Link from "next/link";
import { Coffee } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ShopNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-crema px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-espresso/10">
        <Coffee className="h-6 w-6 text-espresso" />
      </div>
      <p className="mt-5 font-heading text-xl font-semibold text-espresso">
        We couldn&apos;t find that café.
      </p>
      <p className="mt-1 max-w-xs text-sm text-charcoal/60">
        It may have been removed, or the link might be off.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
