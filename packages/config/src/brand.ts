/**
 * Márkakonfiguráció — a terméknév és a márkaszövegek egyetlen forrása.
 * A név sehol nincs beégetve (Norbert, 2026-11-13): a felület, a metaadat, a megosztókép és a
 * nyelvi fájlok (`{brand}` helyőrző) innen kapják. Névváltásnál ez a fájl és a logó-vektorok
 * (`apps/web/components/brand/`) cserélendők.
 *
 * A magyar névelő és a toldalékos alakok a név kiejtésétől függnek (a/az; -ban/-ben, -n/-on/-en,
 * -val/-vel hasonulással), ezért nem a nyelvi fájlokban állnak, hanem itt, a `hu` alatt: a szövegek
 * a `{nevelo}`, `{brand_ban}`, `{brand_n}`, `{brand_t}`, `{brand_val}` helyőrzőt használják.
 * Névváltáskor ezt a hat értéket kézzel kell átírni — a `brand-forms` teszt jelez, ha kimarad.
 */
export const BRAND = {
  /** A terméknév — ZHO (a jak és a házi szarvasmarha himalájai hibridje, teherhordó túratárs). */
  name: "ZHO",
  /** Márkamondat nyelvenként. */
  tagline: {
    hu: "A kaland a tervvel kezdődik.",
    en: "The adventure starts with the plan.",
  },
  /** Magyar nyelvtani alakok — a név kiejtéséhez igazítva. */
  hu: {
    /** Határozott névelő a név előtt: „a" mássalhangzóval, „az" magánhangzóval kezdődő kiejtésnél. */
    article: "a",
    /** Toldalékos alakok (betűszóhoz kötőjellel): hol? -ban/-ben · min? -n/-on/-en · mit? -t · mivel? -val/-vel. */
    forms: {
      ban: "ZHO-ban",
      n: "ZHO-n",
      t: "ZHO-t",
      val: "ZHO-val",
    },
  },
  /** Az élő domain (névváltástól függetlenül). */
  siteUrl: "https://www.ttvk.hu",
} as const;

export type BrandLocale = keyof typeof BRAND.tagline;
