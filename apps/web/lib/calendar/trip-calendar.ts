/**
 * M23 Calendar V1.1 — a túraoldal és a varázsló naptári adatai egy helyen (jelvények, figyelmeztetések,
 * kettős időpont). Szerver oldali; a lekérdezés a hívó RLS-es kliensén megy át (`getCalendarPeriods`).
 */

import { alertsFor, badgesFor, type CalendarAlert, type CalendarBadge } from "./alerts";
import { getCalendarPeriods, getViewerCalendar, type CalendarPeriodItem } from "./service";
import type { Coverage } from "./coverage";
import type { ViewerCalendar } from "./context";
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
  badges: CalendarBadge[];
  alerts: CalendarAlert[];
  destinationCoverage: Coverage | null;
}

const EMPTY: { coverage: Coverage; items: CalendarPeriodItem[] } = { coverage: "none", items: [] };
const COUNTRY_RE = /^[A-Z]{2}$/;

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
  if (!isIsoDate(trip.start_date)) return { viewer, badges: [], alerts: [], destinationCoverage: null };
  const earliest = trip.start_date;
  const latest = isIsoDate(trip.end_date) ? trip.end_date : earliest;
  const deadline = isIsoDate(trip.registration_deadline_date) ? trip.registration_deadline_date : null;
  const from = addDays(deadline && deadline < earliest ? deadline : earliest, -7);
  const to = addDays(latest, 7);
  const destinationCountry = trip.location_country?.toUpperCase() ?? null;

  const destination = await periodsFor(destinationCountry, from, to, locale);
  const viewerData =
    viewer.country && viewer.country === destinationCountry
      ? destination
      : await periodsFor(viewer.country, from, to, locale);

  const range = { earliest, latest };
  const badges = viewer.country ? badgesFor({ trip: range, viewerItems: viewerData?.items ?? [] }) : [];
  const alerts = alertsFor({
    trip: { ...range, timezone: trip.timezone || "UTC", destinationCountry, registrationDeadlineDate: deadline },
    destination,
    viewer: { country: viewer.country, timezone: viewer.timezone, items: viewerData?.items ?? [] },
  });
  return { viewer, badges, alerts, destinationCoverage: destination?.coverage ?? null };
}
