/**
 * Márkakonfiguráció — a terméknév és a márkaszövegek egyetlen forrása.
 * A név sehol nincs beégetve (Norbert, 2026-11-13): a felület, a metaadat, a megosztókép és a
 * nyelvi fájlok (`{brand}` helyőrző) innen kapják. Névváltásnál ez a fájl és a logó-vektorok
 * (`apps/web/components/brand/`) cserélendők.
 *
 * A magyar toldalékok a nyelvi fájlokban kötőjellel kapcsolódnak (`{brand}-n`, `{brand}-val`),
 * ahogy betűszóra illik.
 */
export const BRAND = {
  /** A terméknév — ZHO (a jak és a házi szarvasmarha himalájai hibridje, teherhordó túratárs). */
  name: "ZHO",
  /** Márkamondat nyelvenként. */
  tagline: {
    hu: "A kaland a tervvel kezdődik.",
    en: "The adventure starts with the plan.",
  },
  /** Az élő domain (névváltástól függetlenül). */
  siteUrl: "https://www.ttvk.hu",
} as const;

export type BrandLocale = keyof typeof BRAND.tagline;
