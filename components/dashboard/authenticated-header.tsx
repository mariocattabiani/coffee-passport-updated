import Link from "next/link";
import { Suspense } from "react";
import { Coffee, MapPin, Users, IdCard, Plus, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { NotificationBell, NotificationBellFallback } from "@/components/dashboard/notification-bell";
import { HeaderPendingDot } from "@/components/dashboard/header-pending-dot";
import { MobileMenuDrawer } from "@/components/dashboard/mobile-menu-drawer";

interface AuthenticatedHeaderProps {
  /** Omit on screens that aren't Dashboard, Discover, Friends, or
   *  Passport themselves (a café or user profile page, for instance),
   *  no nav item gets highlighted. */
  active?: "dashboard" | "explore" | "discover" | "friends" | "passport" | "leaderboard";
}

/**
 * Synchronous now — no top-level await, no data fetch of its own. It
 * previously awaited get_pending_request_count directly, which
 * blocked the ENTIRE header (brand, nav links, hamburger, bottom nav)
 * from rendering until that RPC resolved, and since NotificationBell
 * was a child that did its own separate await for
 * get_unread_notification_count, React couldn't even start that second
 * query until this component's own await had already finished —
 * making the two badge reads serialize on every single authenticated
 * route render, exactly the bottleneck this fixes.
 *
 * Both counts now live behind getHeaderBadgeCounts() (lib/dashboard/
 * header-badges.ts), a react cache()-deduped fetch that runs its own
 * internal Promise.all exactly once per request regardless of how many
 * places on the page ask for it. Three separate consumers —
 * NotificationBell, and two HeaderPendingDot instances (desktop
 * Friends button, mobile Discover tab) — each sit inside their own
 * <Suspense> boundary here, so the header shell itself (this whole
 * function's own return value) renders immediately, and each badge
 * fills in independently once the shared fetch resolves. The Bell and
 * every nav link are fully clickable from the first paint; nothing
 * about them depends on badge data.
 *
 * BREAKPOINT: the full desktop nav (5 links + Log Coffee + Logout) now
 * only appears from `lg` (1024px) up, not `sm` (640px) as before. That
 * earlier breakpoint was the actual cause of the header clipping bug —
 * between 640-1023px there simply isn't room for 7 items each with
 * their own padding plus the logo, regardless of gap/spacing tuning.
 * Rather than trying to cram a "reduced" tier into that same too-narrow
 * range, tablet widths now get the same compact header mobile phones
 * get (logo + Bell + hamburger) — genuinely simpler and impossible to
 * overflow, since it never has more than 3 fixed-size items to lay
 * out regardless of viewport width. The mobile bottom tab bar's own
 * breakpoint moved from `sm:hidden` to `lg:hidden` to match, so there's
 * no dead range where neither navigation is usable.
 */
export function AuthenticatedHeader({ active }: AuthenticatedHeaderProps) {
  return (
    <>
      {/* Desktop (lg+): full nav in one row, sticky while scrolling,
          position: sticky, which is safe there since nothing about
          this page's scroll/overflow structure interferes with it.

          Mobile/tablet (below lg): position: fixed instead of sticky —
          this header previously had NO position set below lg at all
          (defaulting to static), which is the actual, exact reason it
          scrolled away with the page; sticky was never even attempted
          there, so there was nothing "failing", the positioning was
          simply never applied outside the lg+ media query. Fixed is
          also the structurally safer choice for the mobile shell
          regardless: it can't be defeated by an ancestor's overflow/
          transform the way sticky occasionally can, and it matches
          the bottom tab bar's own already-fixed treatment, so the two
          bars behave identically instead of one being fixed and the
          other merely in-flow.

          bg-crema/95 backdrop-blur is now unconditional (not lg:-only)
          since the header needs a real background the instant it's
          fixed — page content would otherwise visibly scroll behind a
          transparent bar. z-40 matches the bottom nav exactly, both
          sitting below the drawer/lightbox/CommentSheet's z-50, so the
          hamburger drawer and any modal always render above both fixed
          bars, never underneath. */}
      <header
        className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-crema/95 backdrop-blur lg:sticky lg:z-40"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="container flex h-16 min-w-0 items-center justify-between">
          <Link href="/dashboard" className="flex min-w-0 shrink-0 items-center gap-2">
            <Coffee className="h-5 w-5 shrink-0 text-espresso" />
            <span className="truncate font-heading text-lg font-semibold text-espresso">Coffee Passport</span>
          </Link>

          <div className="flex shrink-0 items-center gap-1">
            <Suspense fallback={<NotificationBellFallback />}>
              <NotificationBell />
            </Suspense>
            <MobileMenuDrawer />

            <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
              <Button asChild variant={active === "dashboard" ? "secondary" : "ghost"} size="sm">
                <Link href="/dashboard" aria-current={active === "dashboard" ? "page" : undefined}>
                  Dashboard
                </Link>
              </Button>
              <Button asChild variant={active === "explore" ? "secondary" : "ghost"} size="sm">
                <Link href="/explore" aria-current={active === "explore" ? "page" : undefined}>
                  Cafés
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
                  <Suspense fallback={null}>
                    <HeaderPendingDot />
                  </Suspense>
                </Link>
              </Button>
              <Button asChild variant={active === "passport" ? "secondary" : "ghost"} size="sm">
                <Link href="/passport" aria-current={active === "passport" ? "page" : undefined}>
                  Passport
                </Link>
              </Button>
              <Button asChild size="sm" className="ml-2 gap-1.5 whitespace-nowrap">
                <Link href="/log">
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  Log Coffee
                </Link>
              </Button>
              <LogoutButton />
            </nav>
          </div>
        </div>
      </header>

      {/* Content offset for the fixed header above, centralized here
          rather than as page-level top padding — every authenticated
          page already renders <AuthenticatedHeader /> as its first
          element, so a spacer living inside this same component
          reaches every page automatically with zero page-level
          changes, unlike the bottom-nav offset (see PART A4 in the
          sprint notes / each page's own pb-24 lg:pb-10), which can't
          use this trick since nothing renders a matching "footer"
          component at the true end of each page's content — a spacer
          placed here would only ever land before the content, not
          after it, so bottom clearance still has to be page-level
          padding. This top spacer's height exactly matches the
          header's real rendered height (h-16 = 4rem, plus whatever
          the device's own safe-area-inset-top actually is) via calc(),
          not a guessed static value — lg:hidden since the header is
          sticky (still in normal document flow) at that breakpoint,
          so no spacer is needed there at all. */}
      <div aria-hidden="true" className="lg:hidden" style={{ height: "calc(4rem + env(safe-area-inset-top))" }} />

      {/* Mobile/tablet-only (below lg) fixed bottom tab bar. Five
          primary destinations: Cafés (route stays /explore, only the
          visible label changed), Discover, Log (still visually
          raised/prominent), Leaderboard, Passport. Dashboard moved to
          the hamburger drawer — it's not gone, just no longer one of
          the five primary bottom-nav slots, freeing a slot for
          Leaderboard, which is deliberately present in BOTH the bottom
          nav and the drawer (a primary destination and a social
          utility destination at once). Friends/Activity are
          deliberately not bottom-nav items, they're drawer-only.
          Logout lives in the drawer's Account section. Padded for the
          device's safe area so it never sits under a phone's home
          indicator. */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border/80 bg-crema/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <Link
          href="/explore"
          aria-current={active === "explore" ? "page" : undefined}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
            active === "explore" ? "text-espresso" : "text-charcoal/40"
          }`}
        >
          <MapPin className="h-5 w-5" strokeWidth={active === "explore" ? 2.5 : 2} />
          Cafés
        </Link>
        <Link
          href="/discover"
          aria-current={active === "discover" ? "page" : undefined}
          className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
            active === "discover" || active === "friends" ? "text-espresso" : "text-charcoal/40"
          }`}
        >
          <span className="relative">
            <Users
              className="h-5 w-5"
              strokeWidth={active === "discover" || active === "friends" ? 2.5 : 2}
            />
            <Suspense fallback={null}>
              <HeaderPendingDot />
            </Suspense>
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
          href="/leaderboard"
          aria-current={active === "leaderboard" ? "page" : undefined}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
            active === "leaderboard" ? "text-espresso" : "text-charcoal/40"
          }`}
        >
          <Trophy className="h-5 w-5" strokeWidth={active === "leaderboard" ? 2.5 : 2} />
          Leaderboard
        </Link>
        <Link
          href="/passport"
          aria-current={active === "passport" ? "page" : undefined}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
            active === "passport" ? "text-espresso" : "text-charcoal/40"
          }`}
        >
          <IdCard className="h-5 w-5" strokeWidth={active === "passport" ? 2.5 : 2} />
          Passport
        </Link>
      </nav>
    </>
  );
}
