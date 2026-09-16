import { describe, expect, it } from "vitest";
import {
  autoTimezoneForCountry,
  isTimezoneOfCountry,
  suggestCountryAndTimezone,
  timezonesForCountry,
} from "@/lib/profile/country-timezone";

const timezones = [
  { tz_id: "Europe/Budapest", country_code: "HU", display_name: "Budapest (CET/CEST)", sort_order: 1, is_active: true },
  { tz_id: "Europe/Vienna", country_code: "AT", display_name: "Vienna (CET/CEST)", sort_order: 2, is_active: true },
  { tz_id: "America/Chicago", country_code: "US", display_name: "Chicago (CST/CDT)", sort_order: 51, is_active: true },
  { tz_id: "America/New_York", country_code: "US", display_name: "New York (EST/EDT)", sort_order: 50, is_active: true },
  { tz_id: "America/Phoenix", country_code: "US", display_name: "Phoenix (MST)", sort_order: 52, is_active: true },
  { tz_id: "America/Old_Zone", country_code: "US", display_name: "Old", sort_order: 1, is_active: false },
  { tz_id: "Europe/Minsk", country_code: "BY", display_name: "Minsk (MSK)", sort_order: 52, is_active: true },
];

const countries = [
  { code: "HU", is_active: true },
  { code: "AT", is_active: true },
  { code: "US", is_active: true },
  { code: "BY", is_active: false },
];

describe("profil ország ↔ időzóna", () => {
  it("az ország aktív zónái sorrendben", () => {
    expect(timezonesForCountry("US", timezones).map((tz) => tz.tz_id)).toEqual([
      "America/New_York",
      "America/Chicago",
      "America/Phoenix",
    ]);
    expect(timezonesForCountry("hu", timezones).map((tz) => tz.tz_id)).toEqual(["Europe/Budapest"]);
    expect(timezonesForCountry("", timezones)).toEqual([]);
    expect(timezonesForCountry(null, timezones)).toEqual([]);
  });

  it("egyzónás ország: automatikus zóna", () => {
    expect(autoTimezoneForCountry("HU", timezones)).toBe("Europe/Budapest");
    expect(autoTimezoneForCountry("AT", timezones)).toBe("Europe/Vienna");
  });

  it("többzónás vagy ismeretlen ország: nincs automatikus zóna", () => {
    expect(autoTimezoneForCountry("US", timezones)).toBeNull();
    expect(autoTimezoneForCountry("XX", timezones)).toBeNull();
  });

  it("a zóna az országé-e", () => {
    expect(isTimezoneOfCountry("US", "America/Phoenix", timezones)).toBe(true);
    expect(isTimezoneOfCountry("HU", "America/New_York", timezones)).toBe(false);
    expect(isTimezoneOfCountry("US", "America/Old_Zone", timezones)).toBe(false);
    expect(isTimezoneOfCountry("HU", null, timezones)).toBe(false);
  });
});

describe("böngésző alapú javaslat", () => {
  it("a böngésző időzónája nyer a nyelvi régió előtt", () => {
    expect(
      suggestCountryAndTimezone({ browserTimeZone: "Europe/Vienna", browserLanguages: ["en-US"], countries, timezones }),
    ).toEqual({ countryCode: "AT", timezone: "Europe/Vienna" });
    expect(
      suggestCountryAndTimezone({ browserTimeZone: "America/Phoenix", browserLanguages: ["hu-HU"], countries, timezones }),
    ).toEqual({ countryCode: "US", timezone: "America/Phoenix" });
  });

  it("nyelvi régió: egyzónásnál zónával, többzónásnál zóna nélkül", () => {
    expect(suggestCountryAndTimezone({ browserTimeZone: null, browserLanguages: ["de-AT"], countries, timezones })).toEqual({
      countryCode: "AT",
      timezone: "Europe/Vienna",
    });
    expect(suggestCountryAndTimezone({ browserTimeZone: "UTC", browserLanguages: ["en-US"], countries, timezones })).toEqual({
      countryCode: "US",
      timezone: null,
    });
  });

  it("inaktív ország nem javasolható (zónából sem, régióból sem)", () => {
    expect(suggestCountryAndTimezone({ browserTimeZone: "Europe/Minsk", browserLanguages: ["be-BY"], countries, timezones })).toBeNull();
    expect(
      suggestCountryAndTimezone({ browserTimeZone: "Europe/Minsk", browserLanguages: ["be-BY", "hu-HU"], countries, timezones }),
    ).toEqual({ countryCode: "HU", timezone: "Europe/Budapest" });
  });

  it("ismeretlen böngészőzóna → a nyelvi régióra esik vissza, ennek hiányában nincs javaslat", () => {
    expect(suggestCountryAndTimezone({ browserTimeZone: "Asia/Tokyo", browserLanguages: ["de-AT"], countries, timezones })).toEqual({
      countryCode: "AT",
      timezone: "Europe/Vienna",
    });
    expect(suggestCountryAndTimezone({ browserTimeZone: "Mars/Olympus", browserLanguages: [], countries, timezones })).toBeNull();
  });

  it("régió nélküli nyelvből nem találgatunk országot", () => {
    expect(suggestCountryAndTimezone({ browserTimeZone: null, browserLanguages: ["hu", "en"], countries, timezones })).toBeNull();
    expect(suggestCountryAndTimezone({ browserTimeZone: undefined, browserLanguages: undefined, countries, timezones })).toBeNull();
  });
});
