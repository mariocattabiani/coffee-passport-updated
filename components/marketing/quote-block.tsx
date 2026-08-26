import { Quote } from "lucide-react";

export function QuoteBlock() {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Quote className="mx-auto h-8 w-8 text-latte" strokeWidth={1.5} />
      <p className="mt-6 font-heading text-2xl font-medium leading-snug text-espresso sm:text-3xl">
        A good café isn&apos;t hard to find. Knowing what to order once you&apos;re
        there — that&apos;s the part worth remembering.
      </p>
      <p className="mt-5 text-sm font-medium uppercase tracking-[0.15em] text-charcoal/40">
        The idea behind Coffee Passport
      </p>
    </div>
  );
}
