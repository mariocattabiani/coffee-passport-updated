import type { AchievementProgress } from "@/lib/passport/achievements";
import { formatRemainingPhrase } from "@/lib/passport/achievements";

/**
 * Adapts to how many goals exist rather than always assuming three.
 * One goal becomes a wide featured moment instead of a small card
 * surrounded by empty space, two goals split evenly, three keeps the
 * original three-column layout. Mobile always stacks to one column
 * regardless of count.
 */
export function UpNext({ goals }: { goals: AchievementProgress[] }) {
  if (goals.length === 0) return null;

  if (goals.length === 1) {
    const goal = goals[0];
    const remaining = goal.definition.threshold - goal.progress;

    return (
      <section>
        <h2 className="mb-4 font-heading text-xl font-semibold text-espresso">Up Next</h2>
        <div className="rounded-2xl border border-border bg-white p-6 shadow-soft sm:p-8">
          <p className="font-heading text-2xl font-semibold text-espresso sm:text-3xl">
            {goal.definition.name}
          </p>
          <p className="mt-1 text-sm text-charcoal/60">{goal.definition.description}</p>

          <div className="mt-6">
            <p className="font-heading text-lg font-semibold text-espresso">
              {goal.progress} OF {goal.definition.threshold} {goal.definition.progressUnitPlural.toUpperCase()}
            </p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
              <div className="h-full rounded-full bg-sage" style={{ width: `${goal.percent}%` }} />
            </div>
            {remaining > 0 && (
              <p className="mt-2 text-sm font-medium text-charcoal/60">
                {formatRemainingPhrase(
                  remaining,
                  goal.definition.progressUnitSingular,
                  goal.definition.progressUnitPlural,
                  "to go"
                )}
              </p>
            )}
          </div>

          {/* Only shown when actually meaningfully close, never a
              blanket line that could read as misleading for a distant
              goal like an early Coffee 100. */}
          {goal.percent >= 50 && (
            <p className="mt-4 text-xs italic text-charcoal/40">Your next stamp is getting close.</p>
          )}
        </div>
      </section>
    );
  }

  const gridClass = goals.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3";

  return (
    <section>
      <h2 className="mb-4 font-heading text-xl font-semibold text-espresso">Up Next</h2>
      <div className={`grid gap-4 ${gridClass}`}>
        {goals.map((goal) => (
          <div key={goal.definition.key} className="rounded-xl border border-border bg-white p-5 shadow-soft">
            <p className="font-heading text-base font-semibold text-espresso">{goal.definition.name}</p>
            <p className="mt-1 text-xs text-charcoal/50">{goal.definition.description}</p>
            <div className="mt-4">
              <div className="h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
                <div className="h-full rounded-full bg-sage" style={{ width: `${goal.percent}%` }} />
              </div>
              <p className="mt-2 text-xs font-medium text-charcoal/60">
                {goal.progress} / {goal.definition.threshold} {goal.definition.progressUnitPlural}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
