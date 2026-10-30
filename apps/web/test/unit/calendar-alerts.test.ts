import { describe, expect, it } from "vitest";
import { alertsFor, badgesFor, dstTransitions, utcOffsetMinutes } from "@/lib/calendar/alerts";
import type { CalendarPeriodItem } from "@/lib/calendar/service";

const item = (over: Partial<CalendarPeriodItem>): CalendarPeriodItem => ({
  periodKey: "x",
  type: "public_holiday",
  label: "X",
  tags: [],
  earliest: "2027-05-01",
  latest: "2027-05-01",
  isDayOff: true,
  status: "verified",
  ...over,
});

describe("M23 V1.1 — badgesFor (FR-M23-006)", () => {
  const trip = { earliest: "2027-04-02", latest: "2027-04-08" };
  it("szünet/ünnepi időszak átfedésénél szünet-jelvény, ablakos túránál „eshet”", () => {
    const items = [item({ periodKey: "hu_spring_break", type: "school_holiday", label: "Tavaszi szünet", earliest: "2027-04-01", latest: "2027-04-06", isDayOff: false })];
    expect(badgesFor({ trip, viewerItems: items })[0]).toMatchObject({ kind: "season", labelKey: "falls", params: { period: "Tavaszi szünet" } });
    expect(badgesFor({ trip, viewerItems: items, uncertain: true })[0]).toMatchObject({ kind: "possible", labelKey: "mayFall" });
  });
  it("munkaszüneti nap a túra napjain → holiday-jelvény; a túrán kívüli nem", () => {
    const items = [item({ periodKey: "easter_monday", label: "Húsvéthétfő", earliest: "2027-04-05", latest: "2027-04-05" }), item({ periodKey: "may1", earliest: "2027-05-01", latest: "2027-05-01" })];
    const badges = badgesFor({ trip, viewerItems: items });
    expect(badges.filter((b) => b.kind === "holiday")).toHaveLength(1);
    expect(badges.find((b) => b.kind === "holiday")?.params.period).toBe("Húsvéthétfő");
  });
  it("hétköznapi ünnep + hétvége → hosszú hétvége jelvény", () => {
    const items = [item({ periodKey: "fri", earliest: "2027-04-02", latest: "2027-04-02" })];
    expect(badgesFor({ trip, viewerItems: items }).some((b) => b.kind === "long_weekend")).toBe(true);
  });
  it("üres naptárnál nincs jelvény", () => {
    expect(badgesFor({ trip, viewerItems: [] })).toEqual([]);
  });
});

describe("M23 V1.1 — időzóna segédek", () => {
  it("utcOffsetMinutes: CEST +120, UTC 0", () => {
    const at = new Date("2027-06-05T12:00:00Z");
    expect(utcOffsetMinutes(at, "Europe/Budapest")).toBe(120);
    expect(utcOffsetMinutes(at, "UTC")).toBe(0);
    expect(utcOffsetMinutes(at, "America/New_York")).toBe(-240);
  });
  it("dstTransitions: 2027 tavaszi átállás Európában március 28-án", () => {
    const t = dstTransitions("Europe/Zagreb", { earliest: "2027-03-25", latest: "2027-03-31" });
    expect(t).toEqual([{ date: "2027-03-28", from: 60, to: 120 }]);
    expect(dstTransitions("Europe/Zagreb", { earliest: "2027-06-01", latest: "2027-06-10" })).toEqual([]);
    expect(dstTransitions("not/a-zone", { earliest: "2027-03-25", latest: "2027-03-31" })).toEqual([]);
  });
});

describe("M23 V1.1 — alertsFor (FR-M23-014)", () => {
  const base = { earliest: "2027-06-05", latest: "2027-06-24", timezone: "Europe/Zagreb", destinationCountry: "HR", registrationDeadlineDate: "2027-05-31" };
  const hrItems = [item({ periodKey: "hr_antifascist", label: "Antifasiszta harc napja", earliest: "2027-06-22", latest: "2027-06-22" })];

  it("local_holiday a célország ünnepére a túra napján, a nap sorszámával", () => {
    const alerts = alertsFor({ trip: base, destination: { coverage: "full", items: hrItems }, viewer: { country: "HU", timezone: "Europe/Budapest", items: [] } });
    const a = alerts.find((x) => x.key === "local_holiday");
    expect(a).toMatchObject({ severity: "warning", params: { period: "Antifasiszta harc napja", date: "2027-06-22", dayIndex: "18", country: "HR" } });
    expect(alerts.some((x) => x.key === "timezone_difference")).toBe(false);
  });
  it("no_calendar_data, ha a célországra nincs lefedettség", () => {
    const alerts = alertsFor({ trip: base, destination: { coverage: "none", items: [] }, viewer: { country: null, timezone: "UTC", items: [] } });
    expect(alerts.map((a) => a.key)).toContain("no_calendar_data");
  });
  it("timezone_difference iránnyal és órával (Kanári-szigetek vs Budapest = 1 óra behind)", () => {
    const alerts = alertsFor({ trip: { ...base, timezone: "Atlantic/Canary", destinationCountry: "ES" }, destination: null, viewer: { country: "HU", timezone: "Europe/Budapest", items: [] } });
    expect(alerts.find((a) => a.key === "timezone_difference")?.params).toMatchObject({ hours: "1", direction: "behind" });
  });
  it("timezone_difference kijelentkezve (UTC tartalék) nem jelenik meg", () => {
    const alerts = alertsFor({ trip: { ...base, timezone: "Atlantic/Canary", destinationCountry: "ES" }, destination: null, viewer: { country: null, timezone: "UTC", items: [] } });
    expect(alerts.some((a) => a.key === "timezone_difference")).toBe(false);
  });
  it("dst_change a túra ideje alatt", () => {
    const alerts = alertsFor({ trip: { ...base, earliest: "2027-03-25", latest: "2027-03-31", registrationDeadlineDate: null }, destination: null, viewer: { country: null, timezone: "UTC", items: [] } });
    expect(alerts.find((a) => a.key === "dst_change")?.params).toMatchObject({ date: "2027-03-28", direction: "forward", dayIndex: "4" });
  });
  it("deadline_on_holiday a néző naptára szerint, javasolt előző nappal", () => {
    const huItems = [item({ periodKey: "hu_whit_monday", label: "Pünkösdhétfő", earliest: "2027-05-31", latest: "2027-05-31" })];
    const alerts = alertsFor({ trip: base, destination: { coverage: "full", items: [] }, viewer: { country: "HU", timezone: "Europe/Budapest", items: huItems } });
    expect(alerts.find((a) => a.key === "deadline_on_holiday")?.params).toMatchObject({ period: "Pünkösdhétfő", country: "HU", suggested: "2027-05-30" });
  });
  it("viewer_holiday csak akkor, ha a néző országa eltér a célországtól", () => {
    const huItems = [item({ periodKey: "hu_summer", type: "school_holiday", label: "Nyári szünet", earliest: "2027-06-19", latest: "2027-08-31", isDayOff: false })];
    const viewer = { country: "HU", timezone: "Europe/Budapest", items: huItems };
    expect(alertsFor({ trip: base, destination: null, viewer }).some((a) => a.key === "viewer_holiday")).toBe(true);
    expect(alertsFor({ trip: { ...base, destinationCountry: "HU" }, destination: null, viewer }).some((a) => a.key === "viewer_holiday")).toBe(false);
  });
  it("sorrend: local_holiday → deadline → viewer → timezone → dst → no_data", () => {
    const alerts = alertsFor({
      trip: { ...base, timezone: "Atlantic/Canary", destinationCountry: "ES" },
      destination: { coverage: "none", items: [] },
      viewer: { country: "HU", timezone: "Europe/Budapest", items: [item({ periodKey: "hu_summer", type: "school_holiday", label: "Nyári szünet", earliest: "2027-06-19", latest: "2027-08-31", isDayOff: false })] },
    });
    expect(alerts.map((a) => a.key)).toEqual(["viewer_holiday", "timezone_difference", "no_calendar_data"]);
  });
});
