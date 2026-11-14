/**
 * Felület-mód tokenek — Brand Guide v2 „Éjszakai túra” (1b) §8; az értékek 2026-11-14 óta
 * a B „Terep” készletéből (packages/config/src/theme/terep.ts).
 * Terv: design/D00_Core_Components.pen#LdX4S, design/D99_Reference.pen#pixZn
 *
 * Őrzi, hogy a Night scope minden szükséges tokent felülírjon, és hogy a
 * Tailwind szemantikus színei CSS-változóra képezzenek le (különben a
 * [data-surface="night"] scope nem hatna rájuk).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// A tokenkészletek a témarétegből generált stíluslapban vannak (packages/config/src/theme → themes.generated.css);
// a Tailwind-kötések a globals.css-ben maradtak — a teszt a kettőt együtt nézi.
const css =
  readFileSync(resolve(__dirname, "../../styles/themes.generated.css"), "utf8") +
  "\n" +
  readFileSync(resolve(__dirname, "../../styles/globals.css"), "utf8");

function block(selector: string): string {
  // a szabály maga (`selector {`), nem a variánsokban előforduló részszelektor
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`(?:^|\\n)[ \\t]*${esc}\\s*\\{`).exec(css);
  if (!m) return "";
  const start = m.index;
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

/** Az összes azonos fejlécű blokk egymás után (a globals.css-ben több `@theme inline` is van). */
function blocks(selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:^|\\n)[ \\t]*${esc}\\s*\\{`, "g");
  let out = "";
  for (const m of css.matchAll(re)) {
    const open = css.indexOf("{", m.index);
    out += css.slice(open + 1, css.indexOf("}", open)) + "\n";
  }
  return out;
}

function value(scope: string, token: string): string | undefined {
  const m = scope.match(new RegExp(`${token}\\s*:\\s*([^;]+);`));
  return m?.[1].trim().toUpperCase();
}

/** Az alaptéma gyökérblokkja a generált stíluslapban. */
const ROOT = ':root,\n[data-theme="terep"]';

const NIGHT: Record<string, string> = {
  "--color-bg": "#222520",
  "--color-surface": "#2C302A",
  "--color-border": "#5A5D55",
  "--color-border-strong": "#8E8F86",
  "--color-text": "#E9E7DE",
  "--color-text-muted": "#B9B8AE",
  "--color-primary": "#F15B2A",
  "--color-primary-hover": "#F47A50",
  "--color-on-primary": "#222520",
  "--color-danger": "#F2938A",
  "--color-success": "#A6CC93",
  "--color-rating": "#E6C35A",
  "--cat-hiking": "#34D399",
  "--cat-climbing": "#D9A05B",
  "--cat-water": "#2DD4BF",
  "--cat-cycling": "#FBBF24",
  "--cat-running": "#FB7185",
  "--cat-winter": "#60A5FA",
  "--cat-expedition": "#A78BFA",
  "--cat-motorsport": "#F87171",
};

describe("felület-mód tokenek (Brand Guide v2 §8)", () => {
  const night = block('[data-surface="night"]');

  it("létezik a Night scope, és nem .dark osztályként", () => {
    expect(night).not.toBe("");
    expect(css).not.toMatch(/\.dark\s*\{/);
  });

  it.each(Object.entries(NIGHT))("Night %s = %s", (token, hex) => {
    expect(value(night, token)).toBe(hex);
  });

  it("a beágyazott Day-régió minden Night-ban felülírt tokent visszaállít", () => {
    const day = block('[data-surface="day"]');
    expect(day).not.toBe("");
    const overridden = [...night.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
    expect(overridden.length).toBeGreaterThan(20);
    for (const token of overridden) {
      expect(day, token).toMatch(new RegExp(`${token}\\s*:`));
    }
  });

  it("a Night-ban felülírt új tokeneknek van Day értéke a :root-ban", () => {
    const root = block(ROOT);
    for (const token of ["--color-on-primary", "--color-ghost", "--color-glass", "--color-input-bg", "--hero-scrim"]) {
      expect(value(root, token), token).toBeDefined();
    }
  });

  it("a Tailwind szemantikus színei CSS-változóra képeznek le", () => {
    // Tailwind v4: a téma a globals.css @theme blokkjában van. Egy szemantikus szín
    // vagy var(--…)-ra mutat, vagy a téma-változó neve maga az, amit a Night scope
    // felülír (pl. --color-surface) — mindkét esetben a [data-surface] scope hat rá.
    const inline = blocks("@theme inline");
    const theme = block("@theme") + inline;
    expect(inline).not.toBe("");
    // a futásidejű tokenre mutató értéknek `@theme inline`-ban a helye (különben :root-on oldódik fel)
    expect(block("@theme")).not.toMatch(/--color-[a-z0-9-]+:\s*var\(/);
    const nightTokens = new Set([...night.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    const root = block(ROOT);
    for (const key of ["canvas", "surface", "ink", "line", "accent", "ghost", "glass", "scrim", "cat-token"]) {
      const entries = [...theme.matchAll(new RegExp(`(--color-${key}(?:-[a-z0-9-]+)?)\\s*:\\s*([^;]+);`, "g"))];
      expect(entries.length, key).toBeGreaterThan(0);
      for (const [, name, v] of entries) {
        const runtime = nightTokens.has(name) || value(root, name) !== undefined;
        expect(v.trim().startsWith("var(--") || runtime, `${name}: ${v}`).toBe(true);
      }
    }
  });

  it("a night: variáns definiálva van (v4 @custom-variant)", () => {
    expect(css).toMatch(/@custom-variant night\s*\{/);
  });
});
