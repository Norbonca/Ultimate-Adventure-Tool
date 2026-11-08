/**
 * Túramegosztás — tiszta segédfüggvények (FR-M02-010).
 * Terv: design/D02_Trip_Management.pen#cuYhm (folyamat), #bXK2G (ShareSheet).
 *
 * - A megosztott link a kanonikus `/trips/<slug>` cím, UTM-paraméterekkel.
 * - A platformgombok a platformok nyilvános megosztási címeit nyitják.
 * - A nyilvánosság szabálya a `trips_select_public` RLS-szabállyal azonos.
 */

export const SHARE_PLATFORMS = ["facebook", "whatsapp", "x", "telegram", "email"] as const;
export type SharePlatform = (typeof SHARE_PLATFORMS)[number];
export type ShareSource = SharePlatform | "copy" | "native";

/** A `trips_select_public` RLS-szabály státuszai. */
const PUBLIC_STATUSES = new Set(["published", "registration_open", "active", "completed"]);

export function isTripPublic(trip: { status?: string | null; visibility?: string | null; deleted_at?: string | null }): boolean {
  return trip.visibility === "public" && PUBLIC_STATUSES.has(trip.status ?? "") && !trip.deleted_at;
}

/** Kanonikus túra-URL (paraméter nélkül). */
export function tripCanonicalUrl(origin: string, slug: string): string {
  return new URL(`/trips/${encodeURIComponent(slug)}`, origin).href;
}

/** A megosztott link: kanonikus cím + utm_source / utm_medium / utm_campaign. */
export function tripShareUrl(origin: string, slug: string, source: ShareSource): string {
  const url = new URL(tripCanonicalUrl(origin, slug));
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", "trip_share");
  return url.href;
}

/** A platform megosztási címe. `text` a kísérőszöveg, `subject` az e-mail tárgya. */
export function platformShareHref(platform: SharePlatform, url: string, text: string, subject = text): string {
  const u = encodeURIComponent(url);
  const tx = encodeURIComponent(text);
  switch (platform) {
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
    case "x":
      return `https://x.com/intent/post?url=${u}&text=${tx}`;
    case "telegram":
      return `https://t.me/share/url?url=${u}&text=${tx}`;
    case "email":
      return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`;
  }
}

/**
 * Formázásmentes, legfeljebb `max` karakteres kivonat a metaadathoz:
 * HTML-címkék, Markdown-jelölők és többszörös szóközök nélkül, szóhatáron vágva, „…” végződéssel.
 */
export function plainExcerpt(input: string | null | undefined, max = 200): string {
  if (!input) return "";
  const text = input
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`#>|]+/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

/** A megosztókép címe; a `v` paraméter a túra módosításakor frissíti a platformok gyorsítótárát. */
export function tripOgImagePath(slug: string, updatedAt?: string | null): string {
  const v = updatedAt ? Date.parse(updatedAt) : NaN;
  return `/og/trips/${encodeURIComponent(slug)}${Number.isFinite(v) ? `?v=${Math.floor(v / 1000)}` : ""}`;
}

/** Inkluzív napok száma két `YYYY-MM-DD` dátum között (null, ha nincs kezdés vagy hibás a sorrend). */
export function tripDays(start?: string | null, end?: string | null): number | null {
  if (!start) return null;
  const s = Date.parse(`${start.slice(0, 10)}T00:00:00Z`);
  const e = end ? Date.parse(`${end.slice(0, 10)}T00:00:00Z`) : s;
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return null;
  return Math.round((e - s) / 86_400_000) + 1;
}
