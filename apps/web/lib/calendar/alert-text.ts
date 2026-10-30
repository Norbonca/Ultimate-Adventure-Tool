/**
 * M23 Calendar V1.1 — a jelvények és figyelmeztetések szövege i18n-ből (FR-M23-014 „sablonból jön”).
 * Szerver- és kliensoldalon is használható: a `t` a hívó fordítója.
 */

import type { CalendarAlert, CalendarBadge } from "./alerts";

type Translate = (key: string, params?: Record<string, string | number>) => string;

export function countryName(code: string, locale: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return code;
  try {
    return new Intl.DisplayNames([locale === "en" ? "en" : "hu"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function longDate(iso: string, locale: string, withWeekday = true): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale === "en" ? "en-GB" : "hu-HU", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(withWeekday ? { weekday: "long" } : {}),
  });
}

export function shortDate(iso: string, locale: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale === "en" ? "en-GB" : "hu-HU", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

export function badgeText(badge: CalendarBadge, t: Translate, locale: string): string {
  const params = { ...badge.params };
  if (params.date) params.date = shortDate(params.date, locale);
  return t(`calendar.badge.${badge.labelKey}`, params);
}

export interface AlertTexts {
  title: string;
  dates: string;
  impact: string;
}

export function alertText(alert: CalendarAlert, t: Translate, locale: string): AlertTexts {
  const p = alert.params;
  const base = `calendar.alerts.${alert.key}`;
  switch (alert.key) {
    case "local_holiday":
      return {
        title: t(`${base}.title`, { period: p.period, date: shortDate(p.date, locale), country: countryName(p.country, locale) }),
        dates: t(`${base}.dates`, { date: longDate(p.date, locale), dayIndex: p.dayIndex }),
        impact: t(`${base}.impact`),
      };
    case "viewer_holiday":
      return {
        title: t(`${base}.title`, { period: p.period }),
        dates: t(`${base}.dates`, { from: shortDate(p.from, locale), to: shortDate(p.to, locale), country: countryName(p.country, locale) }),
        impact: t(`${base}.impact`, { period: p.period }),
      };
    case "timezone_difference":
      return {
        title: t(`${base}.${p.direction === "ahead" ? "titleAhead" : "titleBehind"}`, { hours: p.hours }),
        dates: t(`${base}.dates`, { tripTz: p.tripTz, viewerTz: p.viewerTz }),
        impact: t(`${base}.impact`),
      };
    case "dst_change":
      return {
        title: t(`${base}.title`),
        dates: t(`${base}.dates`, { date: longDate(p.date, locale), dayIndex: p.dayIndex, tripTz: p.tripTz }),
        impact: t(`${base}.${p.direction === "forward" ? "impactForward" : "impactBack"}`),
      };
    case "deadline_on_holiday":
      return {
        title: t(`${base}.title`),
        dates: t(`${base}.dates`, { date: longDate(p.date, locale), period: p.period, country: p.country === "organizer" ? t("calendar.alerts.organizerCalendar") : countryName(p.country, locale) }),
        impact: t(`${base}.impact`, { suggested: shortDate(p.suggested, locale) }),
      };
    case "no_calendar_data":
      return {
        title: t(`${base}.title`, { country: countryName(p.country, locale) }),
        dates: t(`${base}.dates`, { country: countryName(p.country, locale) }),
        impact: t(`${base}.impact`),
      };
  }
}
