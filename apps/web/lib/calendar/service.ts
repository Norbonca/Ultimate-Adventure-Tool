/**
 * M23 Calendar — lekérdező szolgáltatás (FR-M23-010, 10. fejezet „Időszakok listája”).
 *
 * A fogyasztók nem olvassák közvetlenül a táblákat. Az olvasás a hívó RLS-es kliensén megy át, ezért
 * publikusan csak az aktív definíciók `generated`/`verified` előfordulásai jönnek vissza (NyK-05).
 * A `/api/v1/calendar/periods` útvonal a V1.1-ben erre épül.
 */

import { createClient } from "@/lib/supabase/server";
import { resolveViewerCalendar, type ViewerCalendar } from "./context";
import { computeCoverage, type Coverage } from "./coverage";
import { localizedLabel, overlaps, type LocalizedLabel } from "./period";
import type { RuleKind } from "./rules";
import { periodsQuerySchema, type PeriodsQuery } from "./schemas";

export interface CalendarPeriodItem {
  periodKey: string;
  type: string;
  label: string;
  tags: string[];
  earliest: string;
  latest: string;
  isDayOff: boolean;
  status: string;
}

export type CalendarPeriodsResult =
  | { ok: true; data: { coverage: Coverage; items: CalendarPeriodItem[] } }
  | { ok: false; error: "invalid_params" | "load_failed" };

interface PeriodRow {
  id: string;
  key: string;
  label_localized: LocalizedLabel;
  period_type: string;
  rule_kind: RuleKind;
  rule_params: Record<string, unknown>;
  is_day_off: boolean;
  status: "active" | "inactive";
  ref_calendar_occurrences: Array<{ year: number; earliest: string; latest: string; status: string }>;
  ref_calendar_period_tags: Array<{ ref_calendar_tags: { key: string } | null }>;
}

export async function getCalendarPeriods(query: PeriodsQuery): Promise<CalendarPeriodsResult> {
  const parsed = periodsQuerySchema.safeParse(query);
  if (!parsed.success) return { ok: false, error: "invalid_params" };
  const { country, from, to, types, tags, locale } = parsed.data;

  const supabase = await createClient();
  let request = supabase
    .from("ref_calendar_periods")
    .select(
      "id, key, label_localized, period_type, rule_kind, rule_params, is_day_off, status, ref_calendar_occurrences(year, earliest, latest, status), ref_calendar_period_tags(ref_calendar_tags(key))",
    )
    .eq("country_code", country)
    .is("subdivision_code", null)
    .eq("status", "active");
  if (types?.length) request = request.in("period_type", types);
  const { data, error } = await request.returns<PeriodRow[]>();
  if (error) return { ok: false, error: "load_failed" };

  const range = { earliest: from, latest: to };
  const fromYear = Number(from.slice(0, 4));
  const years = Array.from({ length: Number(to.slice(0, 4)) - fromYear + 1 }, (_, i) => fromYear + i);
  const rows = data ?? [];

  const coverage = computeCoverage({
    periods: rows.map((p) => ({ id: p.id, periodType: p.period_type, ruleKind: p.rule_kind, oneOff: p.rule_params?.one_off === true, status: p.status })),
    occurrences: rows.flatMap((p) => p.ref_calendar_occurrences.map((o) => ({ periodId: p.id, year: o.year }))),
    years,
    types,
  });

  const items = rows
    .flatMap((p) => {
      const tagKeys = p.ref_calendar_period_tags.map((t) => t.ref_calendar_tags?.key).filter((k): k is string => Boolean(k));
      if (tags?.length && !tags.some((tag) => tagKeys.includes(tag))) return [];
      return p.ref_calendar_occurrences
        .filter((o) => overlaps(o, range))
        .map((o) => ({
          periodKey: p.key,
          type: p.period_type,
          label: localizedLabel(p.label_localized, locale),
          tags: tagKeys,
          earliest: o.earliest,
          latest: o.latest,
          isDayOff: p.is_day_off,
          status: o.status,
        }));
    })
    .sort((a, b) => a.earliest.localeCompare(b.earliest) || a.label.localeCompare(b.label));

  return { ok: true, data: { coverage, items } };
}

const COUNTRY_RE = /^[A-Z]{2}$/;

/**
 * A bejelentkezett néző naptára (BR-M23-006): a saját profil országa, ha aktív ország. A profil a
 * `get_my_profile()` RPC-n jön (031 óta a kliens nem olvassa közvetlenül a `profiles` táblát).
 * Kijelentkezve, ország nélkül vagy hiba esetén `country: null`, időzóna UTC.
 */
export async function getViewerCalendar(): Promise<ViewerCalendar> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return resolveViewerCalendar({ profile: null, activeCountryCodes: [] });

  const { data: profile } = await supabase.rpc("get_my_profile");
  const row = (profile ?? null) as { country_code?: string | null; timezone?: string | null } | null;
  const code = row?.country_code?.trim().toUpperCase() ?? "";
  if (!COUNTRY_RE.test(code)) return resolveViewerCalendar({ profile: null, activeCountryCodes: [] });

  const { data: country } = await supabase.from("ref_countries").select("code").eq("code", code).eq("is_active", true).maybeSingle();
  return resolveViewerCalendar({
    profile: { countryCode: code, timezone: row?.timezone ?? null },
    activeCountryCodes: country ? [country.code as string] : [],
  });
}

export type ViewerCalendarPeriodsResult =
  | { ok: true; data: { calendar: ViewerCalendar; coverage: Coverage; items: CalendarPeriodItem[] } }
  | { ok: false; error: "invalid_params" | "load_failed" };

/**
 * Időszakok a néző naptár-országa szerint. Ország nélkül nincs országspecifikus időszak: üres lista,
 * `coverage: "none"` — a hívó ilyenkor nem mutat jelvényt, és a profilbeállításra utalhat.
 */
export async function getViewerCalendarPeriods(query: Omit<PeriodsQuery, "country">): Promise<ViewerCalendarPeriodsResult> {
  const calendar = await getViewerCalendar();
  if (!calendar.country) return { ok: true, data: { calendar, coverage: "none", items: [] } };
  const result = await getCalendarPeriods({ ...query, country: calendar.country });
  return result.ok ? { ok: true, data: { calendar, ...result.data } } : result;
}
