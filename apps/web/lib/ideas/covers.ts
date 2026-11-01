/**
 * Kategória-borítókép választása a ref_cover_images soraiból (M22 Ötletbörze).
 *
 * A seed-sample-data.mjs mintaképei (`source = "uploaded"`) véletlen Picsum-fotók, kategóriától
 * függetlenül — a „Vízi sportok” kiemelt mintaképe egy gitár volt (2026-11-01). Ezért a kiemelés
 * mellett a forrás is számít: kurált (unsplash, stock) → egyéb → feltöltött; azon belül sort_order.
 * Ugyanez a sorrend, mint a seed-szkript túraborító-választásáé.
 */
export interface CoverRow {
  category_id: string;
  url: string;
  source?: string | null;
  is_featured?: boolean | null;
  sort_order?: number | null;
}

const SOURCE_RANK: Record<string, number> = { unsplash: 0, stock: 1, uploaded: 3 };
const rank = (s?: string | null) => SOURCE_RANK[s ?? ""] ?? 2;

export function pickCategoryCovers(rows: CoverRow[]): Record<string, string> {
  const sorted = [...rows].sort(
    (a, b) =>
      rank(a.source) - rank(b.source) ||
      Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)) ||
      (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const map: Record<string, string> = {};
  for (const r of sorted) if (!map[r.category_id]) map[r.category_id] = r.url;
  return map;
}
