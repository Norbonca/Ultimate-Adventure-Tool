/**
 * M23 Calendar — időpontok megjelenítése explicit időzónával (FR-M23-012) és a helyi nap vége
 * (FR-M23-013). A futtatókörnyezet zónájára nem támaszkodik.
 */

import { isValidTimeZone, registrationClosesAt } from "@/lib/timezone";

/** A napra megadott határidő zárópillanata: a megadott napot követő nap 00:00 a zónában (kizárólagos). */
export function endOfLocalDay(date: string, timeZone: string): Date {
  return registrationClosesAt(date, timeZone);
}

/** Naptári nap ('YYYY-MM-DD') egy pillanatban, a megadott zónában. */
export function localDateAt(instant: Date, timeZone: string): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const get = (type: string) => p.find((x) => x.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function zoneLabel(instant: Date, timeZone: string): string {
  const name = new Intl.DateTimeFormat("en-GB", { timeZone, timeZoneName: "short" })
    .formatToParts(instant)
    .find((x) => x.type === "timeZoneName")?.value ?? "UTC";
  return name.replace(/^GMT(?=[+-]|$)/, "UTC");
}

function timeText(instant: Date, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "hu-HU", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(instant);
}

export interface FormattedInstant {
  /** a túra helyi ideje zónajelöléssel, pl. „09:00 WEST” */
  primary: string;
  /** a néző ideje, ha a zóna eltolása eltér, pl. „10:00 CEST” */
  secondary?: string;
  /** a néző naptári napja mínusz a túra naptári napja (−1, 0, +1) */
  dayShift?: number;
}

export function formatInstant(
  instant: Date | string,
  options: { tripTz: string; viewerTz?: string | null; locale: string },
): FormattedInstant {
  const at = typeof instant === "string" ? new Date(instant) : instant;
  const tripTz = isValidTimeZone(options.tripTz) ? options.tripTz : "UTC";
  const primary = `${timeText(at, tripTz, options.locale)} ${zoneLabel(at, tripTz)}`;
  const viewerTz = options.viewerTz && isValidTimeZone(options.viewerTz) ? options.viewerTz : null;
  if (!viewerTz) return { primary };
  const tripLocal = `${localDateAt(at, tripTz)} ${timeText(at, tripTz, "en")}`;
  const viewerLocal = `${localDateAt(at, viewerTz)} ${timeText(at, viewerTz, "en")}`;
  if (tripLocal === viewerLocal) return { primary };
  const dayShift = Math.round(
    (Date.parse(`${localDateAt(at, viewerTz)}T00:00:00Z`) - Date.parse(`${localDateAt(at, tripTz)}T00:00:00Z`)) / 86_400_000,
  );
  return { primary, secondary: `${timeText(at, viewerTz, options.locale)} ${zoneLabel(at, viewerTz)}`, dayShift };
}
