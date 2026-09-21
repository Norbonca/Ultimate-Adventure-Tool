/**
 * Felület-mód tokenek — Brand Guide v2 „Éjszakai túra” (1b) §8.
 * Terv: design/D00_Core_Components.pen#LdX4S, design/D99_Reference.pen#pixZn
 *
 * Őrzi, hogy a Night scope minden szükséges tokent felülírjon, és hogy a
 * Tailwind szemantikus színei CSS-változóra képezzenek le (különben a
 * [data-surface="night"] scope nem hatna rájuk).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import tailwindConfig from "../../tailwind.config";

const css = readFileSync(resolve(__dirname, "../../styles/globals.css"), "utf8");

function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const start = css.search(new RegExp(`${escaped}\\s*\\{`));
  if (start < 0) return "";
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

function value(scope: string, token: string): string | undefined {
  const m = scope.match(new RegExp(`${token}\\s*:\\s*([^;]+);`));
  return m?.[1].trim().toUpperCase();
}

const NIGHT: Record<string, string> = {
  "--color-bg": "#121513",
  "--color-surface": "#1B1F1C",
  "--color-border": "#2E3430",
  "--color-border-strong": "#EBEEE9",
  "--color-text": "#EBEEE9",
  "--color-text-muted": "#A2AAA4",
  "--color-primary": "#F0693A",
  "--color-primary-hover": "#F58C62",
  "--color-on-primary": "#151916",
  "--color-danger": "#FCA5A1",
  "--color-success": "#6EE7B7",
  "--color-rating": "#FCD34D",
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
    const root = block(":root");
    for (const token of ["--color-on-primary", "--color-ghost", "--color-glass", "--color-input-bg", "--hero-scrim"]) {
      expect(value(root, token), token).toBeDefined();
    }
  });

  it("a Tailwind szemantikus színei CSS-változóra képeznek le", () => {
    const colors = tailwindConfig.theme?.extend?.colors as Record<string, unknown>;
    const flat = (v: unknown): string[] =>
      typeof v === "string" ? [v] : Object.values(v as Record<string, unknown>).flatMap(flat);
    for (const key of ["canvas", "surface", "ink", "line", "accent", "ghost", "glass", "scrim", "cat-token"]) {
      const values = flat(colors[key]);
      expect(values.length, key).toBeGreaterThan(0);
      for (const v of values) expect(v, key).toMatch(/^var\(--/);
    }
  });
});
