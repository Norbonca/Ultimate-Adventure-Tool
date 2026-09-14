import { describe, expect, it } from "vitest";
import { buildRoute, todayIso, tripDays, weeksFrom } from "@/lib/globe-payload";

describe("globe payload helpers", () => {
  it("counts weeks from week0, fractional and negative alike", () => {
    expect(weeksFrom("2026-09-14", "2026-09-14")).toBe(0);
    expect(weeksFrom("2026-09-14", "2026-09-21")).toBe(1);
    expect(weeksFrom("2026-09-14", "2026-09-17")).toBeCloseTo(3 / 7, 6);
    expect(weeksFrom("2026-09-14", "2026-09-07")).toBe(-1);
    expect(weeksFrom("2026-09-14", null)).toBe(0);
    expect(weeksFrom("2026-09-14", "not-a-date")).toBe(0);
  });

  it("measures trip length inclusively, never below one day", () => {
    expect(tripDays("2026-10-01", "2026-10-01")).toBe(1);
    expect(tripDays("2026-10-01", "2026-10-03")).toBe(3);
    expect(tripDays("2026-10-03", "2026-10-01")).toBe(1);
    expect(tripDays(null, "2026-10-01")).toBe(1);
  });

  it("formats today as an ISO date", () => {
    expect(todayIso(new Date("2026-09-14T22:30:00Z"))).toBe("2026-09-14");
  });

  it("builds a route only from located days, in day order, with fallback labels", () => {
    const route = buildRoute(
      [
        { day_number: 3, title: "Csúcs", latitude: "28.2724", longitude: "-16.6425" },
        { day_number: 1, title: null, latitude: 28.05, longitude: -16.72 },
        { day_number: 2, title: "Pihenő", latitude: null, longitude: null },
        { day_number: 4, title: " ", latitude: "abc", longitude: 1 },
      ],
      (n) => `${n}. nap`
    );
    expect(route).toEqual([
      ["1. nap", -16.72, 28.05],
      ["Csúcs", -16.6425, 28.2724],
    ]);
  });

  it("returns no route below two located days", () => {
    expect(buildRoute([{ day_number: 1, title: "A", latitude: 47, longitude: 19 }], (n) => String(n))).toBeNull();
    expect(buildRoute([], (n) => String(n))).toBeNull();
    expect(buildRoute(null, (n) => String(n))).toBeNull();
  });
});
