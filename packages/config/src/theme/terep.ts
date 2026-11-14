import { alap } from "./alap";
import type { SurfaceMode, ThemeDefinition } from "./types";

/**
 * „terep" — a B „Terep" megjelenés (vászon: design/claude/B_Komponensek, design system:
 * design/claude/B_DesignSystem; tokenértékek: design/claude/Arculat_iranyok/WORK_B_tokenkeszlet.md).
 *
 * 1. lépés (tokencsere): szén, csont és jelzőnarancs paletta, Barlow, szögletes forma, árnyék és
 * színátmenet nélkül. A felület-módok szerepe nem változik: a nem-admin felület Night (szén),
 * az admin Day (csont). A szakaszszintű Day/Night elrendezés a 2. lépés.
 *
 * A `pal-*` tokenek a Tailwind-palettaosztályokat (navy, slate, trevu, teal, emerald, red, amber …)
 * kötik a témához: a `globals.css` `@theme inline` blokkja `var(--pal-…, <alapérték>)` alakban olvassa,
 * így az „alap" készletnek nem kell megadnia őket.
 *
 * NE szerkeszd a generált CSS-t — itt módosíts, majd: `pnpm --filter @uat/web theme:css`.
 */

const SZEN = "#222520";
const SZEN_EMELT = "#2C302A";
const KO = "#5A5D55";
const KOD = "#B9B8AE";
const CSONT = "#E9E7DE";
const NARANCS = "#F15B2A";
const NARANCS_VILAGOS = "#F47A50";
const NARANCS_SOTET = "#B3360E";

/** Meleg semleges skála (szén → csont) a navy, slate, gray és stone osztályokhoz. */
const SEMLEGES: Record<string, string> = {
  "50": CSONT,
  "100": "#DEDCD1",
  "200": "#CFCDC2",
  "300": KOD,
  "400": "#8E8F86",
  "500": "#797B72",
  "600": KO,
  "700": "#3A3D37",
  "800": SZEN_EMELT,
  "900": SZEN,
  "950": "#181A16",
};

/** Narancs skála a trevu, brand és teal osztályokhoz. A 600-as kitöltésen a világos felirat 5,0:1. */
const NARANCS_SKALA: Record<string, string> = {
  "50": "#FBEDE6",
  "100": "#F8D9CB",
  "200": "#F4B79C",
  "300": "#F4926D",
  "400": NARANCS_VILAGOS,
  "500": NARANCS,
  "600": "#B83A12",
  "700": NARANCS_SOTET,
  "800": "#8E2A0B",
  "900": "#6B2008",
  "950": "#431405",
};

const HIBA: Record<string, string> = {
  "50": "#F9E4E1", "100": "#F2CCC7", "200": "#F2B0A8", "300": "#F2938A", "400": "#E8705F",
  "500": "#C83A2A", "600": "#A3271C", "700": "#8A1F16", "800": "#721A12", "900": "#5A140E", "950": "#3A0C08",
};
const SIKER: Record<string, string> = {
  "50": "#E5EEDF", "100": "#D2E3C8", "200": "#BCD8AD", "300": "#A6CC93", "400": "#84B46E",
  "500": "#5A8A4A", "600": "#3D6A33", "700": "#31572A", "800": "#284722", "900": "#1F3A1B", "950": "#132411",
};
const FIGYELMEZTETES: Record<string, string> = {
  "50": "#F6EFD6", "100": "#EFE2B2", "200": "#EAD286", "300": "#E6C35A", "400": "#D9AE33",
  "500": "#B08A10", "600": "#7A5E00", "700": "#634C00", "800": "#4F3D00", "900": "#3E3000", "950": "#261D00",
};

function skala(csalad: string, ertekek: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(ertekek).map(([fok, ertek]) => [`pal-${csalad}-${fok}`, ertek]));
}

/** A kategóriaszínek és a chip-árnyalat az „alap" készletből jönnek (a DB-kategóriák színe nem a téma dolga). */
function kategoriak(mode: SurfaceMode) {
  const t = alap.surfaces[mode].tokens;
  return {
    "cat-hiking": t["cat-hiking"],
    "cat-climbing": t["cat-climbing"],
    "cat-water": t["cat-water"],
    "cat-cycling": t["cat-cycling"],
    "cat-running": t["cat-running"],
    "cat-winter": t["cat-winter"],
    "cat-expedition": t["cat-expedition"],
    "cat-motorsport": t["cat-motorsport"],
    "chip-tint": t["chip-tint"],
  };
}

const NINCS_ARNYEK = "0 0 #0000";

export const terep: ThemeDefinition = {
  id: "terep",
  label: "B — Terep",
  defaultSurface: "night",
  base: {
    ...alap.base,
    // Régi nevek — a meglévő hivatkozások a B értékeit kapják
    "trevu-teal": NARANCS_SOTET,
    "trevu-teal-light": NARANCS,
    "trevu-teal-dark": "#8E2A0B",
    "trevu-teal-bg": "rgba(241, 91, 42, 0.08)",
    "deep-navy": SZEN,
    "navy-800": SZEN_EMELT,
    "arctic-white": CSONT,
    "card-bg": "#DEDCD1",
    "border-subtle": "#CFCDC2",
    "border-medium": KOD,
    "text-primary": SZEN,
    "text-secondary": "#3A3D37",
    "text-muted": "#797B72",
    "text-slate": KO,
    "sunrise-coral": "#A3271C",
    "trail-sage": "#3D6A33",
    "golden-hour": "#E6C35A",
    // Forma: minden lekerekítés 0, árnyék és színátmenet nincs
    "radius-s": "0px",
    "radius-m": "0px",
    "radius-l": "0px",
    "radius-chip": "0px",
    "shadow-card": "none",
    "shadow-card-hover": "none",
    "shadow-primary": "none",
    "gradient-trevu": `linear-gradient(${NARANCS}, ${NARANCS})`,
    "gradient-dawn": `linear-gradient(${NARANCS}, ${NARANCS})`,
    // Betű: Barlow a felület és a szöveg, JetBrains Mono az adat. Az Anton (csak verzál) a 2. lépés elrendezéseivel jön.
    "font-mono": "\"JetBrains Mono\", ui-monospace, monospace",
    "font-family-sans": "\"Barlow\", system-ui, sans-serif",
    "font-family-display": "\"Barlow\", system-ui, sans-serif",
    "font-family-mono": "\"JetBrains Mono\", ui-monospace, monospace",
    // Szemantikus kiegészítők
    "color-primary-light": NARANCS,
    "color-success-subtle": "#E5EEDF",
    "color-success-text": "#3D6A33",
    "color-danger-subtle": "#F9E4E1",
    "color-warning-subtle": "#F6EFD6",
    "color-navy-800": SZEN_EMELT,
    "color-warning": "#B08A10",
    "color-warning-text": "#7A5E00",
    "dark-bg": SZEN,
    "dark-surface": SZEN_EMELT,
    "dark-border": KO,
    "dark-text": CSONT,
    "dark-text-muted": KOD,
    "dark-primary": NARANCS,
    "dark-danger": "#F2938A",
    "dark-primary-hover": NARANCS_VILAGOS,
    "globe-space-top": SZEN_EMELT,
    "globe-space-bottom": "#141612",
    "globe-ink": "#181A16",
    "globe-stop-ink": "#1B1D18",
    "globe-sphere-1": "#3A3D37",
    "globe-sphere-2": SZEN_EMELT,
    "globe-sphere-3": "#1B1D18",
    "globe-land-1": KO,
    "globe-land-2": "#3A3D37",
    "hero-scrim": "linear-gradient(to top, rgba(34, 37, 32, 0.92) 0%, rgba(34, 37, 32, 0.65) 35%, rgba(34, 37, 32, 0) 70%)",
    "hero-scrim-mobile": "linear-gradient(to top, rgba(34, 37, 32, 0.94) 0%, rgba(34, 37, 32, 0.8) 45%, rgba(34, 37, 32, 0.35) 80%, rgba(34, 37, 32, 0.15) 100%)",
    "color-scrim": "rgba(34, 37, 32, 0.7)",
    // Tailwind-paletták a témából
    ...skala("navy", SEMLEGES),
    ...skala("slate", SEMLEGES),
    ...skala("gray", SEMLEGES),
    ...skala("stone", SEMLEGES),
    ...skala("trevu", NARANCS_SKALA),
    ...skala("brand", NARANCS_SKALA),
    ...skala("teal", NARANCS_SKALA),
    ...skala("red", HIBA),
    ...skala("rose", HIBA),
    ...skala("emerald", SIKER),
    ...skala("green", SIKER),
    ...skala("amber", FIGYELMEZTETES),
    ...skala("yellow", FIGYELMEZTETES),
    "pal-coral": HIBA["400"]!,
    "pal-coral-light": HIBA["300"]!,
    "pal-sage": SIKER["300"]!,
    "pal-golden": FIGYELMEZTETES["300"]!,
    "pal-orange": NARANCS,
    "pal-white": "#F2F0E8",
    "pal-black": "#181A16",
    // Tailwind-lekerekítés és -árnyék a témából (a kapszula — rounded-full — marad)
    "pal-radius": "0px",
    "pal-radius-xs": "0px",
    "pal-radius-sm": "0px",
    "pal-radius-md": "0px",
    "pal-radius-lg": "0px",
    "pal-radius-xl": "0px",
    "pal-radius-2xl": "0px",
    "pal-radius-3xl": "0px",
    "pal-radius-4xl": "0px",
    "pal-radius-trevu": "0px",
    "pal-radius-trevu-lg": "0px",
    "pal-radius-trevu-xl": "0px",
    "pal-radius-trevu-2xl": "0px",
    "pal-radius-trevu-3xl": "0px",
    "pal-radius-chip": "0px",
    "pal-shadow": NINCS_ARNYEK,
    "pal-shadow-2xs": NINCS_ARNYEK,
    "pal-shadow-xs": NINCS_ARNYEK,
    "pal-shadow-sm": NINCS_ARNYEK,
    "pal-shadow-md": NINCS_ARNYEK,
    "pal-shadow-lg": NINCS_ARNYEK,
    "pal-shadow-xl": NINCS_ARNYEK,
    "pal-shadow-2xl": NINCS_ARNYEK,
    "pal-shadow-trevu": NINCS_ARNYEK,
    "pal-shadow-trevu-sm": NINCS_ARNYEK,
    "pal-shadow-trevu-lg": NINCS_ARNYEK,
    "pal-shadow-trevu-xl": NINCS_ARNYEK,
    "pal-shadow-trevu-glow": NINCS_ARNYEK,
  },
  surfaces: {
    day: {
      colorScheme: "light",
      tokens: {
        "color-primary-subtle": "#F6E3D9",
        "color-bg": CSONT,
        "color-surface": "#F2F0E8",
        "color-border": "#CFCDC2",
        "color-border-strong": "#797B72",
        "color-text": SZEN,
        "color-text-muted": KO,
        "color-text-secondary": "#3A3D37",
        "color-text-body": SZEN_EMELT,
        "color-text-subtle": "#797B72",
        // Világos alapon a jelzőnarancs szövegként bukik (2,70) — a Day primary a sötét narancs
        "color-primary": NARANCS_SOTET,
        "color-primary-hover": "#8E2A0B",
        "color-on-primary": "#F2F0E8",
        "color-danger": "#A3271C",
        "color-success": "#3D6A33",
        "color-rating": "#7A5E00",
        "color-ghost": "#DEDCD1",
        "color-glass": "rgba(233, 231, 222, 0.9)",
        "color-input-bg": "#F2F0E8",
        "focus-ring": `0 0 0 3px ${CSONT}, 0 0 0 5px ${SZEN}`,
        ...kategoriak("day"),
        "difficulty-1": "#3D6A33",
        "difficulty-2": "#7A5E00",
        "difficulty-3": NARANCS_SOTET,
        "difficulty-4": "#A3271C",
        "difficulty-5": SZEN,
      },
    },
    night: {
      colorScheme: "dark",
      tokens: {
        "color-primary-subtle": "#3D2A21",
        "color-bg": SZEN,
        // A tartalmi felület egy fokkal emelt, hogy a mai kártyás elrendezés olvasható maradjon (2. lépésben vonal váltja)
        "color-surface": SZEN_EMELT,
        "color-border": KO,
        "color-border-strong": "#8E8F86",
        "color-text": CSONT,
        "color-text-muted": KOD,
        "color-text-secondary": "#CFCDC2",
        "color-text-body": "#DEDCD1",
        "color-text-subtle": "#8E8F86",
        "color-primary": NARANCS,
        "color-primary-hover": NARANCS_VILAGOS,
        "color-on-primary": SZEN,
        "color-danger": "#F2938A",
        "color-success": "#A6CC93",
        "color-rating": "#E6C35A",
        "color-ghost": "rgba(233, 231, 222, 0.08)",
        "color-glass": "rgba(44, 48, 42, 0.9)",
        "color-input-bg": "rgba(233, 231, 222, 0.06)",
        "focus-ring": `0 0 0 3px ${SZEN}, 0 0 0 5px ${CSONT}`,
        ...kategoriak("night"),
        "difficulty-1": "#A6CC93",
        "difficulty-2": "#E6C35A",
        "difficulty-3": NARANCS_VILAGOS,
        "difficulty-4": "#F2938A",
        "difficulty-5": CSONT,
      },
    },
  },
};
