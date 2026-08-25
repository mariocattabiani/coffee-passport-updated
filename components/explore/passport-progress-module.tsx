import Link from "next/link";

import type { UpNextGoalDisplay } from "@/lib/passport/achievements";

interface PassportProgressModuleProps {
  goal: UpNextGoalDisplay | null;
}

/**
 * Deliberately small and quiet, one line and a thin progress rule, not
 * a Dashboard-style card. Reinforces Discover -> Visit -> Log ->
 * Progress without turning Explore into an achievement screen. Renders
 * nothing at all once every achievement is earned.
 *
 * Takes the serializable UpNextGoalDisplay, not AchievementProgress:
 * this component is rendered from inside explore-client.tsx, a Client
 * Component, so anything reaching it has already crossed a
 * Server -> Client boundary and must be free of functions.
 */
export function PassportProgressModule({ goal }: PassportProgressModuleProps) {
  if (!goal) return null;
  const remaining = goal.threshold - goal.progress;

  return (
    <Link
      href="/passport"
      className="block rounded-lg border border-border/60 bg-white/60 px-4 py-2.5 text-sm transition-colors hover:border-espresso/30"
    >
      <span className="font-medium text-charcoal">
        {goal.progress} of {goal.threshold} {goal.progressUnitPlural} explored
      </span>
      {remaining > 0 && (
        <span className="text-charcoal/50"> &middot; {remaining} more until {goal.name}</span>
      )}
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
        <div className="h-full rounded-full bg-sage" style={{ width: `${goal.percent}%` }} />
      </div>
    </Link>
  );
}
