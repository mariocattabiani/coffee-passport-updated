import { Flame, Snowflake } from "lucide-react";

export interface HotIcedSummary {
  hotPercent: number;
  icedPercent: number;
}

/**
 * Its own section, siblings with Up Next and Your favorites (not
 * folded into either) — matching the Passport page's existing
 * three-part structure, just each part now compact. Heading, bar, two
 * labels, no outer card, no large padding block.
 */
export function PassportStyleSummary({ data }: { data: HotIcedSummary | null }) {
  return (
    <section className="border-t border-border/60 pt-6">
      <h2 className="mb-2 font-heading text-lg font-semibold text-espresso">Your style</h2>
      {data ? (
        <>
          <div className="flex h-2 overflow-hidden rounded-full bg-border" aria-hidden="true">
            <div className="bg-latte" style={{ width: `${data.hotPercent}%` }} />
            <div className="bg-sage" style={{ width: `${data.icedPercent}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-sm text-charcoal/70">
            <span className="flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-latte" aria-hidden="true" />
              {data.hotPercent}% Hot
            </span>
            <span className="flex items-center gap-1.5">
              {data.icedPercent}% Iced
              <Snowflake className="h-3.5 w-3.5 text-sage" aria-hidden="true" />
            </span>
          </div>
        </>
      ) : (
        <p className="text-sm text-charcoal/40">Not enough data yet</p>
      )}
    </section>
  );
}
