import Link from "next/link";
import Image from "next/image";
import {
  Star,
  MapPin,
  Users,
  Compass,
  NotebookPen,
  Sparkles,
  Bookmark,
  Trophy,
  Leaf,
  Bell,
  UserRound,
  Camera,
  Heart,
  MessageCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PassportStamp } from "@/components/marketing/passport-stamp";
import { StampBadge } from "@/components/marketing/stamp-badge";
import { Reveal } from "@/components/marketing/reveal";
import { FloatingCard } from "@/components/marketing/floating-card";
import { ActivityMarquee } from "@/components/marketing/activity-marquee";
import { PhoneMockup } from "@/components/marketing/phone-mockup";
import { PassportScreen, LogScreen, CafePageScreen } from "@/components/marketing/mockup-screens";
import { FeatureBento } from "@/components/marketing/feature-bento";
import { QuoteBlock } from "@/components/marketing/quote-block";
import { FeaturedDrinks } from "@/components/marketing/featured-drinks";

const SECONDARY_FEATURES = [
  { icon: Bookmark, label: "Save for later", description: "Bookmark a drink or café to try" },
  { icon: Camera, label: "Community photos", description: "See what a café actually looks like" },
  { icon: Trophy, label: "Leaderboard", description: "See who's exploring the most" },
  { icon: Leaf, label: "Coffee and tea", description: "Tea gets its own stamps too" },
  { icon: UserRound, label: "Public profiles", description: "Share your Passport with friends" },
  { icon: Bell, label: "Notifications", description: "Know when a friend logs or comments" },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden">
      <SiteHeader />

      <main className="flex-1">
        {/* ---------------- HERO ---------------- */}
        <section className="container grid gap-12 pb-16 pt-14 sm:pt-20 lg:grid-cols-2 lg:items-center lg:gap-8">
          <Reveal>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-sage">
              A social app for coffee and tea people
            </p>
            <h1 className="font-heading text-[2.5rem] font-semibold leading-[1.1] text-espresso sm:text-6xl">
              Your coffee life,
              <br />
              all in one place.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-charcoal/70">
              Discover cafés worth visiting, find out what to actually order,
              log every cup, and see what your friends love. Coffee Passport
              turns your coffee habit into a record worth keeping.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">Create your Passport</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </Reveal>

          {/* Product-led hero visual: a real screen composition, not a
              stock coffee photo. The phone shows the Passport itself
              (the emotional core of the product), with a floating
              card demonstrating drink logging alongside it. */}
          <Reveal delayMs={150} className="relative mx-auto w-full max-w-sm">
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full border-[14px] border-espresso/[0.05]"
              aria-hidden="true"
            />
            <PhoneMockup className="relative">
              <PassportScreen />
            </PhoneMockup>

            <PassportStamp
              className="absolute -right-4 -top-6 h-24 w-24 sm:h-28 sm:w-28"
              backing
            />

            <FloatingCard className="-bottom-6 -left-6 w-48 sm:-left-10">
              <div className="flex items-center gap-1 text-gold">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={i < 4 ? "h-3 w-3 fill-gold" : "h-3 w-3 fill-transparent text-charcoal/20"} />
                ))}
              </div>
              <p className="mt-1.5 text-sm font-medium text-charcoal">Iced Oat Cortado</p>
              <p className="flex items-center gap-1 text-xs text-charcoal/50">
                <MapPin className="h-3 w-3" /> Fern &amp; Bloom
              </p>
            </FloatingCard>
          </Reveal>
        </section>

        {/* ---------------- ACTIVITY STRIP ---------------- */}
        <Reveal>
          <section className="border-y border-border/60 bg-white/60 py-6">
            <p className="container mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-charcoal/40">
              What Discover looks like
            </p>
            <ActivityMarquee />
          </section>
        </Reveal>

        {/* ---------------- HOW IT WORKS ---------------- */}
        <section className="container py-24">
          <Reveal className="mx-auto max-w-lg text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sage">
              How it works
            </p>
            <h2 className="mt-3 font-heading text-3xl font-semibold text-espresso sm:text-4xl">
              Everything you need, before and after you order.
            </h2>
          </Reveal>

          <Reveal delayMs={100} className="mt-12">
            <FeatureBento />
          </Reveal>
        </section>

        {/* ---------------- CAFÉ PAGE SHOWCASE ---------------- */}
        {/* V2.1: rebalanced from an even lg:grid-cols-2 with a wide
            gap-16 to an asymmetric split with a tighter gap-10, and
            the phone itself is enlarged at lg: (see PhoneMockup's
            className override below). Together these close most of
            the dead space between the text column and the mockup
            without changing what either side actually says. */}
        <section className="border-t border-border/60 bg-white/50 py-24">
          <div className="container grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
            <Reveal className="lg:max-w-md">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-espresso/10">
                <Compass className="h-5 w-5 text-espresso" />
              </div>
              <h2 className="font-heading text-3xl font-semibold leading-tight text-espresso sm:text-4xl">
                Know what to order before you get in line.
              </h2>
              <p className="mt-4 max-w-md text-charcoal/70">
                Every café on Coffee Passport gets its own page. Not just
                hours and directions, but the drinks people actually
                recommend, rated by the community that logged them there.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-charcoal/70">
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                  &quot;What should I order?&quot;, ranked by real ratings
                </li>
                <li className="flex items-start gap-2">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                  See which friends have already been there
                </li>
                <li className="flex items-start gap-2">
                  <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                  Your own visit history, right on the café page
                </li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full bg-espresso/5 px-3 py-1.5 text-xs font-medium text-espresso">
                  Café ratings
                </span>
                <span className="rounded-full bg-espresso/5 px-3 py-1.5 text-xs font-medium text-espresso">
                  Top drinks
                </span>
                <span className="rounded-full bg-espresso/5 px-3 py-1.5 text-xs font-medium text-espresso">
                  Friends who&apos;ve visited
                </span>
                <span className="rounded-full bg-espresso/5 px-3 py-1.5 text-xs font-medium text-espresso">
                  Your visit history
                </span>
              </div>
            </Reveal>

            <Reveal delayMs={100} className="mx-auto w-full max-w-xs">
              <PhoneMockup className="lg:w-[330px]">
                <CafePageScreen />
              </PhoneMockup>
            </Reveal>
          </div>
        </section>

        {/* ---------------- QUOTE ---------------- */}
        <section className="container py-24">
          <Reveal>
            <QuoteBlock />
          </Reveal>
        </section>

        {/* ---------------- LOG YOUR COFFEE LIFE ---------------- */}
        <section className="border-t border-border/60 bg-white/50 py-24">
          <div className="container grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-espresso/10">
                <NotebookPen className="h-5 w-5 text-espresso" />
              </div>
              <h2 className="font-heading text-3xl font-semibold leading-tight text-espresso sm:text-4xl">
                Every cup becomes part of your story.
              </h2>
              <p className="mt-4 max-w-md text-charcoal/70">
                Rate the drink, rate the café, add a photo if you want it.
                Coffee or tea, hot or iced, done in seconds. Over time, those
                small moments become a real record of your taste: the drinks,
                the shops, the mornings that mattered.
              </p>
              <Button asChild variant="outline" size="lg" className="mt-6">
                <Link href="/signup">See how logging works</Link>
              </Button>
            </Reveal>

            <Reveal delayMs={100} className="relative mx-auto w-full max-w-md">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl shadow-card">
                <Image
                  src="/images/log-latte-art.jpg"
                  alt="A latte with heart-shaped latte art on a café counter"
                  fill
                  sizes="(min-width: 1024px) 480px, 90vw"
                  className="object-cover"
                />
              </div>
              <PhoneMockup className="absolute -bottom-14 -left-10 hidden w-[190px] scale-[0.72] origin-bottom-left sm:block">
                <LogScreen />
              </PhoneMockup>
            </Reveal>
          </div>
        </section>

        {/* ---------------- FEATURED DRINKS ---------------- */}
        <section className="border-t border-border/60 bg-white/50 py-24">
          <div className="container">
            <Reveal className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sage">
                  A taste of Discover
                </p>
                <h2 className="mt-2 font-heading text-3xl font-semibold text-espresso sm:text-4xl">
                  The kind of thing people are logging.
                </h2>
              </div>
            </Reveal>

            <Reveal delayMs={100} className="mt-10">
              <FeaturedDrinks />
            </Reveal>
          </div>
        </section>

        {/* ---------------- SOCIAL ---------------- */}
        <section className="container py-24">
          <Reveal className="mx-auto max-w-lg text-center">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-espresso/10">
              <Users className="h-5 w-5 text-espresso" />
            </div>
            <h2 className="font-heading text-3xl font-semibold text-espresso sm:text-4xl">
              Coffee is better with friends.
            </h2>
            <p className="mt-4 text-charcoal/70">
              Add friends, see mutual connections, and follow what they&apos;re
              drinking in a Discover feed built for coffee people. Like a
              log, leave a comment, or reply to one.
            </p>
          </Reveal>

          <Reveal delayMs={100} className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-white p-5 shadow-soft">
              <div className="flex -space-x-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-latte/50" />
                ))}
              </div>
              <p className="mt-3 text-sm font-medium text-charcoal">Mutual friends</p>
              <p className="mt-1 text-xs text-charcoal/50">See who you both know</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-white p-5 shadow-soft">
              <div className="flex items-center gap-1.5 text-sage">
                <Heart className="h-4 w-4 fill-sage/20" />
                <MessageCircle className="h-4 w-4" />
              </div>
              <p className="mt-3 text-sm font-medium text-charcoal">Likes and comments</p>
              <p className="mt-1 text-xs text-charcoal/50">React to a friend&apos;s log, or reply</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-white p-5 shadow-soft">
              <div className="flex items-center gap-1.5 text-sage">
                <Bell className="h-4 w-4" />
              </div>
              <p className="mt-3 text-sm font-medium text-charcoal">Notifications</p>
              <p className="mt-1 text-xs text-charcoal/50">Know when someone interacts with you</p>
            </div>
          </Reveal>
        </section>

        {/* ---------------- PASSPORT / STAMPS ---------------- */}
        <section className="relative overflow-hidden py-28">
          <Image
            src="/images/passport-cafe-interior.jpg"
            alt="A bright café interior with woven pendant lights and green window frames"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-espresso/75" />
          <div className="absolute inset-0 bg-gradient-to-t from-espresso via-espresso/60 to-espresso/60" />

          <div className="container relative">
            <Reveal className="mx-auto max-w-xl text-center">
              <h2 className="font-heading text-3xl font-semibold text-crema sm:text-4xl">
                Every café becomes part of your Passport.
              </h2>
              <p className="mx-auto mt-4 max-w-sm text-crema/80">
                Cafés visited, cities explored, a world map that fills in as
                you go, and stamps for the milestones along the way.
              </p>
            </Reveal>

            <Reveal delayMs={150} className="mx-auto mt-14 flex max-w-lg flex-wrap items-center justify-center gap-6">
              <StampBadge label="LATTE BE HONEST" rotate={-8} color="#FAF8F4" className="animate-float" />
              <StampBadge label="GREEN MACHINE" rotate={5} color="#FAF8F4" className="animate-float-slow h-20 w-20" />
              <StampBadge label="COLD BLOODED" rotate={-4} color="#FAF8F4" className="animate-float" />
              <StampBadge label="LEAF ME ALONE" rotate={7} color="#FAF8F4" className="animate-float-slow h-20 w-20" />
            </Reveal>

            <Reveal delayMs={200} className="mx-auto mt-14 flex max-w-xs justify-center">
              <div className="flex items-center gap-6 rounded-xl bg-white/95 px-6 py-4 shadow-card backdrop-blur-sm">
                {[
                  ["142", "Drinks"],
                  ["37", "Cafés"],
                  ["19", "Cities"],
                ].map(([n, l]) => (
                  <div key={l} className="text-center">
                    <p className="font-heading text-xl font-semibold text-espresso">{n}</p>
                    <p className="text-[10px] uppercase tracking-wide text-charcoal/40">{l}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------------- SECONDARY FEATURES ---------------- */}
        <section className="container py-24">
          <Reveal className="mx-auto max-w-lg text-center">
            <h2 className="font-heading text-3xl font-semibold text-espresso sm:text-4xl">
              There&apos;s more to Coffee Passport.
            </h2>
          </Reveal>

          <Reveal delayMs={100} className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3">
            {SECONDARY_FEATURES.map(({ icon: Icon, label, description }) => (
              <div key={label} className="flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-white p-4">
                <Icon className="h-4 w-4 text-sage" aria-hidden="true" />
                <p className="text-sm font-medium text-charcoal">{label}</p>
                <p className="text-xs text-charcoal/50">{description}</p>
              </div>
            ))}
          </Reveal>
        </section>

        {/* ---------------- FINAL CTA ---------------- */}
        <section className="border-t border-border/60 bg-espresso">
          <div className="container flex flex-col items-center gap-6 py-24 text-center">
            <Reveal className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 animate-glow-pulse rounded-full bg-latte/30 blur-2xl" />
                <PassportStamp className="relative" backing />
              </div>
              <h2 className="font-heading text-3xl font-semibold text-crema sm:text-4xl">
                Your cafés. Your drinks. Your memories. Your Passport.
              </h2>
              <p className="max-w-md text-crema/70">
                Your coffee journey starts with a single cup. Let&apos;s log it.
              </p>
              <Button asChild size="lg" variant="secondary" className="mt-2">
                <Link href="/signup">Create your Passport</Link>
              </Button>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
