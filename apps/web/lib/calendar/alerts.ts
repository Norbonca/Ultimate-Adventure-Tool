/**
 * M23 Calendar V1.1 — jelvények (FR-M23-006) és figyelmeztetések (FR-M23-014) számítása.
 *
 * Tiszta függvények: az időszakokat a hívó adja (`getCalendarPeriods`), a szövegek i18n-kulcsként
 * és paraméterként jönnek vissza, a komponens fordít. A figyelmeztetés számított, nem tárolt, és
 * nem blokkol mentést vagy publikálást (BR-M23-015). Design: D00 `P9i1aP` (Badge, AlertBlock).
 */

import type { CalendarPeriodItem } from "./service";
import type { Coverage } from "./coverage";
import { longWeekends } from "./long-weekend";
import { eachDay, overlaps } from "./period";
import { addDays, isoWeekday, type DateRange } from "./rules";
import { isValidTimeZone } from "@/lib/timezone";

export type BadgeKind = "season" | "possible" | "holiday" | "long_weekend";

export interface CalendarBadge {
  kind: BadgeKind;
  /** i18n kulcs a `calendar.badge.*` alatt */
  labelKey: "falls" | "mayFall" | "holiday" | "longWeekend";
  params: Record<string, string>;
  periodKey?: string;
}

export type AlertKey =
  | "local_holiday"
  | "viewer_holiday"
  | "timezone_difference"
  | "dst_change"
  | "deadline_on_holiday"
  | "no_calendar_data";

export type AlertSeverity = "warning" | "info" | "danger" | "neutral";

export interface CalendarAlert {
  key: AlertKey;
  severity: AlertSeverity;
  /** Lucide-ikon az Ikon Bank `calendar.*` kulcsai szerint */
  icon: "calendar-x" | "calendar-days" | "globe" | "clock" | "alert-triangle" | "info";
  /** i18n paraméterek a `calendar.alerts.<key>.{title,dates,impact}` kulcsokhoz */
  params: Record<string, string>;
  /** stabil azonosító az ugyanolyan kulcsú, több előfordulás megkülönböztetésére */
  id: string;
}

const DAY_OFF_TYPES = new Set(["national_holiday", "public_holiday", "bridge_day"]);
const SEASON_TYPES = new Set(["school_holiday", "holiday_season"]);

function dayOffDates(items: CalendarPeriodItem[]): string[] {
  return items.filter((i) => i.isDayOff || DAY_OFF_TYPES.has(i.type)).flatMap((i) => eachDay(i));
}

function workingDates(items: CalendarPeriodItem[]): string[] {
  return items.filter((i) => i.type === "swapped_workday").flatMap((i) => eachDay(i));
}

/**
 * Jelvények a néző naptára szerint (FR-M23-006 1., BR-M23-007). Sorrend: szünet/ünnepi időszak →
 * hosszú hétvége → munkaszüneti nap. A kártyán az első, a túraoldalon mind.
 * `uncertain` (M023 ablakos túra): a „lehet” változat.
 */
export function badgesFor(input: {
  trip: DateRange;
  viewerItems: CalendarPeriodItem[];
  uncertain?: boolean;
}): CalendarBadge[] {
  const { trip, viewerItems, uncertain } = input;
  const badges: CalendarBadge[] = [];
  for (const item of viewerItems) {
    if (!SEASON_TYPES.has(item.type) || !overlaps(item, trip)) continue;
    badges.push({
      kind: uncertain ? "possible" : "season",
      labelKey: uncertain ? "mayFall" : "falls",
      params: { period: item.label },
      periodKey: item.periodKey,
    });
  }
  const dayOff = dayOffDates(viewerItems);
  for (const run of longWeekends({ dayOffDates: dayOff, workingDates: workingDates(viewerItems), range: trip })) {
    if (overlaps(run, trip, 1)) {
      badges.push({ kind: "long_weekend", labelKey: "longWeekend", params: { from: run.earliest, to: run.latest } });
      break;
    }
  }
  const tripDays = new Set(eachDay(trip));
  const holidays = viewerItems.filter(
    (i) => (i.isDayOff || DAY_OFF_TYPES.has(i.type)) && eachDay(i).some((d) => tripDays.has(d)),
  );
  for (const h of holidays) {
    badges.push({ kind: "holiday", labelKey: "holiday", params: { period: h.label, date: h.earliest }, periodKey: h.periodKey });
  }
  return badges;
}

/** UTC-eltolás percben egy pillanatban, a zónában. */
export function utcOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

export interface DstTransition {
  /** a helyi nap, amelyen az átállás történik */
  date: string;
  /** eltolás előtte / utána, percben */
  from: number;
  to: number;
}

/** Óraátállások a tartományban, a zónában (FR-M23-014 `dst_change`). Napi felbontás: helyi 12:00-kor mért eltolás. */
export function dstTransitions(timeZone: string, range: DateRange): DstTransition[] {
  if (!isValidTimeZone(timeZone)) return [];
  const out: DstTransition[] = [];
  let prev: number | null = null;
  for (const day of eachDay({ earliest: addDays(range.earliest, -1), latest: range.latest })) {
    const noon = new Date(`${day}T12:00:00Z`);
    const offset = utcOffsetMinutes(noon, timeZone);
    if (prev !== null && offset !== prev && day >= range.earliest) out.push({ date: day, from: prev, to: offset });
    prev = offset;
  }
  return out;
}

export interface AlertsInput {
  trip: DateRange & { timezone: string; destinationCountry: string | null; registrationDeadlineDate?: string | null };
  /** a célország időszakai és lefedettsége (`getCalendarPeriods` a célországra); `null` = nem kérdeztük le */
  destination: { coverage: Coverage; items: CalendarPeriodItem[] } | null;
  /** a néző naptára; `country: null` → nincs néző-jelvény */
  viewer: { country: string | null; timezone: string; items: CalendarPeriodItem[] };
  /** a szervező naptára (a határidő-ellenőrzéshez), ha más, mint a nézőé */
  organizerItems?: CalendarPeriodItem[];
}

/**
 * Figyelmeztetések (FR-M23-014). Rangsor: `local_holiday`, `viewer_holiday`, `timezone_difference`,
 * `no_calendar_data` kötelező; `dst_change`, `deadline_on_holiday` fontos. Dedupe kulcs + azonosító szerint.
 */
export function alertsFor(input: AlertsInput): CalendarAlert[] {
  const { trip, destination, viewer } = input;
  const alerts: CalendarAlert[] = [];
  const tripDays = new Set(eachDay(trip));
  const dayIndex = (date: string) => eachDay(trip).indexOf(date) + 1;

  if (trip.destinationCountry && destination && destination.coverage === "none") {
    alerts.push({ key: "no_calendar_data", severity: "neutral", icon: "info", id: "no_calendar_data", params: { country: trip.destinationCountry } });
  }

  if (destination) {
    for (const item of destination.items) {
      if (!(item.isDayOff || DAY_OFF_TYPES.has(item.type) || item.type === "holiday_season")) continue;
      const hit = eachDay(item).find((d) => tripDays.has(d));
      if (!hit) continue;
      alerts.push({
        key: "local_holiday",
        severity: "warning",
        icon: "calendar-x",
        id: `local_holiday:${item.periodKey}:${item.earliest}`,
        params: { period: item.label, date: hit, country: trip.destinationCountry ?? "", dayIndex: String(dayIndex(hit)), weekday: String(isoWeekday(hit)) },
      });
    }
  }

  if (viewer.country && viewer.country !== trip.destinationCountry) {
    for (const item of viewer.items) {
      if (!SEASON_TYPES.has(item.type) || !overlaps(item, trip)) continue;
      alerts.push({
        key: "viewer_holiday",
        severity: "warning",
        icon: "calendar-days",
        id: `viewer_holiday:${item.periodKey}:${item.earliest}`,
        params: { period: item.label, from: item.earliest, to: item.latest, country: viewer.country },
      });
    }
  }

  // Csak ismert néző-zónánál (profil, BR-M23-016): kijelentkezve az UTC tartalék nem a néző ideje.
  if (viewer.country && isValidTimeZone(trip.timezone) && isValidTimeZone(viewer.timezone)) {
    const at = new Date(`${trip.earliest}T12:00:00Z`);
    const diff = utcOffsetMinutes(at, trip.timezone) - utcOffsetMinutes(at, viewer.timezone);
    if (diff !== 0) {
      const hours = Math.abs(diff) / 60;
      alerts.push({
        key: "timezone_difference",
        severity: "info",
        icon: "globe",
        id: "timezone_difference",
        params: { hours: Number.isInteger(hours) ? String(hours) : hours.toFixed(1), direction: diff > 0 ? "ahead" : "behind", tripTz: trip.timezone, viewerTz: viewer.timezone },
      });
    }
  }

  for (const t of dstTransitions(trip.timezone, trip)) {
    alerts.push({
      key: "dst_change",
      severity: "info",
      icon: "clock",
      id: `dst_change:${t.date}`,
      params: { date: t.date, direction: t.to > t.from ? "forward" : "back", tripTz: trip.timezone, dayIndex: String(dayIndex(t.date)) },
    });
  }

  const deadline = trip.registrationDeadlineDate;
  if (deadline) {
    const pools: Array<[string, CalendarPeriodItem[]]> = [];
    if (destination) pools.push([trip.destinationCountry ?? "", destination.items]);
    if (viewer.country) pools.push([viewer.country, viewer.items]);
    if (input.organizerItems) pools.push(["organizer", input.organizerItems]);
    const seen = new Set<string>();
    for (const [country, items] of pools) {
      const hit = items.find((i) => (i.isDayOff || DAY_OFF_TYPES.has(i.type)) && eachDay(i).includes(deadline));
      if (!hit || seen.has(hit.periodKey)) continue;
      seen.add(hit.periodKey);
      alerts.push({
        key: "deadline_on_holiday",
        severity: "danger",
        icon: "alert-triangle",
        id: `deadline_on_holiday:${hit.periodKey}`,
        params: { period: hit.label, date: deadline, country, suggested: addDays(deadline, -1) },
      });
    }
  }

  const order: AlertKey[] = ["local_holiday", "deadline_on_holiday", "viewer_holiday", "timezone_difference", "dst_change", "no_calendar_data"];
  return alerts.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key) || a.id.localeCompare(b.id));
}
