/**
 * M23 Calendar V1.1 — a túraoldal és a varázsló naptári adatai egy helyen (jelvények, figyelmeztetések,
 * kettős időpont). Szerver oldali; a lekérdezés a hívó RLS-es kliensén megy át (`getCalendarPeriods`).
 */

import { alertsFor, badgesFor, type CalendarAlert, type CalendarBadge } from "./alerts";
import { getCalendarPeriods, getViewerCalendar, type CalendarPeriodItem } from "./service";
import type { Coverage } from "./coverage";
import { resolveTripTimezone, type ViewerCalendar } from "./context";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "./rules";
import { isIsoDate } from "./period";

export interface TripCalendarInput {
  start_date: string | null;
  end_date: string | null;
  timezone?: string | null;
  location_country?: string | null;
  registration_deadline_date?: string | null;
}

export interface TripCalendar {
  viewer: ViewerCalendar;
  /** A figyelmeztetésekhez használt túra-zóna: a szervező választása, különben az ország fő zónája (FR-M23-011). */
  tripTimezone: string;
  badges: CalendarBadge[];
  alerts: CalendarAlert[];
  destinationCoverage: Coverage | null;
}

const EMPTY: { coverage: Coverage; items: CalendarPeriodItem[] } = { coverage: "none", items: [] };
const COUNTRY_RE = /^[A-Z]{2}$/;

/**
 * A `trips.timezone` oszlop alapértéke 'UTC' (036) — az nem szervezői választás. Ilyenkor az ország fő zónája
 * adja a figyelmeztetések (zónaeltérés, óraátállítás) alapját, hogy egy magyar túra magyar nézőnek ne kapjon
 * hamis „1 óra eltérés” jelzést. A határidő záró pillanata továbbra is a `trips.timezone` szerint számolódik (DB-trigger).
 */
export function effectiveTripTimezone(tripTimezone: string | null | undefined, countryPrimaryTimezone: string | null | undefined): string {
  const organizerChoice = tripTimezone && tripTimezone !== "UTC" ? tripTimezone : null;
  return resolveTripTimezone({ organizerChoice, countryPrimaryTimezone }).timezone;
}

/** Ismert-e a túra zónája (nem az UTC tartalék)? Ismeretlen zónára nem adunk zónaeltérés/óraátállítás figyelmeztetést. */
export function isTripTimezoneKnown(tripTimezone: string | null | undefined, countryPrimaryTimezone: string | null | undefined): boolean {
  const organizerChoice = tripTimezone && tripTimezone !== "UTC" ? tripTimezone : null;
  return resolveTripTimezone({ organizerChoice, countryPrimaryTimezone }).source !== "default";
}

async function countryPrimaryTimezone(country: string | null): Promise<string | null> {
  if (!country || !COUNTRY_RE.test(country)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("ref_countries").select("primary_timezone").eq("code", country).eq("is_active", true).maybeSingle();
  return ((data ?? null) as { primary_timezone?: string | null } | null)?.primary_timezone ?? null;
}

async function periodsFor(country: string | null, from: string, to: string, locale: "hu" | "en") {
  if (!country || !COUNTRY_RE.test(country)) return null;
  const res = await getCalendarPeriods({ country, from, to, locale });
  return res.ok ? res.data : EMPTY;
}

/**
 * Jelvények és figyelmeztetések egy túrára. Dátum nélküli (piszkozat) túrára üres eredmény.
 * A lekérdezett tartomány a túra ±7 nap, hogy a hosszú hétvége és a határidő is beleessen.
 */
export async function getTripCalendar(trip: TripCalendarInput, locale: "hu" | "en"): Promise<TripCalendar> {
  const viewer = await getViewerCalendar();
  if (!isIsoDate(trip.start_date)) return { viewer, tripTimezone: trip.timezone || "UTC", badges: [], alerts: [], destinationCoverage: null };
  const earliest = trip.start_date;
  const latest = isIsoDate(trip.end_date) ? trip.end_date : earliest;
  const deadline = isIsoDate(trip.registration_deadline_date) ? trip.registration_deadline_date : null;
  const from = addDays(deadline && deadline < earliest ? deadline : earliest, -7);
  const to = addDays(latest, 7);
  const destinationCountry = trip.location_country?.toUpperCase() ?? null;

  const [destination, primaryTz] = await Promise.all([periodsFor(destinationCountry, from, to, locale), countryPrimaryTimezone(destinationCountry)]);
  const tripTimezone = effectiveTripTimezone(trip.timezone, primaryTz);
  const viewerData =
    viewer.country && viewer.country === destinationCountry
      ? destination
      : await periodsFor(viewer.country, from, to, locale);

  const range = { earliest, latest };
  const badges = viewer.country ? badgesFor({ trip: range, viewerItems: viewerData?.items ?? [] }) : [];
  const alerts = alertsFor({
    // ismeretlen zónánál üres string → alertsFor kihagyja a timezone_difference/dst_change kulcsokat
    trip: { ...range, timezone: isTripTimezoneKnown(trip.timezone, primaryTz) ? tripTimezone : "", destinationCountry, registrationDeadlineDate: deadline },
    destination,
    viewer: { country: viewer.country, timezone: viewer.timezone, items: viewerData?.items ?? [] },
  });
  return { viewer, tripTimezone, badges, alerts, destinationCoverage: destination?.coverage ?? null };
}
