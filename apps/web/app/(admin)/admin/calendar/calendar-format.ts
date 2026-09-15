/**
 * M23 Calendar admin — megjelenítési segédek (kliens- és szerveroldalon is használható).
 * Minden felhasználói szöveg `t()`-ből vagy `Intl`-ből jön.
 */

import type { TranslationKey } from "@uat/i18n";
import { formatPeriod, type CalendarLocale } from "@/lib/calendar/period";
import type { RuleKind } from "@/lib/calendar/rules";

export type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

export const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function asLocale(locale: string): CalendarLocale {
  return locale === "en" ? "en" : "hu";
}

export function monthName(month: number, locale: string): string {
  return new Intl.DateTimeFormat(asLocale(locale) === "en" ? "en-GB" : "hu-HU", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2001, month - 1, 1, 12)),
  );
}

export function dayMonth(month: number, day: number, locale: string): string {
  return new Intl.DateTimeFormat(asLocale(locale) === "en" ? "en-GB" : "hu-HU", { month: "long", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, month - 1, Math.min(day, 29), 12)),
  );
}

export function weekdayName(weekday: number, t: Translate): string {
  const key = WEEKDAY_KEYS[weekday - 1];
  return key ? t(`calendar.weekdays.${key}` as TranslationKey) : String(weekday);
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "±0";
}

/** A szabály rövid, emberi leírása a listában és az előnézetben. */
export function ruleSummary(rule: { rule_kind: RuleKind; rule_params: Record<string, unknown> }, t: Translate, locale: string): string {
  const p = rule.rule_params ?? {};
  const num = (key: string) => Number(p[key]);
  switch (rule.rule_kind) {
    case "fixed_annual":
      if (p.end_month !== undefined) {
        return t("calendar.ruleSummary.fixedRange", {
          start: dayMonth(num("month"), num("day"), locale),
          end: dayMonth(num("end_month"), num("end_day"), locale),
        });
      }
      return t("calendar.ruleSummary.fixed", { date: dayMonth(num("month"), num("day"), locale) });
    case "easter_offset":
      return t(p.calendar === "orthodox" ? "calendar.ruleSummary.easterOrthodox" : "calendar.ruleSummary.easter", { offset: signed(num("offset")) });
    case "nth_weekday":
      return num("n") === -1
        ? t("calendar.ruleSummary.nthWeekdayLast", { month: monthName(num("month"), locale), weekday: weekdayName(num("weekday"), t) })
        : t("calendar.ruleSummary.nthWeekday", { month: monthName(num("month"), locale), nth: num("n"), weekday: weekdayName(num("weekday"), t) });
    default:
      return p.one_off === true ? t("calendar.ruleSummary.oneOff") : t("calendar.ruleSummary.explicit");
  }
}

export function rangeText(range: { earliest: string; latest: string }, locale: string): string {
  return formatPeriod({ ...range, precision: "day" }, asLocale(locale));
}

export const statusBadgeClass: Record<string, string> = {
  generated: "bg-sky-100 text-sky-700",
  entered: "bg-amber-100 text-amber-700",
  verified: "bg-emerald-100 text-emerald-700",
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-500",
};
