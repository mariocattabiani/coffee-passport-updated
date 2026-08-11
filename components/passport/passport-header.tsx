import Link from "next/link";
import { MapPin, User, Pencil, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/supabase/types";
import { signOut } from "@/lib/auth/actions";

interface PassportHeaderStats {
  coffeesLogged: number;
  teasLogged: number;
  cafesExplored: number;
  uniqueDrinks: number;
  avgDrinkRating: number;
}

interface PassportHeaderProps {
  profile: Profile | null;
  stats: PassportHeaderStats | null;
}

function memberSinceYear(createdAt: string | undefined): number | null {
  if (!createdAt) return null;
  const year = new Date(createdAt).getFullYear();
  return Number.isNaN(year) ? null : year;
}

function StatBlock({ value, label, secondary }: { value: string | number; label: string; secondary?: string }) {
  return (
    <div>
      <p className="font-heading text-2xl font-semibold text-crema sm:text-3xl">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-crema/50">{label}</p>
      {secondary && <p className="mt-0.5 text-[11px] font-medium text-latte">{secondary}</p>}
    </div>
  );
}

export function PassportHeader({ profile, stats }: PassportHeaderProps) {
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  const location = [profile?.city, profile?.state].filter(Boolean).join(", ");
  const memberSince = memberSinceYear(profile?.created_at);

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
                {memberSince && (
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sage">
                    Member since {memberSince}
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

        {/* PROGRESS, integrated rather than a separate row of tiles */}
        {stats && (
          <div className="relative bg-espresso p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-crema/50">
              Your coffee journey
            </p>
            <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-5">
              <StatBlock
                value={stats.coffeesLogged}
                label="Coffees"
                secondary={stats.teasLogged > 0 ? `+${stats.teasLogged} teas` : undefined}
              />
              <StatBlock value={stats.cafesExplored} label="Cafés" />
              <StatBlock value={stats.uniqueDrinks} label="Unique drinks" />
              <StatBlock value={stats.avgDrinkRating.toFixed(1)} label="Avg rating" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
