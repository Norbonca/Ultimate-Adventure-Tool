/**
 * Pure helpers behind `/api/v1/trips/globe` — kept out of the route so they
 * can be unit-tested without Supabase.
 */

export interface ItineraryDayRow {
  day_number: number;
  title: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
}

/** [station name, lon, lat] — the renderer's route point. */
export type RoutePoint = [string, number, number];

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

/** Today's date as 'YYYY-MM-DD' in UTC — week 0 of the globe timeline. */
export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Weeks (fractional) from `week0` to `date`; both 'YYYY-MM-DD'. */
export function weeksFrom(week0: string, date: string | null): number {
  if (!date) return 0;
  const a = Date.parse(`${week0}T00:00:00Z`);
  const b = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return (b - a) / WEEK_MS;
}

/** Inclusive length of a trip in days, at least 1. */
export function tripDays(start: string | null, end: string | null): number {
  if (!start || !end) return 1;
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 1;
  return Math.max(1, Math.round((b - a) / DAY_MS) + 1);
}

/**
 * Builds the globe route of one trip from its itinerary days: only days with
 * both coordinates, in day order. Fewer than two such days → no route (the
 * trip still shows as a marker). The station name falls back to the day
 * number label the caller supplies.
 */
export function buildRoute(
  days: ItineraryDayRow[] | null | undefined,
  dayLabel: (dayNumber: number) => string
): RoutePoint[] | null {
  const points = (days ?? [])
    .filter((d) => d.latitude !== null && d.longitude !== null)
    .map((d) => ({ ...d, lat: Number(d.latitude), lng: Number(d.longitude) }))
    .filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng))
    .sort((a, b) => a.day_number - b.day_number)
    .map((d): RoutePoint => [d.title?.trim() || dayLabel(d.day_number), d.lng, d.lat]);
  return points.length >= 2 ? points : null;
}
