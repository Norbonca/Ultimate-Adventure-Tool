// @vitest-environment node
// hex-skip: próbakészlet és várt tokenértékek — nem megjelenítés
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  DEFAULT_THEME_ID,
  SURFACE_TOKEN_KEYS,
  THEMES,
  renderThemeCss,
  renderThemesCss,
  resolveToken,
  themeAttrs,
  validateTheme,
  type ThemeDefinition,
} from "@uat/config";

const GENERATED = resolve(__dirname, "../styles/themes.generated.css");

/** Szándékosan elütő próbakészlet: csak a tesztben él, élesbe nem kerül. */
const proba: ThemeDefinition = {
  id: "proba",
  label: "Próbakészlet",
  defaultSurface: "day",
  base: { "radius-m": "0px" },
  surfaces: {
    day: { colorScheme: "light", tokens: Object.fromEntries(SURFACE_TOKEN_KEYS.map((k) => [k, "#111111"])) as never },
    night: { colorScheme: "dark", tokens: Object.fromEntries(SURFACE_TOKEN_KEYS.map((k) => [k, "#eeeeee"])) as never },
  },
};

describe("témaréteg", () => {
  it("a generált stíluslap megegyezik a készletekből előállítottal", () => {
    const css = renderThemesCss(THEMES, DEFAULT_THEME_ID);
    if (process.env.UPDATE_THEME_CSS === "1") writeFileSync(GENERATED, css, "utf8");
    // Ha ez elbukik: a készlet változott, de a CSS nem lett újragenerálva → pnpm --filter @uat/web theme:css
    expect(readFileSync(GENERATED, "utf8")).toBe(css);
  });

  it("minden bejegyzett készlet teljes és kiadható", () => {
    for (const theme of THEMES) expect(validateTheme(theme)).toEqual([]);
  });

  it("az alaptéma a :root-ot is adja, felületblokkjai szűkítés nélküliek", () => {
    const css = renderThemeCss(DEFAULT_THEME, { isDefault: true });
    expect(css).toContain(`:root,\n[data-theme="${DEFAULT_THEME_ID}"] {`);
    expect(css).toContain(`\n[data-surface="night"] {`);
    expect(css).toContain(`\n[data-surface="day"] {`);
  });

  it("új készlet komponenskód nélkül, a saját hatókörében jelenik meg", () => {
    const css = renderThemeCss(proba, { isDefault: false });
    expect(css).not.toContain(":root");
    expect(css).toContain(`[data-theme="proba"] {`);
    expect(css).toContain(`[data-theme="proba"][data-surface="night"],\n[data-theme="proba"] [data-surface="night"] {`);
    expect(css).toContain("--radius-m: 0px;");
    expect(themeAttrs(proba)).toEqual({ "data-theme": "proba", "data-surface": "day" });
  });

  it("hiányos vagy veszélyes készletet nem ad ki", () => {
    const hianyos = { ...proba, surfaces: { ...proba.surfaces, night: { colorScheme: "dark" as const, tokens: {} as never } } };
    expect(validateTheme(hianyos).some((e) => e.includes("hiányzó token"))).toBe(true);
    const veszelyes = { ...proba, base: { "radius-m": "0; } body { display: none" } };
    expect(() => renderThemeCss(veszelyes, { isDefault: false })).toThrow();
    const rosszHely = { ...proba, base: { "color-bg": "#fff" } };
    expect(validateTheme(rosszHely).some((e) => e.includes("felületfüggő"))).toBe(true);
  });

  it("a tokenek CSS nélkül is feloldhatók (megosztókép, levél)", () => {
    expect(resolveToken(DEFAULT_THEME, "night", "color-bg")).toBe("#0F172A");
    expect(resolveToken(DEFAULT_THEME, "day", "color-primary")).toBe("#0D9488");
  });
});
