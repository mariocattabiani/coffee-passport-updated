import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { AchievementProgress } from "@/lib/passport/achievements";
import { pluralizeUnit } from "@/lib/passport/achievements";

/**
 * One card, the single closest Up Next goal, this is the immediate
 * post-log progression signal for V1, deliberately not a second
 * Passport section, elaborate post-log feedback is deferred to V1.5.
 *
 * Server component (no "use client"), so it can keep receiving the
 * full AchievementProgress directly, no Server -> Client serialization
 * boundary is crossed here.
 *
 * Previously guessed the unit from the achievement's category (every
 * "milestone" achievement said "drinks", which was wrong for Coffee 25
 * and Coffee 100, both milestones that should say "coffees"). Now uses
 * the achievement's own precise unit metadata instead.
 */
export function ContinueYourPassport({ goal }: { goal: AchievementProgress | null }) {
  if (!goal) return null;

  const remaining = goal.definition.threshold - goal.progress;
  const unitWord = pluralizeUnit(remaining, goal.definition.progressUnitSingular, goal.definition.progressUnitPlural);

  return (
    <Link
      href="/passport"
      className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white p-5 shadow-soft transition-shadow hover:shadow-card"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sage">Continue your Passport</p>
        <p className="mt-1 font-medium text-espresso">
          {remaining} more {unitWord} until {goal.definition.name}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-charcoal/40" aria-hidden="true" />
    </Link>
  );
}
