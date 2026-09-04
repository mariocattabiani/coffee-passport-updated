"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  Bell,
  Trophy,
  CircleCheck,
  Bookmark,
  Award,
  Pencil,
  LogOut,
  Coffee,
} from "lucide-react";

import { signOut } from "@/lib/auth/actions";

// Everything actually focusable inside the drawer: the close button
// and every menu link/button — the same minimal-selector approach
// already used by PhotoLightbox/CommentSheet, not a generic modal
// framework.
const FOCUSABLE_SELECTOR = 'button, [href], [tabindex]:not([tabindex="-1"])';

interface MenuItem {
  href: string;
  label: string;
  icon: typeof Users;
}

const SOCIAL_ITEMS: MenuItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/activity", label: "Activity", icon: Bell },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

const PASSPORT_ITEMS: MenuItem[] = [
  { href: "/passport/been", label: "Been", icon: CircleCheck },
  { href: "/passport/want-to-try", label: "Want to Try", icon: Bookmark },
  { href: "/passport/stamps", label: "Stamps", icon: Award },
];

/**
 * Mobile/tablet-only (the trigger button is `lg:hidden`, matching the
 * header's own breakpoint) — desktop (lg+) keeps its existing full nav
 * row untouched, this component renders nothing extra there. Houses
 * destinations that don't have a spot in the 5-item bottom tab bar:
 * Dashboard (moved here since Leaderboard took its bottom-nav slot),
 * Friends, Activity, Been, Want to Try, Stamps, Edit Profile, Log out
 * — plus Leaderboard again, deliberately: it's both a primary bottom-
 * nav destination AND a social utility worth surfacing here too, that
 * duplication is intentional, not an oversight.
 *
 * The backdrop + panel are rendered via a portal straight into
 * document.body, not inline where the trigger button sits inside
 * <header>. This is not decorative — it's the actual fix for a real
 * regression: the header picked up `backdrop-blur` (backdrop-filter)
 * as part of the fixed mobile-shell work, and per the CSS spec, an
 * element with a filter/backdrop-filter becomes a new containing
 * block for any `position: fixed` descendant. With the drawer nested
 * inside <header>, its "fixed" backdrop and panel were being
 * positioned relative to the header's own box instead of the true
 * viewport — exactly why the panel appeared mis-anchored and visually
 * tangled with the header instead of behaving like an independent
 * overlay. Portaling to document.body removes it from that DOM
 * subtree entirely, so it's never subject to any ancestor's
 * containing-block quirks, current or future. React preserves the
 * normal synthetic-event bubbling hierarchy through a portal, so
 * every onClick/keydown/focus-trap handler below works exactly as if
 * the markup were still inline.
 *
 * Same focus-trap/Escape/backdrop-click/scroll-lock/focus-restore
 * pattern already established by PhotoLightbox and CommentSheet in
 * this codebase, applied to a right-side slide-over instead of a
 * centered dialog.
 */
export function MobileMenuDrawer() {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const triggerToRestore = triggerRef.current;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        return;
      }

      if (e.key !== "Tab" || !drawerRef.current) return;

      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !drawerRef.current.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !drawerRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      triggerToRestore?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-charcoal/60 hover:bg-crema hover:text-espresso lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-charcoal/40 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            onClick={close}
          >
            <div
              ref={drawerRef}
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-y-0 right-0 z-[60] flex w-[85%] max-w-xs flex-col overflow-y-auto bg-crema shadow-card"
              style={{
                paddingTop: "env(safe-area-inset-top)",
                paddingBottom: "env(safe-area-inset-bottom)",
                paddingRight: "env(safe-area-inset-right)",
              }}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Coffee className="h-4 w-4 text-espresso" aria-hidden="true" />
                  <p className="font-heading text-base font-semibold text-espresso">Menu</p>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={close}
                  aria-label="Close menu"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-charcoal/50 hover:bg-white hover:text-charcoal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
                <MenuSection label="Social" items={SOCIAL_ITEMS} onNavigate={close} />
                <MenuSection label="Your Passport" items={PASSPORT_ITEMS} onNavigate={close} />

                <div className="mt-6 border-t border-border/60 pt-4">
                  <Link
                    href="/passport/edit"
                    onClick={close}
                    className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium text-charcoal hover:bg-white"
                  >
                    <Pencil className="h-4 w-4 text-charcoal/50" aria-hidden="true" />
                    Edit Profile
                  </Link>
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm font-medium text-charcoal hover:bg-white"
                    >
                      <LogOut className="h-4 w-4 text-charcoal/50" aria-hidden="true" />
                      Log out
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function MenuSection({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: MenuItem[];
  onNavigate: () => void;
}) {
  return (
    <div className="mb-2">
      <p className="px-2.5 pb-1.5 text-xs font-semibold uppercase tracking-wide text-charcoal/40">{label}</p>
      {items.map(({ href, label: itemLabel, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium text-charcoal hover:bg-white"
        >
          <Icon className="h-4 w-4 text-charcoal/50" aria-hidden="true" />
          {itemLabel}
        </Link>
      ))}
    </div>
  );
}
