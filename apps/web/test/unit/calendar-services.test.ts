import { describe, expect, it } from "vitest";
import { resolveTripTimezone, resolveViewerCalendar } from "@/lib/calendar/context";
import { computeCoverage, missingYears } from "@/lib/calendar/coverage";
import { longWeekends } from "@/lib/calendar/long-weekend";
import { formatPeriod, isIsoDate, localizedLabel, overlapDays, overlaps, toPeriod } from "@/lib/calendar/period";
import { resolveSeason, seasonFor } from "@/lib/calendar/seasons";
import { endOfLocalDay, formatInstant } from "@/lib/calendar/time";

describe("M23 időszak-szerződés (9. fejezet)", () => {
  it("átfedés legalább minDays nappal (BR-M23-004)", () => {
    const trip = { earliest: "2027-03-24", latest: "2027-03-26" };
    const springBreak = { earliest: "2027-03-25", latest: "2027-04-04" };
    expect(overlapDays(trip, springBreak)).toBe(2);
    expect(overlaps(trip, springBreak)).toBe(true);
    expect(overlaps(trip, springBreak, 3)).toBe(false);
    expect(overlaps(trip, { earliest: "2027-03-27", latest: "2027-03-28" })).toBe(false);
  });

  it("fix dátumú túra → Period, a naptári nap nem vetül zónára", () => {
    expect(toPeriod({ start_date: "2027-06-01", end_date: "2027-06-03" })).toEqual({
      earliest: "2027-06-01",
      latest: "2027-06-03",
      precision: "day",
      durationMinDays: 3,
      durationMaxDays: 3,
    });
    expect(toPeriod({ start_date: "2027-02-30", end_date: null })).toBeNull();
    expect(isIsoDate("2028-02-29")).toBe(true);
  });

  it("formatPeriod HU és EN alakja (16. fejezet 10.)", () => {
    const spring = { earliest: "2027-03-01", latest: "2027-05-31", precision: "season" as const };
    expect(formatPeriod(spring, "hu")).toBe("2027. márc.–máj.");
    expect(formatPeriod(spring, "en")).toBe("Mar–May 2027");
    expect(formatPeriod({ earliest: "2027-03-25", latest: "2027-04-04", precision: "day" }, "hu")).toBe("2027. márc. 25.–ápr. 4.");
    expect(formatPeriod({ earliest: "2026-12-19", latest: "2027-01-03", precision: "day" }, "en")).toBe("19 Dec 2026–3 Jan 2027");
  });

  it("lokalizált név: kért nyelv, különben angol alapnév", () => {
    expect(localizedLabel({ hu: "Húsvéthétfő", en: "Easter Monday" }, "en")).toBe("Easter Monday");
    expect(localizedLabel({ en: "Midsummer Eve", sv: "Midsommarafton" }, "hu")).toBe("Midsummer Eve");
  });
});

describe("M23 évszakok (BR-M23-005)", () => {
  it("déli féltekén a „Nyáron” december–február (16. fejezet 7.)", () => {
    expect(resolveSeason("summer", "south", "2026-09-15")).toEqual({ earliest: "2026-12-01", latest: "2027-02-28", precision: "season" });
  });

  it("a folyamatban lévő évszak a mai napot tartalmazza (EC-12)", () => {
    expect(resolveSeason("winter", "north", "2027-01-01")).toEqual({ earliest: "2026-12-01", latest: "2027-02-28", precision: "season" });
    expect(seasonFor("2027-07-10", "north")).toBe("summer");
    expect(seasonFor("2027-07-10", "south")).toBe("winter");
  });
});

describe("M23 hosszú hétvége (BR-M23-007)", () => {
  it("pénteki munkaszüneti nap + hétvége = háromnapos hosszú hétvége", () => {
    const result = longWeekends({ dayOffDates: ["2026-05-01"], range: { earliest: "2026-04-28", latest: "2026-05-05" } });
    expect(result).toEqual([{ earliest: "2026-05-01", latest: "2026-05-03" }]);
  });

  it("hétvégére eső ünnep nem ad hosszú hétvégét (EC-07), a ledolgozós szombat megszakít", () => {
    expect(longWeekends({ dayOffDates: ["2026-03-15"], range: { earliest: "2026-03-10", latest: "2026-03-20" } })).toEqual([]);
    expect(
      longWeekends({ dayOffDates: ["2026-01-01", "2026-01-02"], workingDates: ["2026-01-03"], range: { earliest: "2026-01-01", latest: "2026-01-04" } }),
    ).toEqual([]);
  });
});

describe("M23 lefedettség (BR-M23-008)", () => {
  const periods = [
    { id: "a", periodType: "public_holiday", ruleKind: "fixed_annual" as const, status: "active" as const },
    { id: "b", periodType: "school_holiday", ruleKind: "explicit" as const, status: "active" as const },
    { id: "c", periodType: "bridge_day", ruleKind: "explicit" as const, oneOff: true, status: "active" as const },
  ];

  it("adat nélküli ország → none (16. fejezet 4.)", () => {
    expect(computeCoverage({ periods: [], occurrences: [], years: [2027] })).toBe("none");
  });

  it("hiányzó év és hiányzó típus → partial; egyszeri definíció nem hiányzik", () => {
    const occurrences = [{ periodId: "b", year: 2026 }, { periodId: "c", year: 2026 }];
    expect(missingYears(periods, occurrences, [2026, 2027])).toEqual(new Map([["b", [2027]]]));
    expect(computeCoverage({ periods, occurrences, years: [2026, 2027] })).toBe("partial");
    expect(computeCoverage({ periods, occurrences, years: [2026] })).toBe("full");
    expect(computeCoverage({ periods: periods.slice(0, 1), occurrences: [], years: [2026], types: ["public_holiday", "school_holiday"] })).toBe("partial");
  });
});

describe("M23 naptár-ország és túra-időzóna", () => {
  const active = ["HU", "AT", "SK", "DE"];

  it("naptár-ország = a profil aktív országa, az országhoz tartozó profilzónával (BR-M23-006)", () => {
    expect(
      resolveViewerCalendar({
        profile: { countryCode: "SK", timezone: "Europe/Bratislava" },
        activeCountryCodes: active,
        countryTimezones: ["Europe/Bratislava"],
        countryPrimaryTimezone: "Europe/Bratislava",
      }),
    ).toEqual({ country: "SK", source: "profile", timezone: "Europe/Bratislava" });
    expect(
      resolveViewerCalendar({
        profile: { countryCode: "US", timezone: "America/Phoenix" },
        activeCountryCodes: ["US"],
        countryTimezones: ["America/New_York", "America/Phoenix"],
        countryPrimaryTimezone: "America/New_York",
      }).timezone,
    ).toBe("America/Phoenix");
  });

  it("hiányzó, érvénytelen vagy nem az országhoz tartozó profilzóna → az ország fő zónája (045)", () => {
    const at = { activeCountryCodes: active, countryTimezones: ["Europe/Vienna"], countryPrimaryTimezone: "Europe/Vienna" };
    expect(resolveViewerCalendar({ profile: { countryCode: "at", timezone: null }, ...at })).toEqual({
      country: "AT",
      source: "profile",
      timezone: "Europe/Vienna",
    });
    expect(resolveViewerCalendar({ profile: { countryCode: "AT", timezone: "America/New_York" }, ...at }).timezone).toBe("Europe/Vienna");
    expect(resolveViewerCalendar({ profile: { countryCode: "AT", timezone: "Mars/Olympus" }, ...at }).timezone).toBe("Europe/Vienna");
  });

  it("fő zóna nélkül (védekező tartalék) UTC", () => {
    expect(resolveViewerCalendar({ profile: { countryCode: "DE", timezone: "Mars/Olympus" }, activeCountryCodes: active }).timezone).toBe("UTC");
    expect(
      resolveViewerCalendar({ profile: { countryCode: "DE", timezone: null }, activeCountryCodes: active, countryPrimaryTimezone: "Mars/Olympus" })
        .timezone,
    ).toBe("UTC");
  });

  it("nincs rögzített alapország: kijelentkezve vagy ország nélkül null + UTC", () => {
    const none = { country: null, source: "none", timezone: "UTC" };
    expect(resolveViewerCalendar({ profile: null, activeCountryCodes: active })).toEqual(none);
    expect(resolveViewerCalendar({ profile: { countryCode: null, timezone: "Europe/Budapest" }, activeCountryCodes: active })).toEqual(none);
    expect(resolveViewerCalendar({ profile: { countryCode: "", timezone: "Europe/Budapest" }, activeCountryCodes: active })).toEqual(none);
  });

  it("érvénytelen vagy inaktív ország → null + UTC", () => {
    const none = { country: null, source: "none", timezone: "UTC" };
    expect(resolveViewerCalendar({ profile: { countryCode: "XX", timezone: "Europe/Budapest" }, activeCountryCodes: active })).toEqual(none);
    expect(resolveViewerCalendar({ profile: { countryCode: "HUN", timezone: "Europe/Budapest" }, activeCountryCodes: active })).toEqual(none);
    expect(resolveViewerCalendar({ profile: { countryCode: "RU", timezone: "Europe/Moscow" }, activeCountryCodes: active })).toEqual(none);
    expect(resolveViewerCalendar({ profile: { countryCode: "HU", timezone: "Europe/Budapest" }, activeCountryCodes: [] })).toEqual(none);
  });

  it("túra-időzóna forrássorrendje, alapértelmezés UTC (FR-M23-011)", () => {
    expect(resolveTripTimezone({ organizerChoice: "Atlantic/Canary", countryPrimaryTimezone: "Europe/Madrid" })).toEqual({ timezone: "Atlantic/Canary", source: "organizer" });
    expect(resolveTripTimezone({ organizerChoice: "Mars/Olympus", countryPrimaryTimezone: "Europe/Madrid" })).toEqual({ timezone: "Europe/Madrid", source: "country" });
    expect(resolveTripTimezone({ organizerTimezone: "Europe/Budapest" })).toEqual({ timezone: "Europe/Budapest", source: "organizer_profile" });
    expect(resolveTripTimezone({})).toEqual({ timezone: "UTC", source: "default" });
  });
});

describe("M23 időpontok (FR-M23-012, FR-M23-013)", () => {
  it("kanári határidő a helyi nap végén zár (16. fejezet 11.)", () => {
    expect(endOfLocalDay("2027-05-10", "Atlantic/Canary").toISOString()).toBe("2027-05-10T23:00:00.000Z");
    expect(endOfLocalDay("2027-03-28", "Europe/Budapest").toISOString()).toBe("2027-03-28T22:00:00.000Z");
  });

  it("kettős megjelenítés: helyi idő és a néző ideje (16. fejezet 12.)", () => {
    const meeting = new Date("2027-05-12T08:00:00Z"); // 09:00 WEST = 10:00 CEST
    const result = formatInstant(meeting, { tripTz: "Atlantic/Canary", viewerTz: "Europe/Budapest", locale: "hu" });
    expect(result.primary).toMatch(/^09:00 /);
    expect(result.secondary).toMatch(/^10:00 /);
    expect(result.dayShift).toBe(0);
    expect(formatInstant(meeting, { tripTz: "Europe/Budapest", viewerTz: "Europe/Budapest", locale: "en" }).secondary).toBeUndefined();
  });

  it("napváltás jelzése", () => {
    const late = new Date("2027-05-12T22:30:00Z"); // 23:30 WEST = másnap 00:30 CEST
    expect(formatInstant(late, { tripTz: "Atlantic/Canary", viewerTz: "Europe/Budapest", locale: "en" }).dayShift).toBe(1);
  });
});
