import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s | FreshNexus",
    default: "FreshNexus — Discover food products and market insights",
  },
  description:
    "Search Open Food Facts for products, inspect nutrition and ingredients, and track live market signals.",
  openGraph: {
    title: "FreshNexus",
    description:
      "Search Open Food Facts for products, inspect nutrition and ingredients, and track live market signals.",
    siteName: "FreshNexus",
    type: "website",
    url: SITE_URL,
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10 dark:border-white/10">
          <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-4">
            <Link href="/" className="font-semibold text-lg tracking-tight">
              FreshNexus
            </Link>
            <nav aria-label="Primary">
              <ul className="flex items-center gap-6 text-sm">
                <li>
                  <Link href="/" className="hover:underline">
                    Discover
                  </Link>
                </li>
                <li>
                  <Link href="/insights" className="hover:underline">
                    Insights
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
