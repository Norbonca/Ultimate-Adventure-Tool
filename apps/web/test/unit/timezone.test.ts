import { describe, it, expect } from "vitest";
import {
  DEFAULT_TRIP_TIMEZONE,
  formatLocalDate,
  formatUtcOffset,
  isRegistrationOpenAt,
  isValidTimeZone,
  listTimeZones,
  registrationClosesAt,
} from "@/lib/timezone";

describe("trip time zone helpers (M23 FR-M23-011…013)", () => {
  it("validates IANA identifiers and defaults to UTC first", () => {
    expect(isValidTimeZone("Europe/Budapest")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(listTimeZones()[0]).toBe(DEFAULT_TRIP_TIMEZONE);
    expect(listTimeZones()).toContain("Europe/Budapest");
  });

  it("formats UTC offsets with daylight saving time", () => {
    expect(formatUtcOffset("Europe/Budapest", new Date("2027-01-15T12:00:00Z"))).toBe("UTC+01:00");
    expect(formatUtcOffset("Europe/Budapest", new Date("2027-07-15T12:00:00Z"))).toBe("UTC+02:00");
    expect(formatUtcOffset("UTC", new Date("2027-07-15T12:00:00Z"))).toBe("UTC+00:00");
    expect(formatUtcOffset("America/New_York", new Date("2027-01-15T12:00:00Z"))).toBe("UTC-05:00");
  });

  it("closes registration at the start of the next local day (exclusive bound)", () => {
    // UTC: 2027-05-10 → 2027-05-11T00:00:00Z
    expect(registrationClosesAt("2027-05-10", "UTC").toISOString()).toBe("2027-05-11T00:00:00.000Z");
    // Kanári-szigetek nyáron UTC+1 → 2027-05-10T23:00:00Z
    expect(registrationClosesAt("2027-05-10", "Atlantic/Canary").toISOString()).toBe("2027-05-10T23:00:00.000Z");
    // Budapest télen UTC+1
    expect(registrationClosesAt("2027-01-10", "Europe/Budapest").toISOString()).toBe("2027-01-10T23:00:00.000Z");
    // Óraátállítás napja (2027-03-28): a következő nap 00:00 már CEST (UTC+2)
    expect(registrationClosesAt("2027-03-28", "Europe/Budapest").toISOString()).toBe("2027-03-28T22:00:00.000Z");
    // Negatív eltolás
    expect(registrationClosesAt("2027-01-10", "America/New_York").toISOString()).toBe("2027-01-11T05:00:00.000Z");
  });

  it("keeps registration open during the whole deadline day", () => {
    const tz = "Europe/Budapest";
    expect(isRegistrationOpenAt("2027-05-10", tz, new Date("2027-05-10T21:59:59Z"))).toBe(true); // 23:59:59 CEST
    expect(isRegistrationOpenAt("2027-05-10", tz, new Date("2027-05-10T22:00:00Z"))).toBe(false); // 00:00 CEST
    expect(isRegistrationOpenAt(null, tz, new Date())).toBe(true);
  });

  it("formats a calendar date without shifting it to another day", () => {
    expect(formatLocalDate("2027-06-01", "hu-HU")).toContain("június 1");
    expect(formatLocalDate("2027-06-01", "en-US")).toContain("June 1");
  });
});
