import { describe, expect, it } from "vitest";
import { deriveRule, easterDate, previewOccurrences, ruleOccurrence, validateRuleParams } from "@/lib/calendar/rules";

describe("M23 szabálymotor — húsvét", () => {
  it.each([
    [2024, "2024-03-31"],
    [2025, "2025-04-20"],
    [2026, "2026-04-05"],
    [2027, "2027-03-28"],
    [2028, "2028-04-16"],
    [2038, "2038-04-25"],
  ])("nyugati húsvét %i → %s", (year, expected) => {
    expect(easterDate(year)).toBe(expected);
  });

  it.each([
    [2024, "2024-05-05"],
    [2025, "2025-04-20"],
    [2026, "2026-04-12"],
    [2027, "2027-05-02"],
    [2028, "2028-04-16"],
  ])("ortodox húsvét %i → %s", (year, expected) => {
    expect(easterDate(year, "orthodox")).toBe(expected);
  });

  it("tartományon kívüli évre hibát ad", () => {
    expect(() => easterDate(1800)).toThrow("calendar_year_out_of_range");
  });
});

describe("M23 szabálymotor — előfordulások", () => {
  it("rögzített nap és húsvéthoz kötött munkaszüneti nap (16. fejezet 3.)", () => {
    expect(ruleOccurrence({ kind: "fixed_annual", params: { month: 3, day: 15 } }, 2027)).toEqual({ earliest: "2027-03-15", latest: "2027-03-15" });
    const whitMonday = { kind: "easter_offset", params: { offset: 50 } } as const;
    expect(previewOccurrences(whitMonday, 2026, 3).map((p) => p.range?.earliest)).toEqual(["2026-05-25", "2027-05-17", "2028-06-05"]);
  });

  it("többnapos időszak időtartammal", () => {
    expect(ruleOccurrence({ kind: "fixed_annual", params: { month: 12, day: 24 }, durationDays: 3 }, 2026)).toEqual({ earliest: "2026-12-24", latest: "2026-12-26" });
  });

  it("évfordulón átnyúló tartomány és szökőév (F-01, EC-01)", () => {
    const winter = { kind: "fixed_annual", params: { month: 12, day: 1, end_month: 2, end_day: 29 } } as const;
    expect(ruleOccurrence(winter, 2026)).toEqual({ earliest: "2026-12-01", latest: "2027-02-28" });
    expect(ruleOccurrence(winter, 2027)).toEqual({ earliest: "2027-12-01", latest: "2028-02-29" });
  });

  it("n-edik és utolsó hétköznap", () => {
    expect(ruleOccurrence({ kind: "nth_weekday", params: { month: 5, weekday: 1, n: 1 } }, 2027)?.earliest).toBe("2027-05-03");
    expect(ruleOccurrence({ kind: "nth_weekday", params: { month: 5, weekday: 1, n: -1 } }, 2027)?.earliest).toBe("2027-05-31");
    expect(ruleOccurrence({ kind: "nth_weekday", params: { month: 2, weekday: 1, n: 5 } }, 2027)).toBeNull();
  });

  it("nem létező nap és explicit szabály esetén nincs előfordulás", () => {
    expect(ruleOccurrence({ kind: "fixed_annual", params: { month: 2, day: 29 } }, 2027)).toBeNull();
    expect(ruleOccurrence({ kind: "explicit" }, 2027)).toBeNull();
  });

  it("paraméter-validáció az SQL CHECK tükreként", () => {
    expect(validateRuleParams("fixed_annual", { month: 13, day: 1 })).toBe(false);
    expect(validateRuleParams("fixed_annual", { month: 12, day: 1, end_month: 2 })).toBe(false);
    expect(validateRuleParams("easter_offset", { offset: 1, calendar: "julian" })).toBe(false);
    expect(validateRuleParams("nth_weekday", { month: 5, weekday: 1, n: 0 })).toBe(false);
    expect(validateRuleParams("explicit", { one_off: true })).toBe(true);
    expect(validateRuleParams("explicit", null)).toBe(false);
  });
});

describe("M23 seed-generátor — szabály levezetése", () => {
  it("rögzített napot, nyugati és ortodox húsvétot, utolsó hétfőt ismer fel", () => {
    expect(deriveRule({ 2026: "2026-08-20", 2027: "2027-08-20", 2028: "2028-08-20" })).toEqual({ kind: "fixed_annual", params: { month: 8, day: 20 } });
    expect(deriveRule({ 2026: "2026-04-03", 2027: "2027-03-26", 2028: "2028-04-14" })).toEqual({ kind: "easter_offset", params: { offset: -2 } });
    expect(deriveRule({ 2026: "2026-04-13", 2027: "2027-05-03", 2028: "2028-04-17" })).toEqual({
      kind: "easter_offset",
      params: { offset: 1, calendar: "orthodox" },
    });
    expect(deriveRule({ 2026: "2026-05-25", 2027: "2027-05-31", 2028: "2028-05-29" })).toEqual({ kind: "nth_weekday", params: { month: 5, weekday: 1, n: -1 } });
  });

  it("áthelyezett (szabálytalan) dátumra nem ad szabályt", () => {
    expect(deriveRule({ 2026: "2026-12-25", 2027: "2027-12-27", 2028: "2028-12-25" })).toBeNull();
  });
});
