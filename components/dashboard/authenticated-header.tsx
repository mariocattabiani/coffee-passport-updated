import Link from "next/link";
import { Coffee, Compass, IdCard, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { createClient } from "@/lib/supabase/server";

interface AuthenticatedHeaderProps {
  /** Omit on screens that aren't Dashboard, Discover, Friends, or
   *  Passport themselves (a café or user profile page, for instance),
   *  no nav item gets highlighted. */
  active?: "dashboard" | "discover" | "friends" | "passport";
}

/**
 * Async so it can resolve its own pending-friend-request badge count
 * once, here, rather than every page that renders this header needing
 * to remember to fetch and pass it down. Costs one small indexed count
 * query per page load, negligible.
 */
export async function AuthenticatedHeader({ active }: AuthenticatedHeaderProps) {
  const supabase = await createClient();
  const { data: pendingCount } = await supabase.rpc("get_pending_request_count");
  const hasPending = typeof pendingCount === "number" && pendingCount > 0;

  return (
    <>
      {/* Desktop: full nav in one row, logout included here, sticky
          while scrolling. Mobile: just the logo, static (not sticky),
          the fixed bottom tab bar below carries navigation instead. */}
      <header className="border-b border-border/40 sm:sticky sm:top-0 sm:z-40 sm:border-border/60 sm:bg-crema/90 sm:backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-espresso" />
            <span className="font-heading text-lg font-semibold text-espresso">Coffee Passport</span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
            <Button asChild variant={active === "dashboard" ? "secondary" : "ghost"} size="sm">
              <Link href="/dashboard" aria-current={active === "dashboard" ? "page" : undefined}>
                Dashboard
              </Link>
            </Button>
            <Button asChild variant={active === "discover" ? "secondary" : "ghost"} size="sm">
              <Link href="/discover" aria-current={active === "discover" ? "page" : undefined}>
                Discover
              </Link>
            </Button>
            <Button asChild variant={active === "friends" ? "secondary" : "ghost"} size="sm" className="relative">
              <Link href="/friends" aria-current={active === "friends" ? "page" : undefined}>
                Friends
                {hasPending && (
                  <span
                    className="absolute -right-0.5 -top-0.5 flex h-2 w-2 rounded-full bg-sage"
                    aria-hidden="true"
                  />
                )}
              </Link>
            </Button>
            <Button asChild variant={active === "passport" ? "secondary" : "ghost"} size="sm">
              <Link href="/passport" aria-current={active === "passport" ? "page" : undefined}>
                Passport
              </Link>
            </Button>
            <Button asChild size="sm" className="ml-2 gap-1.5">
              <Link href="/log">
                <Plus className="h-3.5 w-3.5" />
                Log Coffee
              </Link>
            </Button>
            <LogoutButton />
          </nav>
        </div>
      </header>

      {/* Mobile-only bottom tab bar. Four destinations, unchanged:
          Dashboard, Discover, Log (still visually raised/prominent),
          Passport. Friends is deliberately not a fifth tab here, it's
          reachable from Discover's own header on mobile instead.
          Logout lives on the Passport page. Padded for the device's
          safe area so it never sits under a phone's home indicator. */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-white/95 backdrop-blur sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <Link
          href="/dashboard"
          aria-current={active === "dashboard" ? "page" : undefined}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
            active === "dashboard" ? "text-espresso" : "text-charcoal/40"
          }`}
        >
          <Coffee className="h-5 w-5" />
          Dashboard
        </Link>
        <Link
          href="/discover"
          aria-current={active === "discover" ? "page" : undefined}
          className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
            active === "discover" || active === "friends" ? "text-espresso" : "text-charcoal/40"
          }`}
        >
          <span className="relative">
            <Compass className="h-5 w-5" />
            {hasPending && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-2 w-2 rounded-full bg-sage"
                aria-hidden="true"
              />
            )}
          </span>
          Discover
        </Link>
        <Link href="/log" className="flex flex-1 flex-col items-center gap-1 py-1.5" aria-label="Log a coffee">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-espresso text-crema shadow-card">
            <Plus className="h-5 w-5" />
          </span>
          <span className="text-[11px] font-medium text-espresso">Log</span>
        </Link>
        <Link
          href="/passport"
          aria-current={active === "passport" ? "page" : undefined}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
            active === "passport" ? "text-espresso" : "text-charcoal/40"
          }`}
        >
          <IdCard className="h-5 w-5" />
          Passport
        </Link>
      </nav>
    </>
  );
}
