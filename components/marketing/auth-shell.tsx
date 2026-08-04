import Link from "next/link";
import { Coffee } from "lucide-react";

import { PassportStamp } from "@/components/marketing/passport-stamp";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel — hidden on small screens to keep the form front and
          center on mobile, per the design system's mobile-first principle. */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-espresso p-12 lg:flex">
        <Link href="/" className="flex items-center gap-2">
          <Coffee className="h-5 w-5 text-crema" />
          <span className="font-heading text-lg font-semibold text-crema">
            Coffee Passport
          </span>
        </Link>

        <div className="flex flex-col items-start gap-6">
          <PassportStamp className="[&_svg_circle]:stroke-crema [&_svg_path]:stroke-crema [&_svg_text]:fill-crema" />
          <p className="max-w-sm text-2xl font-heading font-medium leading-snug text-crema">
            "What should I order here?"
          </p>
          <p className="max-w-sm text-sm text-crema/60">
            Every cup you log becomes part of your coffee journey — and helps
            the people around you order better too.
          </p>
        </div>

        <p className="text-xs text-crema/40">
          &copy; {new Date().getFullYear()} Coffee Passport
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-16 lg:w-1/2">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <Coffee className="h-5 w-5 text-espresso" />
            <span className="font-heading text-lg font-semibold text-espresso">
              Coffee Passport
            </span>
          </Link>

          <h1 className="font-heading text-2xl font-semibold text-espresso">
            {title}
          </h1>
          <p className="mt-2 text-sm text-charcoal/60">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-6 text-center text-sm text-charcoal/60">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}
