import type { Metadata } from "next";
import { SITE_NAME, ogLocale } from "@/lib/seo";
import "@/styles/globals.css";
import { getServerT } from "@/lib/i18n/server";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.startsWith("http")
    ? process.env.NEXT_PUBLIC_APP_URL
    : "https://www.ttvk.hu";

/** A gyökér metaadata az olvasó nyelvén (Norbert, 2026-11-09). */
export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getServerT();
  const title = `${SITE_NAME} — ${t("metadata.siteTagline")}`;
  const description = t("metadata.siteDescription");
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s · ${SITE_NAME}` },
    description,
    applicationName: SITE_NAME,
    keywords: t("metadata.keywords").split(",").map((k) => k.trim()).filter(Boolean),
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url: SITE_URL, ...ogLocale(locale) },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale } = await getServerT();

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
      <body
        data-surface="night"
        className="min-h-screen bg-canvas text-ink antialiased"
      >
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
