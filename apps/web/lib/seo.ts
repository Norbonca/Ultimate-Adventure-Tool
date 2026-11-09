/**
 * Oldalankénti metaadat egy helyen: cím, leírás, kanonikus URL, OpenGraph és Twitter-kártya.
 * A Next az oldalon megadott `openGraph`-ot nem olvasztja össze a gyökérével, ezért minden
 * oldal ezen keresztül kapja a teljes készletet (siteName, locale, url, type, kép).
 * Kép nélkül a gyökér `app/opengraph-image.tsx` (1200×630) kerül be.
 */

import type { Metadata } from "next";
import { createT, type Locale } from "@uat/i18n";

export const SITE_NAME = "Trevu";
/** OpenGraph-locale a felület nyelvéből; a többi támogatott nyelv `alternateLocale`. */
export function ogLocale(locale: Locale): { locale: string; alternateLocale: string[] } {
  const map: Record<Locale, string> = { hu: "hu_HU", en: "en_US" };
  return { locale: map[locale], alternateLocale: (Object.keys(map) as Locale[]).filter((l) => l !== locale).map((l) => map[l]) };
}

interface PageMetaInput {
  /** Az olvasó nyelve (`getServerLocale()`), ebből jön az og:locale és az alapkép alt-szövege. */
  locale: Locale;
  /** A lap címe a „· Trevu” utótag nélkül (azt a gyökér sablonja fűzi hozzá). */
  title: string;
  description: string;
  /** Útvonal a kanonikus URL-hez, pl. `/presentation`. */
  path: string;
  image?: { url: string; width?: number; height?: number; alt?: string };
  type?: "website" | "article";
  noindex?: boolean;
  /** Ha igaz, a cím pontosan így jelenik meg (nem fűződik hozzá a „· Trevu”). */
  absoluteTitle?: boolean;
}

export function pageMeta({ locale, title, description, path, image, type = "website", noindex, absoluteTitle }: PageMetaInput): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} · ${SITE_NAME}`;
  // Saját kép nélkül a gyökér megosztási képe (app/opengraph-image.tsx) — a Next ezt az alszegmensekre
  // nem örökíti, ha az oldal saját openGraph-ot ad, ezért kifejezetten megadjuk.
  const t = createT(locale);
  const img = image ?? { url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE_NAME} — ${t("metadata.siteTagline")}` };
  const images = [{ url: img.url, width: img.width, height: img.height, alt: img.alt ?? title }];
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: SITE_NAME,
      ...ogLocale(locale),
      url: path,
      title: fullTitle,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: images.map((i) => i.url),
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
