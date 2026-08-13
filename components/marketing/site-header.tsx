import Link from "next/link";
import { Coffee, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-crema/90 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Coffee className="h-5 w-5 shrink-0 text-espresso" strokeWidth={2} />
          {/* Full wordmark on tablet/desktop, icon only on mobile,
              this alone frees up most of the room needed to fit
              Dashboard/Passport/logout without overflowing at 375px. */}
          <span className="hidden font-heading text-lg font-semibold text-espresso sm:inline">
            Coffee Passport
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/passport">Passport</Link>
              </Button>
              {/* Mobile: icon-only logout with an accessible label.
                  Desktop/tablet: the full text+icon LogoutButton,
                  unchanged. */}
              <form action={signOut} className="sm:hidden">
                <button
                  type="submit"
                  aria-label="Log out"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-espresso/70 transition-colors hover:bg-espresso/5 hover:text-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-espresso"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
              <div className="hidden sm:block">
                <LogoutButton />
              </div>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
