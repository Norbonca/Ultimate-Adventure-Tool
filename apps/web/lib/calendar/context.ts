/**
 * M23 Calendar — a néző naptár-országa (BR-M23-006) és a túra időzónájának forrássorrendje
 * (FR-M23-011 1.). Tiszta függvények; az adatot a hívó adja.
 */

import { DEFAULT_TRIP_TIMEZONE, isValidTimeZone } from "@/lib/timezone";

export const FALLBACK_CALENDAR_COUNTRY = "HU";

const COUNTRY_RE = /^[A-Z]{2}$/;

export type CalendarCountrySource = "user" | "profile" | "locale" | "fallback";

/** 1. a felhasználó beállítása; 2. a profil országa; 3. a nyelvhez rendelt alapország; 4. HU. */
export function resolveCalendarCountry(input: {
  userCountry?: string | null;
  profileCountry?: string | null;
  locale: string;
  defaultsByLocale?: Record<string, string> | null;
}): { country: string; source: CalendarCountrySource } {
  if (input.userCountry && COUNTRY_RE.test(input.userCountry)) return { country: input.userCountry, source: "user" };
  if (input.profileCountry && COUNTRY_RE.test(input.profileCountry)) return { country: input.profileCountry, source: "profile" };
  const byLocale = input.defaultsByLocale?.[input.locale];
  if (byLocale && COUNTRY_RE.test(byLocale)) return { country: byLocale, source: "locale" };
  return { country: FALLBACK_CALENDAR_COUNTRY, source: "fallback" };
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
