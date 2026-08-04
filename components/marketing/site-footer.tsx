import Link from "next/link";
import { Coffee } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-crema">
      <div className="container flex flex-col items-center gap-4 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <Coffee className="h-4 w-4 text-espresso/70" />
          <span className="text-sm text-charcoal/60">
            &copy; {new Date().getFullYear()} Coffee Passport. Built for coffee people.
          </span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-charcoal/60">
          <Link href="/login" className="hover:text-espresso">
            Log in
          </Link>
          <Link href="/signup" className="hover:text-espresso">
            Sign up
          </Link>
        </nav>
      </div>
    </footer>
  );
}
