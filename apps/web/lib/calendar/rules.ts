/**
 * M23 Calendar — szabálymotor (FR-M23-003, FR-M23-004).
 *
 * Az SQL-motor (037: calendar_easter_date, calendar_rule_occurrence) tükre: a seed-generátor
 * (scripts/calendar/build-calendar-seed.mjs) és az admin szabályelőnézete ezt használja, a paritást
 * az SQL-teszt ellenőrzi. Függőség nélküli modul (a Node típuskivonással közvetlenül importálja).
 *
 * Minden dátum 'YYYY-MM-DD' naptári nap, időzóna nélkül (BR-M23-010); a számítás UTC-déli
 * Date-objektumokon fut, így a futtatókörnyezet zónája nem számít.
 */

export type RuleKind = "fixed_annual" | "easter_offset" | "nth_weekday" | "explicit";
export type EasterCalendar = "western" | "orthodox";

export interface FixedAnnualParams {
  month: number;
  day: number;
  end_month?: number;
  end_day?: number;
}
export interface EasterOffsetParams {
  offset: number;
  calendar?: EasterCalendar;
}
export interface NthWeekdayParams {
  month: number;
  /** ISO hét napja: 1 = hétfő … 7 = vasárnap */
  weekday: number;
  /** 1–5, vagy -1 = a hónap utolsó ilyen napja */
  n: number;
}

export type CalendarRule =
  | { kind: "fixed_annual"; params: FixedAnnualParams; durationDays?: number | null }
  | { kind: "easter_offset"; params: EasterOffsetParams; durationDays?: number | null }
  | { kind: "nth_weekday"; params: NthWeekdayParams; durationDays?: number | null }
  | { kind: "explicit"; params?: Record<string, never>; durationDays?: number | null };

export interface DateRange {
  earliest: string;
  latest: string;
}

export const RULE_KINDS: readonly RuleKind[] = ["fixed_annual", "easter_offset", "nth_weekday", "explicit"];

const DAY_MS = 86_400_000;

function isInt(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

/** 'YYYY-MM-DD' a megadott (UTC) év, hónap, nap alapján. */
export function isoDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day, 12)).toISOString().slice(0, 10);
}

/** Napok hozzáadása egy 'YYYY-MM-DD' dátumhoz. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Két 'YYYY-MM-DD' dátum különbsége napokban (b − a). */
export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** ISO hét napja (1 = hétfő … 7 = vasárnap). */
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return dow === 0 ? 7 : dow;
}

/** Húsvétvasárnap: nyugati (Meeus/Jones/Butcher) vagy ortodox (Julián-számítás, Gergely-dátumként). */
export function easterDate(year: number, calendar: EasterCalendar = "western"): string {
  if (!isInt(year, 1900, 2199)) throw new Error("calendar_year_out_of_range");
  if (calendar === "orthodox") {
    const a = year % 4;
    const b = year % 7;
    const c = year % 19;
    const d = (19 * c + 15) % 30;
    const e = (2 * a + 4 * b - d + 34) % 7;
    const month = Math.floor((d + e + 114) / 31);
    const day = ((d + e + 114) % 31) + 1;
    const julianToGregorian = Math.floor(year / 100) - Math.floor(year / 400) - 2;
    return addDays(isoDate(year, month, day), julianToGregorian);
  }
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return isoDate(year, month, day);
}

/** A szabály paramétereinek érvényessége (az SQL calendar_rule_params_valid tükre). */
export function validateRuleParams(kind: RuleKind, params: unknown): boolean {
  if (params === null || typeof params !== "object" || Array.isArray(params)) return false;
  const p = params as Record<string, unknown>;
  switch (kind) {
    case "explicit":
      return true;
    case "fixed_annual": {
      if (!isInt(p.month, 1, 12) || !isInt(p.day, 1, 31)) return false;
      const hasEndMonth = "end_month" in p;
      if (hasEndMonth !== "end_day" in p) return false;
      if (hasEndMonth && (!isInt(p.end_month, 1, 12) || !isInt(p.end_day, 1, 31))) return false;
      return true;
    }
    case "easter_offset":
      return isInt(p.offset, -120, 120) && (p.calendar === undefined || p.calendar === "western" || p.calendar === "orthodox");
    case "nth_weekday":
      return isInt(p.month, 1, 12) && isInt(p.weekday, 1, 7) && (isInt(p.n, 1, 5) || p.n === -1);
    default:
      return false;
  }
}

/** Egy szabály adott évi előfordulása; explicit szabálynál vagy nem létező napnál null. */
export function ruleOccurrence(rule: CalendarRule, year: number): DateRange | null {
  if (rule.kind === "explicit" || !validateRuleParams(rule.kind, rule.params)) return null;
  const duration = Math.max(1, rule.durationDays ?? 1);
  let start: string;
  let end: string | null = null;

  if (rule.kind === "fixed_annual") {
    const { month, day, end_month, end_day } = rule.params;
    if (day > daysInMonth(year, month)) return null;
    start = isoDate(year, month, day);
    if (end_month !== undefined && end_day !== undefined) {
      const endYear = end_month > month || (end_month === month && end_day >= day) ? year : year + 1;
      end = isoDate(endYear, end_month, Math.min(end_day, daysInMonth(endYear, end_month)));
    }
  } else if (rule.kind === "easter_offset") {
    start = addDays(easterDate(year, rule.params.calendar ?? "western"), rule.params.offset);
  } else {
    const { month, weekday, n } = rule.params;
    const last = isoDate(year, month, daysInMonth(year, month));
    if (n === -1) {
      start = addDays(last, -((isoWeekday(last) - weekday + 7) % 7));
    } else {
      const first = isoDate(year, month, 1);
      start = addDays(first, ((weekday - isoWeekday(first) + 7) % 7) + 7 * (n - 1));
      if (start > last) return null;
    }
  }
  return { earliest: start, latest: end ?? addDays(start, duration - 1) };
}

/** Szabályelőnézet (S6): a megadott évtől kezdve `count` év előfordulásai. */
export function previewOccurrences(rule: CalendarRule, fromYear: number, count = 3): Array<{ year: number; range: DateRange | null }> {
  return Array.from({ length: count }, (_, i) => ({ year: fromYear + i, range: ruleOccurrence(rule, fromYear + i) }));
}

/**
 * Szabály levezetése évenkénti egynapos dátumokból (seed-generátor): rögzített nap, nyugati vagy ortodox
 * húsvéthoz kötött eltolás, n-edik hétköznap — csak ha minden megadott évre pontosan egyezik.
 */
export function deriveRule(datesByYear: Record<number, string>): CalendarRule | null {
  const years = Object.keys(datesByYear).map(Number).sort((a, b) => a - b);
  if (years.length < 2) return null;
  const first = datesByYear[years[0]];
  const [, fm, fd] = first.split("-").map(Number);
  const weekday = isoWeekday(first);
  const candidates: CalendarRule[] = [
    { kind: "fixed_annual", params: { month: fm, day: fd } },
    { kind: "easter_offset", params: { offset: diffDays(easterDate(years[0], "western"), first) } },
    { kind: "easter_offset", params: { offset: diffDays(easterDate(years[0], "orthodox"), first), calendar: "orthodox" } },
    { kind: "nth_weekday", params: { month: fm, weekday, n: Math.floor((fd - 1) / 7) + 1 } },
  ];
  if (fd + 7 > daysInMonth(years[0], fm)) {
    candidates.push({ kind: "nth_weekday", params: { month: fm, weekday, n: -1 } });
  }
  return (
    candidates.find(
      (rule) =>
        validateRuleParams(rule.kind, rule.params) &&
        years.every((y) => ruleOccurrence(rule, y)?.earliest === datesByYear[y]),
    ) ?? null
  );
}
