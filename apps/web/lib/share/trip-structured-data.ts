/**
 * Keresőknek szóló strukturált adat a nyilvános túraoldalra (FR-M02-010, ND-SH-04 → Norbert 2026-11-09).
 *
 * - `TouristTrip` (schema.org): név, leírás, kép, indulás–érkezés, helyszín, szervező, ajánlat.
 *   Szándékosan NEM `Event`: a Google esemény-irányelve a túracsomagot kifejezetten tiltja
 *   eseményként jelölni („Trip package: San Diego/LA, 7 nights”).
 * - `BreadcrumbList`: Trevu › a túra neve — ezt a Google a találatban megjeleníti.
 *
 * Tiszta függvény; a megjelenítés a túraoldal `<script type="application/ld+json">` blokkja.
 */

import { SITE_NAME } from "@/lib/seo";
import { tripCanonicalUrl } from "@/lib/share/trip-share";

export interface TripStructuredDataInput {
  slug: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  priceAmount?: number | string | null;
  priceCurrency?: string | null;
  spotsLeft?: number | null;
  registrationDeadline?: string | null;
  organizerName?: string | null;
  organizerSlug?: string | null;
  keywords?: (string | null | undefined)[];
}

type JsonLd = Record<string, unknown>;

const abs = (origin: string, url: string) => new URL(url, origin).href;

export function tripStructuredData(origin: string, t: TripStructuredDataInput): JsonLd[] {
  const url = tripCanonicalUrl(origin, t.slug);

  const address = Object.fromEntries(
    Object.entries({ addressLocality: t.city, addressRegion: t.region, addressCountry: t.country }).filter(([, v]) => v),
  );
  const placeName = [t.city, t.country].filter(Boolean).join(", ");

  const price = t.priceAmount === null || t.priceAmount === undefined || t.priceAmount === "" ? null : Number(t.priceAmount);
  const offer: JsonLd | null =
    price !== null && Number.isFinite(price) && t.priceCurrency
      ? {
          "@type": "Offer",
          url,
          price: price.toFixed(2),
          priceCurrency: t.priceCurrency.toUpperCase(),
          availability:
            t.spotsLeft === null || t.spotsLeft === undefined
              ? undefined
              : t.spotsLeft > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/SoldOut",
          validThrough: t.registrationDeadline ?? undefined,
        }
      : null;

  const keywords = (t.keywords ?? []).filter((k): k is string => Boolean(k));

  const trip: JsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: t.title,
    description: t.description,
    url,
    image: t.imageUrl ? [abs(origin, t.imageUrl)] : undefined,
    departureTime: t.startDate ?? undefined,
    arrivalTime: t.endDate ?? undefined,
    itinerary: placeName
      ? { "@type": "Place", name: placeName, ...(Object.keys(address).length ? { address: { "@type": "PostalAddress", ...address } } : {}) }
      : undefined,
    provider: t.organizerName
      ? { "@type": "Person", name: t.organizerName, ...(t.organizerSlug ? { url: abs(origin, `/u/${encodeURIComponent(t.organizerSlug)}`) } : {}) }
      : undefined,
    offers: offer ? stripUndefined(offer) : undefined,
    keywords: keywords.length ? keywords.join(", ") : undefined,
  };

  const breadcrumb: JsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: abs(origin, "/") },
      { "@type": "ListItem", position: 2, name: t.title, item: url },
    ],
  };

  return [stripUndefined(trip), breadcrumb];
}

function stripUndefined(o: JsonLd): JsonLd {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}

/** `<script type="application/ld+json">` tartalma — a `<` escape-elve, hogy a szöveg ne zárhassa le a scriptet. */
export function jsonLdScript(data: JsonLd[]): string {
  return JSON.stringify(data.length === 1 ? data[0] : data).replace(/</g, "\\u003c");
}
