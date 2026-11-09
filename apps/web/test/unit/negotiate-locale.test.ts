import { describe, expect, it } from "vitest";
import { isSupportedLocale, negotiateLocale } from "@/lib/i18n/negotiate";

describe("negotiateLocale — az olvasó nyelve (Accept-Language)", () => {
  it("fejléc nélkül az alapértelmezett nyelv", () => {
    expect(negotiateLocale(null)).toBe("hu");
    expect(negotiateLocale("")).toBe("hu");
  });

  it("régióval együtt is felismeri a támogatott nyelvet", () => {
    expect(negotiateLocale("en-GB,en;q=0.9")).toBe("en");
    expect(negotiateLocale("hu-HU,hu;q=0.9,en;q=0.8")).toBe("hu");
  });

  it("a q-súly szerint választ, a nem támogatottakat átugorja", () => {
    expect(negotiateLocale("de-DE,de;q=0.9,en;q=0.8,hu;q=0.7")).toBe("en");
    expect(negotiateLocale("hu;q=0.5,en;q=0.9")).toBe("en");
    expect(negotiateLocale("fr,es;q=0.8")).toBe("hu");
  });

  it("a q=0 nyelvet kizárja", () => {
    expect(negotiateLocale("en;q=0,hu;q=0.5")).toBe("hu");
  });

  it("isSupportedLocale", () => {
    expect(isSupportedLocale("en")).toBe(true);
    expect(isSupportedLocale("de")).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
  });
});
