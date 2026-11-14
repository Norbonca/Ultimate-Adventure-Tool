/**
 * Témaréteg — egy megjelenés = egy tokenkészlet.
 *
 * Két tengely van, és nem egymás alternatívái:
 *  - `data-theme`   → MELYIK értékkészlet (ez a fájl írja le);
 *  - `data-surface` → a készleten belül világos (`day`) vagy sötét (`night`) régió.
 * Minden téma megadja mindkét felület értékeit. A komponens csak a szemantikus
 * tokent ismeri (`--color-bg`, `--color-text`, …), értéket és témanevet nem.
 *
 * Egy forrás, két kimenet: ebből az objektumból készül a CSS
 * (`apps/web/styles/themes.generated.css`, lásd `./css.ts`), és ugyanezt olvassa
 * minden, ami nem lát CSS-változót (megosztókép, később levélsablon).
 */

export type SurfaceMode = "day" | "night";

/** A felületfüggő szemantikus tokenek zárt listája — minden témának mindkét felületre meg kell adnia. */
export const SURFACE_TOKEN_KEYS = [
  "color-primary-subtle",
  "color-bg",
  "color-surface",
  "color-border",
  "color-border-strong",
  "color-text",
  "color-text-muted",
  "color-text-secondary",
  "color-text-body",
  "color-text-subtle",
  "color-primary",
  "color-primary-hover",
  "color-on-primary",
  "color-danger",
  "color-success",
  "color-rating",
  "color-ghost",
  "color-glass",
  "color-input-bg",
  "focus-ring",
  "cat-hiking",
  "cat-climbing",
  "cat-water",
  "cat-cycling",
  "cat-running",
  "cat-winter",
  "cat-expedition",
  "cat-motorsport",
  "chip-tint",
  // Nehézségi szintek (1–5): Day-en sötét, Night-on világos fokozat — a kijelölt szint felirata `--color-bg`
  "difficulty-1",
  "difficulty-2",
  "difficulty-3",
  "difficulty-4",
  "difficulty-5",
] as const;

export type SurfaceTokenKey = (typeof SURFACE_TOKEN_KEYS)[number];

export interface SurfaceTokens {
  /** A böngésző saját vezérlőinek (görgetősáv, űrlapelem) módja ezen a felületen. */
  colorScheme: "light" | "dark";
  tokens: Record<SurfaceTokenKey, string>;
}

export interface ThemeDefinition {
  /** A `data-theme` attribútum értéke; kisbetű, szám, kötőjel. */
  id: string;
  /** Belső megnevezés (napló, admin) — felhasználónak nem jelenik meg. */
  label: string;
  /** Az oldal alapfelülete: ezt kapja a `<body>`, ha az útvonal mást nem kér. */
  defaultSurface: SurfaceMode;
  /**
   * Felületfüggetlen tokenek (alapértékek, méretek, betűk, árnyék, mozgás …),
   * CSS custom property név `--` nélkül → érték. A `SURFACE_TOKEN_KEYS` kulcsai ide nem kerülhetnek.
   */
  base: Record<string, string>;
  surfaces: Record<SurfaceMode, SurfaceTokens>;
}
