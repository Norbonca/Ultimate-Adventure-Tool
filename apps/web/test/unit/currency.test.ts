import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/currency";

describe("formatMoney (CODE-006 — nincs beégetett pénznemjel)", () => {
  it("a tárolt pénznemet használja, nem eurót", () => {
    expect(formatMoney(100000, "HUF", "hu")).toContain("Ft");
    expect(formatMoney(100000, "HUF", "hu")).not.toContain("€");
    expect(formatMoney(250, "EUR", "en")).toBe("€250.00");
  });
  it("0 tizedessel formázza a nulla tizedesű pénznemeket", () => {
    expect(formatMoney(100000, "HUF", "en").replace(/\u00a0/g, " ")).toBe("HUF 100,000");
    expect(formatMoney(5000, "JPY", "en")).toBe("¥5,000");
  });
  it("negatív és hiányzó összeget is kezel", () => {
    expect(formatMoney(-120, "EUR", "en")).toBe("-€120.00");
    expect(formatMoney(null, "EUR", "en")).toBe("€0.00");
  });
  it("szabálytalan vagy hiányzó kódnál szöveges tartalék", () => {
    expect(formatMoney(12.5, "Z", "en")).toBe("12.5 Z");
    expect(formatMoney(12.5, null, "en")).toBe("12.5");
  });
});
