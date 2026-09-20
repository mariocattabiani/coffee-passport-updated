interface CoffeePassportSnapshotProps {
  drinksLogged: number;
  uniqueVisitors: number;
  topDrinkName: string | null;
}

/**
 * V2.1: compacted from a 3-column divided row into two side-by-side
 * numbers plus a full-width Top Drink line below them, in one clean
 * card. Two reasons: it's shorter vertically (helps get to "What
 * should I order?" sooner), and giving Top Drink the full row width
 * instead of a cramped third column means a long drink name can wrap
 * onto a second line instead of ever truncating. The café's rating
 * lives inline in the hero now, so this still deliberately doesn't
 * repeat it. Renders nothing at all for a brand-new café with zero
 * logs — an empty snapshot strip isn't a useful empty state, "Help
 * build the menu" below already carries that message.
 *
 * V2.2 (desktop only): when this sits beside the Hero in the `lg:`
 * two-column grid (see app/shops/[id]/page.tsx), that grid stretches
 * this card to match the Hero column's height. lg:flex/h-full/
 * justify-center vertically centers the same three facts within that
 * taller card instead of leaving them stranded at the top with dead
 * space below — composition only, no new data. Below `lg:` these
 * classes do nothing, so the compact mobile card is unchanged.
 */
export function CoffeePassportSnapshot({ drinksLogged, uniqueVisitors, topDrinkName }: CoffeePassportSnapshotProps) {
  if (drinksLogged === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-white px-5 py-4 shadow-soft sm:px-6 lg:flex lg:h-full lg:flex-col lg:justify-center">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-sage">Coffee Passport snapshot</p>
      <div className="flex items-start gap-8">
        <div>
          <p className="font-heading text-2xl font-semibold text-espresso">{drinksLogged}</p>
          <p className="mt-0.5 text-xs uppercase tracking-wide text-charcoal/60">
            {drinksLogged === 1 ? "Drink" : "Drinks"}
          </p>
        </div>
        <div>
          <p className="font-heading text-2xl font-semibold text-espresso">{uniqueVisitors}</p>
          <p className="mt-0.5 text-xs uppercase tracking-wide text-charcoal/60">
            {uniqueVisitors === 1 ? "Visitor" : "Visitors"}
          </p>
        </div>
      </div>
      <div className="mt-3 border-t border-border/60 pt-3">
        <p className="text-xs uppercase tracking-wide text-charcoal/60">Top drink</p>
        <p className="mt-0.5 break-words font-heading text-base font-semibold text-espresso">
          {topDrinkName ?? "Still exploring"}
        </p>
      </div>
    </section>
  );
}
