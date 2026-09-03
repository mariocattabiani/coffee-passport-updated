import type { AchievementProgress } from "@/lib/passport/achievements";
import { formatRemainingPhrase } from "@/lib/passport/achievements";

/**
 * Compact by design: heading, progress line, bar, remaining-amount
 * line — no outer card. The old treatment wrapped this in a
 * `rounded-2xl border ... p-6 sm:p-8` card that made a single small
 * fact (progress toward one stamp) occupy as much vertical space as
 * an entire feature. This version aims for roughly 80-120px total on
 * mobile for the single-goal case, per the target.
 *
 * "Your next stamp is getting close" was dropped entirely rather than
 * kept conditionally — at this compact size it read as filler under
 * a progress bar that already says the same thing more precisely.
 *
 * Still adapts to goal count the same way as before: one goal reads as
 * a single compact block, two/three lay out side by side on `sm`+ and
 * stack on mobile.
 */
export function UpNext({ goals }: { goals: AchievementProgress[] }) {
  if (goals.length === 0) return null;

  if (goals.length === 1) {
    const goal = goals[0];
    const remaining = goal.definition.threshold - goal.progress;

    return (
      <section className="border-t border-border/60 pt-6">
        <h2 className="mb-2 font-heading text-lg font-semibold text-espresso">Up Next</h2>

        <div className="flex min-w-0 items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-charcoal">{goal.definition.name}</p>
            <p className="truncate text-xs text-charcoal/50">{goal.definition.description}</p>
          </div>
          <p className="shrink-0 font-heading text-base font-semibold text-espresso">
            {goal.progress} / {goal.definition.threshold}
          </p>
        </div>

        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-border" aria-hidden="true">
          <div className="h-full rounded-full bg-sage" style={{ width: `${goal.percent}%` }} />
        </div>

        {remaining > 0 && (
          <p className="mt-1.5 text-xs font-medium text-charcoal/50">
            {formatRemainingPhrase(
              remaining,
              goal.definition.progressUnitSingular,
              goal.definition.progressUnitPlural,
              "to go"
            )}
          </p>
        )}
      </section>
    );
  }

  const gridClass = goals.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3";

  return (
    <section className="border-t border-border/60 pt-6">
      <h2 className="mb-3 font-heading text-lg font-semibold text-espresso">Up Next</h2>
      <div className={`grid gap-x-6 gap-y-4 ${gridClass}`}>
        {goals.map((goal) => (
          <div key={goal.definition.key} className="min-w-0">
            <div className="flex min-w-0 items-baseline justify-between gap-2">
              <p className="truncate text-sm font-medium text-charcoal">{goal.definition.name}</p>
              <p className="shrink-0 text-xs font-semibold text-espresso">
                {goal.progress}/{goal.definition.threshold}
              </p>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
              <div className="h-full rounded-full bg-sage" style={{ width: `${goal.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
