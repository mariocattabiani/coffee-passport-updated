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

export const metadata: Metadata = {
  title: "Coffee Passport: Discover cafés, know what to order, log every cup",
  description:
    "Coffee Passport is a social app for coffee and tea people. Discover cafés, see what to order, log every drink, and build a Passport of the places that shaped your taste.",
  openGraph: {
    title: "Coffee Passport",
    description:
      "Discover cafés, know what to order, and log every cup. Build your Coffee Passport and see what your friends love.",
    siteName: "Coffee Passport",
    type: "website",
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
