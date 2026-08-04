import Link from "next/link";
import { Compass, MapPin, NotebookPen, Bookmark, Star, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PassportStamp } from "@/components/marketing/passport-stamp";

const features = [
  {
    icon: Compass,
    title: "Discover",
    description:
      "See what your friends ordered, what's trending nearby, and what's actually worth trying before you get in line.",
  },
  {
    icon: NotebookPen,
    title: "Log every coffee",
    description:
      "Rate the drink, rate the shop, add a photo if you want. Every cup becomes part of your record.",
  },
  {
    icon: MapPin,
    title: "Find what's near you",
    description:
      "An interactive map of coffee shops around you, ranked by the drinks people actually recommend.",
  },
  {
    icon: Bookmark,
    title: "Keep a wishlist",
    description:
      "Save a drink or a shop you want to try. It stays put until you're ready for it.",
  },
];

const notTold = [
  "Whether a shop is good overall",
  "How many reviews it has",
  "Hours and directions",
];

const actuallyTold = [
  "The best drink to order",
  "What your friends recommend",
  "What's trending right now",
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="container flex flex-col items-center gap-12 py-20 sm:py-28 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl animate-fade-up text-center lg:text-left">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-sage">
              For people who actually love coffee
            </p>
            <h1 className="font-heading text-4xl font-semibold leading-[1.1] text-espresso sm:text-5xl">
              What should I order here?
            </h1>
            <p className="mt-5 text-lg text-charcoal/70">
              Coffee Passport is where you log every coffee you drink, find out
              what's actually good, and build a record of your coffee journey
              — one cup at a time.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button asChild size="lg">
                <Link href="/signup">Start your passport</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-6 rounded-full bg-latte/20 blur-2xl" />
            <PassportStamp />
          </div>
        </section>

        {/* Problem framing — pulled directly from the PRD's contrast */}
        <section className="border-t border-border/60 bg-white/60">
          <div className="container py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading text-3xl font-semibold text-espresso">
                Most apps tell you if a café is good. Not what to order.
              </h2>
              <p className="mt-4 text-charcoal/70">
                Coffee Passport focuses on people, not just places.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader>
                  <CardDescription className="font-medium uppercase tracking-wide text-charcoal/40">
                    Other apps tell you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {notTold.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm text-charcoal/60">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-charcoal/25" />
                      {item}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-sage/30 bg-sage/5">
                <CardHeader>
                  <CardDescription className="font-medium uppercase tracking-wide text-sage">
                    Coffee Passport tells you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {actuallyTold.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm text-charcoal/80">
                      <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-gold text-gold" />
                      {item}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Feature highlights */}
        <section className="container py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-semibold text-espresso">
              Everything you need before — and after — you order
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="h-full">
                <CardHeader>
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-espresso/10">
                    <Icon className="h-5 w-5 text-espresso" strokeWidth={2} />
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription>{description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-border/60 bg-espresso">
          <div className="container flex flex-col items-center gap-6 py-20 text-center">
            <Users className="h-8 w-8 text-crema/70" />
            <h2 className="font-heading text-3xl font-semibold text-crema sm:text-4xl">
              Build the world's largest community of coffee lovers.
            </h2>
            <p className="max-w-md text-crema/70">
              Your coffee journey starts with a single cup. Let's log it.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-2">
              <Link href="/signup">Create your passport</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
