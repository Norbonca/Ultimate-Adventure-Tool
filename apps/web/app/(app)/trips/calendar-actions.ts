"use server";

/**
 * M23 Calendar V1.1 — a varázsló naptári előnézete (S9 helyi idő, S11 figyelmeztetések a 2. és 4. lépésben).
 * Csak olvas; a figyelmeztetés nem blokkol mentést (BR-M23-015). Az eredményt a kliens `CalendarHints` rajzolja.
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getTripCalendar } from "@/lib/calendar/trip-calendar";
import type { CalendarAlert, CalendarBadge } from "@/lib/calendar/alerts";
import { resolveTripTimezone } from "@/lib/calendar/context";
import { formatUtcOffset, isValidTimeZone } from "@/lib/timezone";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const inputSchema = z.object({
  location_country: z.string().regex(/^[A-Za-z]{2}$/).optional().nullable(),
  start_date: isoDate.optional().nullable().or(z.literal("")),
  end_date: isoDate.optional().nullable().or(z.literal("")),
  registration_deadline: isoDate.optional().nullable().or(z.literal("")),
  timezone: z.string().max(64).optional().nullable(),
  locale: z.enum(["hu", "en"]).default("hu"),
});

export interface TripCalendarPreview {
  ok: true;
  alerts: CalendarAlert[];
  badges: CalendarBadge[];
  viewerTimezone: string;
  /** S9: a helyszín helyi ideje — a túra zónája a forrássorrend szerint (FR-M23-011 1.) */
  localTime: { timezone: string; source: "organizer" | "coordinates" | "country" | "organizer_profile" | "default"; offset: string; multiZone: boolean } | null;
}

export async function previewTripCalendar(raw: unknown): Promise<TripCalendarPreview | { ok: false; error: "invalid" }> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const input = parsed.data;
  const country = input.location_country ? input.location_country.toUpperCase() : null;

  const supabase = await createClient();
  let countryPrimary: string | null = null;
  let zoneCount = 0;
  if (country) {
    const [{ data: c }, { count }] = await Promise.all([
      supabase.from("ref_countries").select("primary_timezone").eq("code", country).eq("is_active", true).maybeSingle(),
      supabase.from("ref_timezones").select("tz_id", { count: "exact", head: true }).eq("country_code", country).eq("is_active", true),
    ]);
    countryPrimary = ((c ?? null) as { primary_timezone?: string | null } | null)?.primary_timezone ?? null;
    zoneCount = count ?? 0;
  }

  const organizerChoice = input.timezone && input.timezone !== "UTC" && isValidTimeZone(input.timezone) ? input.timezone : null;
  const resolved = resolveTripTimezone({ organizerChoice, countryPrimaryTimezone: countryPrimary });
  const localTime = country
    ? { timezone: resolved.timezone, source: resolved.source, offset: formatUtcOffset(resolved.timezone), multiZone: zoneCount > 1 }
    : null;

  const calendar = await getTripCalendar(
    {
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      timezone: resolved.timezone,
      location_country: country,
      registration_deadline_date: input.registration_deadline || null,
    },
    input.locale,
  );
  return { ok: true, alerts: calendar.alerts, badges: calendar.badges, viewerTimezone: calendar.viewer.timezone, localTime };
}
