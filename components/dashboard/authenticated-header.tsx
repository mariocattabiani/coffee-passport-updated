import Link from "next/link";
import { Coffee, IdCard, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/dashboard/logout-button";

interface AuthenticatedHeaderProps {
  /** Omit on screens that aren't Dashboard or Passport themselves (a
   *  café page, for instance), neither nav item gets highlighted. */
  active?: "dashboard" | "passport";
}

export function AuthenticatedHeader({ active }: AuthenticatedHeaderProps) {
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

      {/* Mobile-only bottom tab bar. Three destinations only, logout
          lives on the Passport page instead, it isn't a primary
          product destination. Padded for the device's safe area so it
          never sits under a phone's home indicator. */}
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
