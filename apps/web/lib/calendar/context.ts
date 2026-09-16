/**
 * M23 Calendar — a néző naptár-országa (BR-M23-006) és a túra időzónájának forrássorrendje
 * (FR-M23-011 1.). Tiszta függvények; az adatot a hívó adja.
 */

import { DEFAULT_TRIP_TIMEZONE, isValidTimeZone } from "@/lib/timezone";

const COUNTRY_RE = /^[A-Z]{2}$/;

/** Időzóna, ha a néző naptára nem határozható meg (nincs ország, nincs bejelentkezve). */
export const VIEWER_FALLBACK_TIMEZONE = DEFAULT_TRIP_TIMEZONE;

export type CalendarCountrySource = "profile" | "none";

export interface ViewerCalendar {
  /** ISO 3166-1 alpha-2; `null` = nincs országspecifikus naptár (időszakok, jelvények nem jelennek meg). */
  country: string | null;
  source: CalendarCountrySource;
  timezone: string;
}

/**
 * A néző naptár-országa (BR-M23-006; Norbert döntése, 2026-09-15): a felhasználó profiljában megadott
 * saját ország (`profiles.country_code`), ha az aktív, választható ország (`ref_countries.is_active`).
 * Nincs rögzített alapország és nyelv szerinti alapország sem. Ország nélkül (vagy kijelentkezve)
 * `country: null`, időzóna UTC.
 *
 * Aktív országnál az időzóna (045; Norbert döntése, 2026-09-15): a profil érvényes zónája, ha az az
 * ország aktív zónái (`countryTimezones`) között van; különben az ország fő zónája
 * (`ref_countries.primary_timezone`); végső, csak védekező tartalék az UTC.
 */
export function resolveViewerCalendar(input: {
  profile: { countryCode?: string | null; timezone?: string | null } | null;
  activeCountryCodes: Iterable<string>;
  /** Az ország aktív `ref_timezones` azonosítói. */
  countryTimezones?: Iterable<string>;
  /** `ref_countries.primary_timezone`. */
  countryPrimaryTimezone?: string | null;
}): ViewerCalendar {
  const code = input.profile?.countryCode?.trim().toUpperCase() ?? "";
  const active = new Set(input.activeCountryCodes);
  if (!COUNTRY_RE.test(code) || !active.has(code)) {
    return { country: null, source: "none", timezone: VIEWER_FALLBACK_TIMEZONE };
  }
  const zones = new Set(input.countryTimezones ?? []);
  const tz = input.profile?.timezone;
  if (tz && zones.has(tz) && isValidTimeZone(tz)) return { country: code, source: "profile", timezone: tz };
  const primary = input.countryPrimaryTimezone;
  if (primary && isValidTimeZone(primary)) return { country: code, source: "profile", timezone: primary };
  return { country: code, source: "profile", timezone: VIEWER_FALLBACK_TIMEZONE };
}

export type TripTimezoneSource = "organizer" | "coordinates" | "country" | "organizer_profile" | "default";

/**
 * A túra időzónája: (a) a szervező választása; (b) koordinátából (M121, V1.1); (c) az ország fő zónája
 * (`ref_countries.primary_timezone`); (d) a szervező zónája; ha egyik sem érvényes, UTC (Norbert, 2026-09-15).
 */
export function resolveTripTimezone(input: {
  organizerChoice?: string | null;
  coordinatesTimezone?: string | null;
  countryPrimaryTimezone?: string | null;
  organizerTimezone?: string | null;
}): { timezone: string; source: TripTimezoneSource } {
  const candidates: Array<[string | null | undefined, TripTimezoneSource]> = [
    [input.organizerChoice, "organizer"],
    [input.coordinatesTimezone, "coordinates"],
    [input.countryPrimaryTimezone, "country"],
    [input.organizerTimezone, "organizer_profile"],
  ];
  for (const [timezone, source] of candidates) {
    if (timezone && isValidTimeZone(timezone)) return { timezone, source };
  }
  return { timezone: DEFAULT_TRIP_TIMEZONE, source: "default" };
}
