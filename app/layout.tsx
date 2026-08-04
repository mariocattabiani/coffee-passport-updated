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
  title: "Coffee Passport — What should I order here?",
  description:
    "Coffee Passport helps you discover the best drinks, see what friends order, and build your own coffee journey — one cup at a time.",
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
