// @vitest-environment node
import { describe, expect, it } from "vitest";
import { BRAND } from "@uat/config";
import { applyBrand, getTranslations, type BrandTexts } from "@uat/i18n";
import huRaw from "../../../packages/i18n/src/hu";
import enRaw from "../../../packages/i18n/src/en";

const strings = (node: unknown): string[] =>
  typeof node === "string" ? [node] : node && typeof node === "object" ? Object.values(node).flatMap(strings) : [];

describe("márkanév a szövegekben — névtől függő magyar alakok", () => {
  it("a nyelvi fájlban nincs a névhez kézzel írt toldalék vagy névelő", () => {
    for (const s of strings(huRaw)) {
      expect(s, s).not.toMatch(/\{brand\}-\p{L}/u); // toldalék: {brand_ban} / {brand_n} / {brand_t} / {brand_val}
      expect(s, s).not.toMatch(/(^|[\s(„"])(a|az) \{brand/i); // névelő: {nevelo} / {Nevelo}
    }
  });

  it("az angol szövegek nem használnak magyar alakot", () => {
    for (const s of strings(enRaw)) expect(s, s).not.toMatch(/\{(nevelo|Nevelo|brand_\w+)\}/);
  });

  it("a kész szövegekben nem marad feloldatlan márka-helyőrző", () => {
    for (const locale of ["hu", "en"] as const) {
      for (const s of strings(getTranslations(locale))) expect(s, s).not.toMatch(/\{(brand\w*|nevelo|Nevelo|tagline)\}/);
    }
  });

  it("a márkakonfiguráció magyar alakjai a névből indulnak", () => {
    expect(["a", "az"]).toContain(BRAND.hu.article);
    for (const form of Object.values(BRAND.hu.forms)) expect(form.startsWith(BRAND.name), form).toBe(true);
  });

  it("névváltáskor a névelő és a toldalék a konfigurációból jön", () => {
    const apex: BrandTexts = {
      name: "Apex",
      tagline: { hu: "x", en: "x" },
      hu: { article: "az", forms: { ban: "Apexben", n: "Apexen", t: "Apexet", val: "Apexszel" } },
    };
    const hu = applyBrand(huRaw, "hu", apex);
    expect(hu.auth.loginSubtitle).toBe("Üdvözlünk az Apexben");
    expect(hu.auth.registerSubtitle).toBe("Csatlakozz az Apex közösségéhez");
    const all = strings(hu);
    expect(all.some((s) => s.includes("Az Apex "))).toBe(true);
    expect(all.some((s) => /\ba Apex/.test(s) || s.includes("Apex-"))).toBe(false);
  });
});
