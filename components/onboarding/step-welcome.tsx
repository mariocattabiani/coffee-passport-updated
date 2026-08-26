import { Coffee } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PassportStamp } from "@/components/marketing/passport-stamp";

export function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <PassportStamp />
      <div className="mt-8 flex items-center gap-2 text-sage">
        <Coffee className="h-4 w-4" />
        <span className="text-sm font-semibold uppercase tracking-[0.15em]">
          Let&apos;s get you set up
        </span>
      </div>
      <h1 className="mt-3 font-heading text-3xl font-semibold text-espresso sm:text-4xl">
        Welcome to Coffee Passport
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-charcoal/70">
        Track every coffee you&apos;ve tried. Discover incredible cafés. Build
        your coffee journey.
      </p>
      <Button size="lg" className="mt-8 w-full sm:w-auto sm:px-12" onClick={onNext}>
        Get Started
      </Button>
    </div>
  );
}
