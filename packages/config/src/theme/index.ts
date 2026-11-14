import { alap } from "./alap";
import { terep } from "./terep";
import type { SurfaceMode, ThemeDefinition } from "./types";

export * from "./types";
export { renderThemeCss, renderThemesCss, validateTheme } from "./css";

/** A témajegyzék: új megjelenés = új készletfájl + egy sor itt. Komponenskód nem kell hozzá. */
export const THEMES = [terep, alap] as const satisfies readonly ThemeDefinition[];

/** 2026-11-14: a B „Terep" az alapmegjelenés (Norbert: „mehet élesbe a B terv"). Visszaállás: `alap`. */
export const DEFAULT_THEME_ID = terep.id;
export const DEFAULT_THEME: ThemeDefinition = terep;

export function getTheme(id: string | null | undefined): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? DEFAULT_THEME;
}

/**
 * Egy témarégió gyökerének attribútumai. Mindig mindkettőt adja: a téma gyökere a `day`
 * értékeket állítja be, ezért felület nélkül egy Night-régióba ágyazva világosra váltana.
 */
export function themeAttrs(
  theme: ThemeDefinition = DEFAULT_THEME,
  surface: SurfaceMode = theme.defaultSurface,
): { "data-theme": string; "data-surface": SurfaceMode } {
  return { "data-theme": theme.id, "data-surface": surface };
}

/** Egy token feloldott értéke CSS nélkül (megosztókép, levél). A `var(--…)` hivatkozásokat követi. */
export function resolveToken(theme: ThemeDefinition, surface: SurfaceMode, name: string): string | undefined {
  const all: Record<string, string> = { ...theme.base, ...theme.surfaces[surface].tokens };
  let value: string | undefined = all[name];
  for (let i = 0; value !== undefined && i < 8; i++) {
    const ref = /^var\(--([a-z0-9-]+)\)$/.exec(value.trim());
    if (!ref || !ref[1]) return value;
    value = all[ref[1]];
  }
  return value;
}
