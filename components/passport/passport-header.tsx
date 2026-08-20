import Link from "next/link";
import { MapPin, User, Pencil, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/supabase/types";
import { signOut } from "@/lib/auth/actions";

interface PassportHeaderStats {
  drinksLogged: number;
  teasLogged: number;
  cafesExplored: number;
  citiesExplored: number;
  stampsEarned: number;
}

interface PassportHeaderProps {
  profile: Profile | null;
  stats: PassportHeaderStats | null;
  /** Earliest logged_at across the user's history, moves earlier if a
   *  backdated log is added later. Falls back to account creation only
   *  when there's no history at all yet. */
  exploringSinceDate: string | null;
  /** The most recently earned achievement, if any, anchors the bottom
   *  of the journey panel. Omitted entirely (not a placeholder) when
   *  nothing has been earned yet. */
  latestStamp: { name: string; earnedAt: string } | null;
}

function yearOf(dateString: string | null | undefined): number | null {
  if (!dateString) return null;
  const year = new Date(dateString).getFullYear();
  return Number.isNaN(year) ? null : year;
}

function formatMonthYear(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function SecondaryStat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-heading text-xl font-semibold text-crema sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-crema/50">{label}</p>
    </div>
  );
}

export function PassportHeader({ profile, stats, exploringSinceDate, latestStamp }: PassportHeaderProps) {
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  const location = [profile?.city, profile?.state].filter(Boolean).join(", ");
  const exploringSince = yearOf(exploringSinceDate ?? profile?.created_at);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-white shadow-soft">
      {/* Oversized, quiet ring motif behind the identity side only. */}
      <div
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full border-[14px] border-espresso/[0.04] sm:h-96 sm:w-96"
        aria-hidden="true"
      />

      <div className="relative grid sm:grid-cols-[1.5fr_1fr]">
        {/* IDENTITY */}
        <div className="p-6 sm:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-5">
              <div className="relative shrink-0">
                <div
                  className="absolute -inset-3 rounded-full border border-dashed border-sage/20"
                  aria-hidden="true"
                />
                <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-latte/30 shadow-card ring-4 ring-white sm:h-28 sm:w-28">
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt={fullName ? `${fullName}'s profile photo` : "Profile photo"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-9 w-9 text-espresso/40" aria-hidden="true" />
                  )}
                </div>
              </div>

              <div className="min-w-0">
                {exploringSince && (
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sage">
                    Exploring since {exploringSince}
                  </p>
                )}
                {fullName && (
                  <h1 className="mt-1 truncate font-heading text-2xl font-semibold text-espresso sm:text-4xl">
                    {fullName}
                  </h1>
                )}
                {profile?.username && <p className="text-charcoal/50">@{profile.username}</p>}
                {location && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-charcoal/50">
                    <MapPin className="h-3.5 w-3.5" />
                    {location}
                  </p>
                )}
              </div>
            </div>

            {/* Actions get their own full-width row on mobile instead of
                squeezing beside the identity block, that squeeze was
                pushing Edit profile off the right edge of the viewport
                at narrow widths. At sm+ this reverts to the original
                right-aligned column. */}
            <div className="flex items-center justify-between gap-3 sm:shrink-0 sm:flex-col sm:items-end sm:justify-start sm:gap-2">
              <Button asChild variant="outline" className="gap-1.5">
                <Link href="/passport/edit">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit profile
                </Link>
              </Button>
              {/* Mobile only: the bottom tab bar no longer has a logout
                  destination. Desktop already has Log out in
                  AuthenticatedHeader, so it's hidden here to avoid
                  showing two logout actions in the same viewport. */}
              <form action={signOut} className="sm:hidden">
                <button
                  type="submit"
                  className="flex items-center gap-1 text-xs font-medium text-charcoal/40 hover:text-charcoal/70"
                >
                  <LogOut className="h-3 w-3" />
                  Log out
                </button>
              </form>
            </div>
          </div>

          {profile?.bio && (
            <p className="mt-5 max-w-md text-sm italic text-charcoal/60">&ldquo;{profile.bio}&rdquo;</p>
          )}
        </div>

        {/* PROGRESS, composed rather than four equal-weight tiles */}
        {stats && (
          <div className="relative flex flex-col justify-between bg-espresso p-6 sm:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-crema/50">
                Your coffee journey
              </p>

              {/* PRIMARY: drinks logged is the anchor metric, given real
                  scale rather than sharing equal weight with the rest. */}
              <div className="mt-3">
                <p className="font-heading text-5xl font-semibold leading-none text-crema sm:text-6xl">
                  {stats.drinksLogged}
                </p>
                <p className="mt-2 text-xs uppercase tracking-wide text-crema/50">Drinks logged</p>
                {stats.teasLogged > 0 && (
                  <p className="mt-1 text-xs font-medium text-latte">+{stats.teasLogged} teas</p>
                )}
              </div>

              {/* SECONDARY ROW, smaller scale, separated by thin rules
                  rather than repeating the primary metric's treatment. */}
              <div className="mt-6 flex items-start gap-5 border-t border-crema/10 pt-5">
                <SecondaryStat value={stats.cafesExplored} label="Cafés" />
                <div className="h-8 w-px bg-crema/15" aria-hidden="true" />
                <SecondaryStat value={stats.citiesExplored} label="Cities" />
                <div className="h-8 w-px bg-crema/15" aria-hidden="true" />
                <SecondaryStat value={stats.stampsEarned} label="Stamps" />
              </div>
            </div>

            {/* LATEST STAMP anchors the bottom of the panel when
                something has actually been earned, omitted entirely,
                not a placeholder, otherwise, the panel simply
                rebalances around the content above. */}
            {latestStamp && (
              <div className="mt-6 border-t border-crema/10 pt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gold">Latest stamp</p>
                <p className="mt-1 font-heading text-base font-semibold text-crema">{latestStamp.name}</p>
                <p className="text-xs text-crema/50">{formatMonthYear(latestStamp.earnedAt)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
