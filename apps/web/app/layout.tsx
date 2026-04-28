import type { Metadata } from "next";
import "@/styles/globals.css";
import { cookies } from "next/headers";
import type { Locale } from "@uat/i18n";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.startsWith("http")
    ? process.env.NEXT_PUBLIC_APP_URL
    : "https://www.ttvk.hu";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Trevu — Trek Beyond Ordinary",
    template: "%s · Trevu",
  },
  description:
    "Discover, plan, and share unforgettable outdoor adventures. Trevu connects adventurers with expert-led trips across hiking, climbing, sailing, and more.",
  keywords: [
    "trevu",
    "adventure",
    "túra",
    "kaland",
    "utazás",
    "hiking",
    "climbing",
    "sailing",
  ],
  openGraph: {
    type: "website",
    siteName: "Trevu",
    title: "Trevu — Trek Beyond Ordinary",
    description:
      "Discover, plan, and share unforgettable outdoor adventures. Trevu connects adventurers with expert-led trips across hiking, climbing, sailing, and more.",
    url: SITE_URL,
    locale: "hu_HU",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trevu — Trek Beyond Ordinary",
    description:
      "Discover, plan, and share unforgettable outdoor adventures.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("trevu-locale")?.value as Locale) || "hu";

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-navy-900 antialiased">
        {children}
      </body>
    </html>
  );
}
