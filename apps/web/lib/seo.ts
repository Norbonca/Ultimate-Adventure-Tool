/**
 * Oldalankénti metaadat egy helyen: cím, leírás, kanonikus URL, OpenGraph és Twitter-kártya.
 * A Next az oldalon megadott `openGraph`-ot nem olvasztja össze a gyökérével, ezért minden
 * oldal ezen keresztül kapja a teljes készletet (siteName, locale, url, type, kép).
 * Kép nélkül a gyökér `app/opengraph-image.tsx` (1200×630) kerül be.
 */

import type { Metadata } from "next";

export const SITE_NAME = "Trevu";
export const SITE_TAGLINE = "Kalandtúrák szervezése és felfedezése";
export const SITE_DESCRIPTION =
  "Meghirdetés, jelentkezők, teendők és közös költségek – egy felületen. Kis csoportos kalandtúrák szervezőinek és résztvevőinek.";

interface PageMetaInput {
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

export function pageMeta({ title, description, path, image, type = "website", noindex, absoluteTitle }: PageMetaInput): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} · ${SITE_NAME}`;
  // Saját kép nélkül a gyökér megosztási képe (app/opengraph-image.tsx) — a Next ezt az alszegmensekre
  // nem örökíti, ha az oldal saját openGraph-ot ad, ezért kifejezetten megadjuk.
  const img = image ?? { url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE_NAME} — ${SITE_TAGLINE}` };
  const images = [{ url: img.url, width: img.width, height: img.height, alt: img.alt ?? title }];
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: SITE_NAME,
      locale: "hu_HU",
      alternateLocale: ["en_US"],
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
