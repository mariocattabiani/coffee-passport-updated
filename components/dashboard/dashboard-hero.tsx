import Link from "next/link";
import { Plus, Coffee } from "lucide-react";

import { Button } from "@/components/ui/button";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardHero({ firstName }: { firstName: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-white via-white to-latte/10 p-6 shadow-soft sm:p-10">
      {/* Decorative stamp-ring motif, purely visual, kept quiet on purpose. */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border-[10px] border-espresso/[0.05] sm:h-72 sm:w-72"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full border-[6px] border-dashed border-sage/[0.12] sm:h-52 sm:w-52"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-sage">
            <Coffee className="h-3.5 w-3.5" />
            Coffee Passport
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold leading-tight text-espresso sm:text-4xl">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-2 max-w-sm text-charcoal/60">
            Your passport is growing one cup at a time. What are you having today?
          </p>
        </div>

        <Button
          asChild
          size="lg"
          className="group h-14 w-full gap-2.5 rounded-xl px-8 text-base shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:w-auto"
        >
          <Link href="/log">
            <Plus className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" />
            Log a coffee
          </Link>
        </Button>
      </div>
    </div>
  );
}
