/**
 * M22 — az időablak feloldása (BR-M22-003, BR-M22-004, BR-M22-018; NyK-01: a lejárat az ötletgazda
 * helyi ideje szerint, NyK-25: abszolút hónaptartomány + év). Tiszta függvények, egységteszttel.
 */

import { endOfLocalDay } from "@/lib/calendar/time";

export interface MonthWindow {
  startMonth: number; // 1–12
  endMonth: number; // 1–12; kisebb is lehet (évfordulós ablak)
  year: number; // a kezdő hónap éve
}

const pad = (n: number) => String(n).padStart(2, "0");

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Az ablak záró hónapjának éve: évfordulós ablaknál a következő év. */
export function endYear(w: MonthWindow): number {
  return w.endMonth < w.startMonth ? w.year + 1 : w.year;
}

/** Hány hónapot fed az ablak (1–12). */
export function windowMonths(w: MonthWindow): number {
  return w.endMonth >= w.startMonth ? w.endMonth - w.startMonth + 1 : 12 - w.startMonth + 1 + w.endMonth;
}

/** Abszolút dátumok: az ablak első és utolsó napja. */
export function windowDates(w: MonthWindow): { start: string; end: string } {
  const ey = endYear(w);
  return { start: `${w.year}-${pad(w.startMonth)}-01`, end: `${ey}-${pad(w.endMonth)}-${pad(daysInMonth(ey, w.endMonth))}` };
}

/**
 * Az év automatikus értéke (FR-M22-001): a legközelebbi év, amelyben az ablak még nem ért véget — a
 * záró hónap utolsó napja a mai napnál későbbi.
 */
export function autoYear(startMonth: number, endMonth: number, today: Date = new Date()): number {
  const y0 = today.getFullYear();
  for (let y = y0; y <= y0 + 2; y++) {
    const w = { startMonth, endMonth, year: y };
    const { end } = windowDates(w);
    if (end >= today.toISOString().slice(0, 10)) return y;
  }
  return y0 + 2;
}

/** A lejárat pillanata: a záró hónap utolsó napjának vége az ötletgazda zónájában (NyK-01). */
export function expiresAt(w: MonthWindow, timezone: string): Date {
  return endOfLocalDay(windowDates(w).end, timezone);
}

/** Az ablak hónapjai sorban (1–12 értékek), pl. [11, 12, 1, 2]. */
export function windowMonthList(w: MonthWindow): number[] {
  const out: number[] = [];
  let m = w.startMonth;
  for (let i = 0; i < windowMonths(w); i++) {
    out.push(m);
    m = m === 12 ? 1 : m + 1;
  }
  return out;
}

export type WindowError = "windowInPast" | "windowTooFar" | "windowTooLong";

/** BR-M22-003: a vége nem múltbeli, a kezdet legfeljebb 24 hónappal későbbi, legfeljebb maxMonths hosszú. */
export function validateWindow(w: MonthWindow, today: Date = new Date(), maxMonths = 12): WindowError | null {
  const { start, end } = windowDates(w);
  const todayIso = today.toISOString().slice(0, 10);
  if (end < todayIso) return "windowInPast";
  const limit = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 24, 1)).toISOString().slice(0, 10);
  if (start > limit) return "windowTooFar";
  if (windowMonths(w) > maxMonths) return "windowTooLong";
  return null;
}

/** Évszak-chipek feloldása hónaptartományra (BR-M22-018, északi félteke); az évet az autoYear adja. */
export const SEASON_MONTHS: Record<"spring" | "summer" | "autumn" | "winter", [number, number]> = {
  spring: [3, 5],
  summer: [6, 8],
  autumn: [9, 11],
  winter: [12, 2],
};

/** Két hónapablak (dátumintervallum) metszete nem üres? (FR-M22-002 illesztés) */
export function windowsOverlap(a: { start: string; end: string }, b: { start: string; end: string }): boolean {
  return a.start <= b.end && b.start <= a.end;
}

/** Megjelenítés: „2027. júl.–aug.” / „Jul–Aug 2027”; egyhónapos ablaknál „2027. júl.”. */
export function formatWindow(w: MonthWindow, locale: string): string {
  const loc = locale === "en" ? "en-GB" : "hu-HU";
  const fmt = (y: number, m: number) => new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(loc, { month: "short", timeZone: "UTC" });
  const ey = endYear(w);
  const single = w.startMonth === w.endMonth;
  if (locale === "en") {
    if (single) return `${fmt(w.year, w.startMonth)} ${w.year}`;
    return ey === w.year ? `${fmt(w.year, w.startMonth)}–${fmt(ey, w.endMonth)} ${w.year}` : `${fmt(w.year, w.startMonth)} ${w.year} – ${fmt(ey, w.endMonth)} ${ey}`;
  }
  if (single) return `${w.year}. ${fmt(w.year, w.startMonth)}`;
  return ey === w.year ? `${w.year}. ${fmt(w.year, w.startMonth)}–${fmt(ey, w.endMonth)}` : `${w.year}. ${fmt(w.year, w.startMonth)} – ${ey}. ${fmt(ey, w.endMonth)}`;
}

/** Hónapnév a nyelv szerint (NK-M22-006: Intl). */
export function monthName(month: number, locale: string, style: "long" | "short" = "long"): string {
  return new Date(Date.UTC(2027, month - 1, 15)).toLocaleDateString(locale === "en" ? "en-GB" : "hu-HU", { month: style, timeZone: "UTC" });
}
