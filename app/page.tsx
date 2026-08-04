import Link from "next/link";
import Image from "next/image";
import { Star, MapPin, Users, Compass, NotebookPen, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PassportStamp } from "@/components/marketing/passport-stamp";
import { StampBadge } from "@/components/marketing/stamp-badge";
import { Reveal } from "@/components/marketing/reveal";
import { FloatingCard } from "@/components/marketing/floating-card";
import { ActivityMarquee } from "@/components/marketing/activity-marquee";
import { PhoneMockup } from "@/components/marketing/phone-mockup";
import { LogScreen } from "@/components/marketing/mockup-screens";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <SiteHeader />

      <main className="flex-1">
        {/* ---------------- HERO ---------------- */}
        <section className="container grid gap-12 pb-16 pt-14 sm:pt-20 lg:grid-cols-2 lg:items-center lg:gap-8">
          <Reveal>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-sage">
              For people who never forget a good cup
            </p>
            <h1 className="font-heading text-[2.75rem] font-semibold leading-[1.05] text-espresso sm:text-6xl">
              Coffee worth
              <br />
              remembering.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-charcoal/70">
              Log every cup, discover what's actually worth ordering, and
              build a passport of the coffee shops that shaped your taste —
              one stamp at a time.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">Start your passport</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delayMs={150} className="relative mx-auto w-full max-w-md">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl shadow-card">
              <Image
                src="/images/hero-iced-coffee.jpg"
                alt="Two iced coffees with milk swirling in, resting on linen"
                fill
                priority
                sizes="(min-width: 1024px) 480px, 90vw"
                className="object-cover"
              />
            </div>

            <PassportStamp
              className="absolute -right-6 -top-6 h-24 w-24 sm:h-28 sm:w-28"
              label="COFFEE PASSPORT"
              sublabel="EST. 2026"
            />

            <FloatingCard className="-bottom-6 -left-4 w-52 sm:-left-8">
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
              Logged just now
            </p>
            <ActivityMarquee />
          </section>
        </Reveal>

        {/* ---------------- STORY 1 — DISCOVER ---------------- */}
        <section className="container py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal className="relative order-2 lg:order-1">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl shadow-card">
                <Image
                  src="/images/discover-espresso-bar.jpg"
                  alt="A sunlit espresso bar with marble counters and an arched mirror"
                  fill
                  sizes="(min-width: 1024px) 560px, 90vw"
                  className="object-cover"
                />
              </div>
              <FloatingCard className="-bottom-5 -right-4 w-48 sm:-right-8">
                <p className="text-xs font-medium uppercase tracking-wide text-sage">Trending nearby</p>
                <p className="mt-1 text-sm font-medium text-charcoal">Single-Origin Espresso</p>
                <p className="text-xs text-charcoal/50">North End Coffee</p>
              </FloatingCard>
            </Reveal>

            <Reveal delayMs={100} className="order-1 lg:order-2">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-espresso/10">
                <Compass className="h-5 w-5 text-espresso" />
              </div>
              <h2 className="font-heading text-3xl font-semibold leading-tight text-espresso sm:text-4xl">
                Know what's good before you order.
              </h2>
              <p className="mt-4 max-w-md text-charcoal/70">
                Most apps stop at hours and directions. Coffee Passport shows
                you the drink locals actually order — what your friends
                loved, what's trending this week, and what's worth the trip.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-charcoal/70">
                <li className="flex items-start gap-2">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                  See what people you trust are ordering nearby
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                  Surface the standout drink at every shop, not just the shop
                </li>
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ---------------- STORY 2 — LOG ---------------- */}
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
                Rate it, snap a photo if you want, done in seconds. Over
                time, those small moments become a real record of your taste
                — the drinks, the shops, the mornings that mattered.
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

        {/* ---------------- STORY 3 — PASSPORT / COMMUNITY ---------------- */}
        <section className="relative overflow-hidden py-28">
          <Image
            src="/images/passport-cafe-interior.jpg"
            alt="A bright café interior with woven pendant lights and green window frames"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-espresso via-espresso/70 to-espresso/30" />

          <div className="container relative">
            <Reveal className="mx-auto max-w-xl text-center">
              <h2 className="font-heading text-3xl font-semibold text-crema sm:text-4xl">
                Every stop becomes a stamp.
              </h2>
              <p className="mx-auto mt-4 max-w-sm text-crema/70">
                Your passport fills in quietly, one café at a time — a
                record of where you've been and what you'd order again.
              </p>
            </Reveal>

            <Reveal delayMs={150} className="mx-auto mt-14 flex max-w-lg flex-wrap items-center justify-center gap-6">
              <StampBadge label="AUSTIN, TX" rotate={-8} color="#FAF8F4" className="animate-float" />
              <StampBadge label="3RD WAVE" rotate={5} color="#FAF8F4" className="animate-float-slow h-20 w-20" />
              <StampBadge label="COLD BREW" rotate={-4} color="#FAF8F4" className="animate-float" />
              <StampBadge label="POUR-OVER" rotate={7} color="#FAF8F4" className="animate-float-slow h-20 w-20" />
            </Reveal>
          </div>
        </section>

        {/* ---------------- CRAFT / TEXTURE MOSAIC ---------------- */}
        <section className="container py-24">
          <Reveal className="mx-auto max-w-xl text-center">
            <h2 className="font-heading text-3xl font-semibold text-espresso sm:text-4xl">
              Behind every cup is a craft worth noticing.
            </h2>
          </Reveal>

          <Reveal delayMs={100} className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5">
            <div className="relative col-span-2 aspect-[16/10] overflow-hidden rounded-xl shadow-card sm:col-span-1 sm:aspect-[3/4]">
              <Image
                src="/images/texture-reading-corner.jpg"
                alt="A cozy café reading corner with bookshelves and plants"
                fill
                sizes="(min-width: 640px) 33vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-xl shadow-card sm:aspect-[3/4]">
              <Image
                src="/images/texture-machine-detail.jpg"
                alt="Close-up detail of an espresso machine badge"
                fill
                sizes="(min-width: 640px) 33vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-xl shadow-card sm:aspect-[3/4]">
              <Image
                src="/images/texture-roastery-shelf.jpg"
                alt="A roastery shelf lined with tea and coffee jars"
                fill
                sizes="(min-width: 640px) 33vw, 50vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </section>

        {/* ---------------- FINAL CTA ---------------- */}
        <section className="border-t border-border/60 bg-espresso">
          <div className="container flex flex-col items-center gap-6 py-24 text-center">
            <Reveal className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 animate-glow-pulse rounded-full bg-latte/30 blur-2xl" />
                <PassportStamp className="relative" />
              </div>
              <h2 className="font-heading text-3xl font-semibold text-crema sm:text-4xl">
                Build the world's largest community of coffee lovers.
              </h2>
              <p className="max-w-md text-crema/70">
                Your coffee journey starts with a single cup. Let's log it.
              </p>
              <Button asChild size="lg" variant="secondary" className="mt-2">
                <Link href="/signup">Create your passport</Link>
              </Button>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
