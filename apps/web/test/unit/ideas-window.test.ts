import { describe, it, expect } from "vitest";
import {
  autoYear,
  endYear,
  expiresAt,
  validateWindow,
  windowDates,
  windowMonthList,
  windowMonths,
  windowsOverlap,
} from "@/lib/ideas/window";

describe("M22 időablak (BR-M22-003/004/018)", () => {
  it("évfordulós ablak: a záró hónap a következő évbe esik", () => {
    const w = { startMonth: 11, endMonth: 2, year: 2026 };
    expect(endYear(w)).toBe(2027);
    expect(windowMonths(w)).toBe(4);
    expect(windowMonthList(w)).toEqual([11, 12, 1, 2]);
    expect(windowDates(w)).toEqual({ start: "2026-11-01", end: "2027-02-28" });
  });

  it("egy hónapos ablak és szökőév", () => {
    expect(windowMonths({ startMonth: 7, endMonth: 7, year: 2026 })).toBe(1);
    expect(windowDates({ startMonth: 2, endMonth: 2, year: 2028 }).end).toBe("2028-02-29");
  });

  it("autoYear: a legközelebbi év, amelyben az ablak még nem ért véget", () => {
    const today = new Date("2026-10-31T10:00:00Z");
    expect(autoYear(7, 8, today)).toBe(2027); // a nyár már elmúlt
    expect(autoYear(11, 12, today)).toBe(2026); // még tart
    expect(autoYear(10, 10, today)).toBe(2026); // az utolsó napon még érvényes
  });

  it("validateWindow: múlt, túl távoli, túl hosszú", () => {
    const today = new Date("2026-10-31T10:00:00Z");
    expect(validateWindow({ startMonth: 5, endMonth: 6, year: 2026 }, today)).toBe("windowInPast");
    expect(validateWindow({ startMonth: 1, endMonth: 2, year: 2029 }, today)).toBe("windowTooFar");
    expect(validateWindow({ startMonth: 1, endMonth: 12, year: 2027 }, today, 6)).toBe("windowTooLong");
    expect(validateWindow({ startMonth: 7, endMonth: 8, year: 2027 }, today)).toBeNull();
  });

  it("expiresAt: a záró nap vége az ötletgazda zónájában (NyK-01)", () => {
    const d = expiresAt({ startMonth: 7, endMonth: 8, year: 2027 }, "Europe/Budapest");
    // a záró nap vége = a következő nap 00:00 CEST = 2027-08-31 22:00 UTC (kizáró határ)
    expect(d.toISOString()).toBe("2027-08-31T22:00:00.000Z");
  });

  it("windowsOverlap", () => {
    expect(windowsOverlap({ start: "2027-07-01", end: "2027-08-31" }, { start: "2027-08-01", end: "2027-09-30" })).toBe(true);
    expect(windowsOverlap({ start: "2027-07-01", end: "2027-08-31" }, { start: "2027-09-01", end: "2027-09-30" })).toBe(false);
  });
});
