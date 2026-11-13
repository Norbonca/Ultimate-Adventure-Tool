import { SURFACE_TOKEN_KEYS, type SurfaceMode, type ThemeDefinition } from "./types";

const THEME_ID = /^[a-z0-9][a-z0-9-]*$/;
/** Érték, ami kitörhetne a deklarációból — a későbbi, szervezőtől jövő készleteknél ez a védőkorlát. */
const UNSAFE_VALUE = /[;{}<>]|\/\*|\*\/|@import|url\s*\(|expression\s*\(/i;
const TOKEN_NAME = /^[a-z0-9][a-z0-9-]*$/;

/** Hibalista; üres, ha a készlet kiadható. */
export function validateTheme(theme: ThemeDefinition): string[] {
  const errors: string[] = [];
  if (!THEME_ID.test(theme.id)) errors.push(`érvénytelen témaazonosító: "${theme.id}"`);
  const surfaceKeys = new Set<string>(SURFACE_TOKEN_KEYS);
  const check = (where: string, name: string, value: string) => {
    if (!TOKEN_NAME.test(name)) errors.push(`${where}: érvénytelen tokennév "${name}"`);
    if (typeof value !== "string" || value.trim() === "") errors.push(`${where}: üres érték (${name})`);
    else if (UNSAFE_VALUE.test(value)) errors.push(`${where}: nem megengedett érték (${name})`);
  };
  for (const [name, value] of Object.entries(theme.base)) {
    if (surfaceKeys.has(name)) errors.push(`base: "${name}" felületfüggő token — a surfaces alá tartozik`);
    check("base", name, value);
  }
  for (const mode of ["day", "night"] as const) {
    const surface = theme.surfaces[mode];
    for (const key of SURFACE_TOKEN_KEYS) {
      if (!(key in surface.tokens)) errors.push(`${mode}: hiányzó token "${key}"`);
    }
    for (const [name, value] of Object.entries(surface.tokens)) {
      if (!surfaceKeys.has(name)) errors.push(`${mode}: ismeretlen felülettoken "${name}"`);
      check(mode, name, value);
    }
  }
  return errors;
}

function declarations(tokens: Record<string, string>, indent: string): string {
  return Object.entries(tokens)
    .map(([name, value]) => `${indent}--${name}: ${value};`)
    .join("\n");
}

function surfaceSelector(theme: ThemeDefinition, mode: SurfaceMode, isDefault: boolean): string {
  // Az alaptéma felületblokkjai szűkítés nélküliek (ahogy a témaréteg előtt), így egy másik
  // téma régiójában a két attribútumos, erősebb szabály nyer.
  if (isDefault) return `[data-surface="${mode}"]`;
  return `[data-theme="${theme.id}"][data-surface="${mode}"],\n[data-theme="${theme.id}"] [data-surface="${mode}"]`;
}

/** Egy téma CSS-e. Az alaptéma a `:root`-ot is adja: hiányzó `data-theme` mellett is az érvényes. */
export function renderThemeCss(theme: ThemeDefinition, options: { isDefault: boolean }): string {
  const errors = validateTheme(theme);
  if (errors.length > 0) throw new Error(`Hibás témakészlet (${theme.id}):\n- ${errors.join("\n- ")}`);
  const rootSelector = options.isDefault ? `:root,\n[data-theme="${theme.id}"]` : `[data-theme="${theme.id}"]`;
  const blocks: string[] = [
    // A gyökér a `day` felület értékeit kapja; `color-scheme` csak a kifejezett felületblokkokban áll.
    `${rootSelector} {\n${declarations(theme.base, "  ")}\n${declarations(theme.surfaces.day.tokens, "  ")}\n}`,
  ];
  for (const mode of ["night", "day"] as const) {
    const surface = theme.surfaces[mode];
    blocks.push(
      `${surfaceSelector(theme, mode, options.isDefault)} {\n${declarations(surface.tokens, "  ")}\n  color-scheme: ${surface.colorScheme};\n}`,
    );
  }
  return blocks.join("\n\n");
}

export const GENERATED_HEADER = `/* GENERÁLT FÁJL — ne szerkeszd.
   Forrás: packages/config/src/theme/*.ts · Újragenerálás: pnpm --filter @uat/web theme:css
   Egy megjelenés = egy tokenkészlet: [data-theme] választja a készletet, [data-surface] a felületet. */`;

/** A teljes generált stíluslap: elöl az alaptéma, utána a többi. */
export function renderThemesCss(themes: readonly ThemeDefinition[], defaultId: string): string {
  const ids = themes.map((t) => t.id);
  if (new Set(ids).size !== ids.length) throw new Error("Ismétlődő témaazonosító");
  const def = themes.find((t) => t.id === defaultId);
  if (!def) throw new Error(`Az alaptéma nincs a jegyzékben: ${defaultId}`);
  const ordered = [def, ...themes.filter((t) => t !== def)];
  return `${GENERATED_HEADER}\n\n${ordered.map((t) => renderThemeCss(t, { isDefault: t === def })).join("\n\n")}\n`;
}
