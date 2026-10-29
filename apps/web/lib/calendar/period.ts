/**
 * M23 Calendar — az időszak-szerződés (funkcionális spec 9. fejezet, BR-M23-004, BR-M23-010).
 *
 * A `Period` zárt naptári dátumintervallum időzóna nélkül. Minden fogyasztó (M22, M023, M091,
 * Terepgömb, M09, M21) ezt az érték-objektumot használja; a relatív választás mentéskor abszolút
 * dátumokra oldódik fel (BR-M23-003).
 */

import { addDays, diffDays, type DateRange } from "./rules";

export type PeriodPrecision = "day" | "week" | "month" | "season";
export type CalendarLocale = "hu" | "en";

export interface Period extends DateRange {
  precision: PeriodPrecision;
  durationMinDays?: number;
  durationMaxDays?: number;
  /** ref_calendar_periods.key — címke, nem igazságforrás */
  periodKey?: string;
  /** az ország, amelynek naptárából feloldottuk */
  calendarCountry?: string;
}

export type LocalizedLabel = Partial<Record<string, string>> & { hu?: string; en?: string };

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Valós naptári nap-e a 'YYYY-MM-DD' érték. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ISO_DATE_RE.exec(value);
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Fix dátumú túra → Period (9. fejezet: `precision = day`). */
export function toPeriod(trip: { start_date: string | null; end_date: string | null }): Period | null {
  if (!isIsoDate(trip.start_date)) return null;
  const latest = isIsoDate(trip.end_date) && trip.end_date >= trip.start_date ? trip.end_date : trip.start_date;
  const days = diffDays(trip.start_date, latest) + 1;
  return { earliest: trip.start_date, latest, precision: "day", durationMinDays: days, durationMaxDays: days };
}

/** A két intervallum metszetének hossza napokban (0, ha nem fednek át). */
export function overlapDays(a: DateRange, b: DateRange): number {
  const start = a.earliest > b.earliest ? a.earliest : b.earliest;
  const end = a.latest < b.latest ? a.latest : b.latest;
  return end < start ? 0 : diffDays(start, end) + 1;
}

/** BR-M23-004: két időszak illeszkedik, ha metszetük legalább `minDays` nap (alapérték 1). */
export function overlaps(a: DateRange, b: DateRange, minDays = 1): boolean {
  return overlapDays(a, b) >= Math.max(1, minDays);
}

/** A napok listája egy intervallumban (legfeljebb 3 évnyi). */
export function eachDay(range: DateRange): string[] {
  const total = diffDays(range.earliest, range.latest);
  if (total < 0 || total > 1100) return [];
  return Array.from({ length: total + 1 }, (_, i) => addDays(range.earliest, i));
}

/** Adatból jövő lokalizált név: a kért nyelv, különben angol alapnév (12. fejezet), végül bármely érték. */
export function localizedLabel(label: LocalizedLabel | null | undefined, locale: string): string {
  if (!label) return "";
  return label[locale] || label.en || label.hu || Object.values(label).find(Boolean) || "";
}

function parts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d, utc: new Date(Date.UTC(y, m - 1, d, 12)) };
}

function monthShort(date: Date, locale: CalendarLocale): string {
  return new Intl.DateTimeFormat(locale === "hu" ? "hu-HU" : "en-GB", { month: "short", timeZone: "UTC" })
    .format(date)
    .replace(/^(\w)/u, (c) => (locale === "en" ? c.toUpperCase() : c));
}

/**
 * Megjelenítés (9. fejezet): HU „2027. márc.–máj.”, EN „Mar–May 2027”; napos pontosságnál
 * HU „2027. márc. 25.–ápr. 4.”, EN „25 Mar–4 Apr 2027”. Zónára nem vetít.
 */
export function formatPeriod(period: Pick<Period, "earliest" | "latest" | "precision">, locale: CalendarLocale): string {
  const a = parts(period.earliest);
  const b = parts(period.latest);
  const ma = monthShort(a.utc, locale);
  const mb = monthShort(b.utc, locale);
  const sameYear = a.y === b.y;
  const byMonth = period.precision === "month" || period.precision === "season";

  if (locale === "hu") {
    if (byMonth) {
      if (sameYear && a.m === b.m) return `${a.y}. ${ma}`;
      return sameYear ? `${a.y}. ${ma}–${mb}` : `${a.y}. ${ma}–${b.y}. ${mb}`;
    }
    if (period.earliest === period.latest) return `${a.y}. ${ma} ${a.d}.`;
    if (!sameYear) return `${a.y}. ${ma} ${a.d}.–${b.y}. ${mb} ${b.d}.`;
    return a.m === b.m ? `${a.y}. ${ma} ${a.d}–${b.d}.` : `${a.y}. ${ma} ${a.d}.–${mb} ${b.d}.`;
  }
  if (byMonth) {
    if (sameYear && a.m === b.m) return `${ma} ${a.y}`;
    return sameYear ? `${ma}–${mb} ${a.y}` : `${ma} ${a.y}–${mb} ${b.y}`;
  }
  if (period.earliest === period.latest) return `${a.d} ${ma} ${a.y}`;
  if (!sameYear) return `${a.d} ${ma} ${a.y}–${b.d} ${mb} ${b.y}`;
  return a.m === b.m ? `${a.d}–${b.d} ${ma} ${a.y}` : `${a.d} ${ma}–${b.d} ${mb} ${a.y}`;
}
