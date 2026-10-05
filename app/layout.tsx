import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";

import "./globals.css";

// Headings font — chosen in the Design System doc ("Plus Jakarta Sans preferred").
const fontHeading = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
});

// Body font — Inter, per the Design System doc.
const fontBody = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

// The homepage's one real "Iced Oat Cortado" / "Fern & Bloom" photo
// (components/marketing/featured-drinks.tsx,
// components/marketing/activity-marquee.tsx) — public/images/hero-iced-coffee.jpg
// — is itself portrait (1466x2200), shown on the homepage in a portrait
// aspect-[3/4] card. Open Graph / Twitter previews expect a landscape
// image (~1.91:1), so a landscape crop of that exact same photo (same
// file, no new/stock photography) is committed at
// public/images/og-iced-oat-cortado.jpg specifically for link previews.
const SITE_URL = "https://coffeepassport.netlify.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Coffee Passport: Discover cafés, know what to order, log every cup",
  description:
    "Coffee Passport is a social app for coffee and tea people. Discover cafés, see what to order, log every drink, and build a Passport of the places that shaped your taste.",
  openGraph: {
    title: "Coffee Passport",
    description:
      "Discover cafés, know what to order, and log every cup. Build your Coffee Passport and see what your friends love.",
    siteName: "Coffee Passport",
    type: "website",
    url: SITE_URL,
    images: [
      {
        url: "/images/og-iced-oat-cortado.jpg",
        width: 1200,
        height: 630,
        alt: "An iced oat cortado at Fern & Bloom",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Coffee Passport",
    description:
      "Discover cafés, know what to order, and log every cup. Build your Coffee Passport and see what your friends love.",
    images: ["/images/og-iced-oat-cortado.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fontHeading.variable} ${fontBody.variable}`}>
      <body>{children}</body>
    </html>
  );
}
