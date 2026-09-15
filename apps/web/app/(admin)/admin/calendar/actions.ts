"use server";

/**
 * M23 Calendar — admin karbantartás Server Actionjei (FR-M23-009, 10. fejezet, S5–S8).
 *
 * Minden művelet: admin-ellenőrzés (az admin/actions.ts mintája, átirányítás elnyelése nélkül),
 * zod a határon, válasz `{ ok: true, data }` / `{ ok: false, error }` hibakulccsal
 * (`errors.calendar.*`); nyers adatbázis-hiba nem megy ki. Az írás service role kliensen fut
 * (a jogosultságot itt ellenőrizzük; közvetlen táblaírás ellen az RLS véd).
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { missingYears } from "@/lib/calendar/coverage";
import type { LocalizedLabel } from "@/lib/calendar/period";
import type { RuleKind } from "@/lib/calendar/rules";
import {
  occurrenceInputSchema,
  periodInputSchema,
  tagInputSchema,
  type OccurrenceStatus,
} from "@/lib/calendar/schemas";

export type CalendarErrorKey =
  | "adminOnly"
  | "validationFailed"
  | "keyTaken"
  | "ruleInvalid"
  | "invalidRange"
  | "yearExists"
  | "notFound"
  | "saveFailed";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: CalendarErrorKey };

const ADMIN_PATH = "/admin/calendar";
const GLOBAL_SCOPE = "_global";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email === adminEmail && user.email_confirmed_at) {
    return { admin: createAdminClient(), user };
  }
  const { data: role, error } = await supabase
    .from("admin_roles")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !role) redirect("/admin/login");
  return { admin: createAdminClient(), user };
}

type AdminClient = ReturnType<typeof createAdminClient>;

function dbError(error: { code?: string } | null, conflict: CalendarErrorKey = "keyTaken"): CalendarErrorKey {
  if (!error) return "saveFailed";
  if (error.code === "23505") return conflict;
  if (["23514", "22023", "22P02", "23503"].includes(error.code ?? "")) return "validationFailed";
  return "saveFailed";
}

async function audit(admin: AdminClient, userId: string, action: string, targetId: string | null, details?: Record<string, unknown>) {
  // Az audit-napló hibája nem akadályozza a műveletet (a meglévő admin műveletek mintája).
  await admin.from("admin_audit_log").insert({
    admin_user_id: userId,
    admin_role: "operations_admin",
    action,
    target_type: "calendar",
    target_id: targetId,
    details: details ?? null,
    result: "success",
  });
}

async function yearsAhead(admin: AdminClient): Promise<number> {
  const { data } = await admin.from("system_settings").select("value").eq("key", "calendar_generate_years_ahead").maybeSingle();
  const value = Number(data?.value);
  return Number.isInteger(value) && value >= 0 && value <= 10 ? value : 2;
}

// ─── Olvasás ──────────────────────────────────────────────────────────────────

export interface AdminCountry {
  code: string;
  name_hu: string;
  name_en: string;
  is_active: boolean;
}

export interface AdminTag {
  id: string;
  key: string;
  label_localized: LocalizedLabel;
  icon_key: string | null;
  color_token: string | null;
  sort_order: number;
  status: "active" | "inactive";
  usage: number;
}

export interface AdminOccurrence {
  id: string;
  period_id: string;
  year: number;
  earliest: string;
  latest: string;
  status: OccurrenceStatus;
  verified_at: string | null;
  source_note: string | null;
}

export interface AdminPeriod {
  id: string;
  key: string;
  label_localized: LocalizedLabel;
  description_localized: Record<string, string> | null;
  period_type: string;
  country_code: string | null;
  subdivision_code: string | null;
  hemisphere: "north" | "south" | null;
  rule_kind: RuleKind;
  rule_params: Record<string, unknown>;
  duration_days: number | null;
  is_day_off: boolean;
  source_text: string;
  source_url: string | null;
  status: "active" | "inactive";
  tag_ids: string[];
}

export type AdminPeriodRow = AdminPeriod & { occurrence: AdminOccurrence | null; missingYears: number[] };

export interface CalendarAdminOverview {
  countries: AdminCountry[];
  tags: AdminTag[];
  scope: string;
  year: number;
  periods: AdminPeriodRow[];
  unverifiedCount: number;
  generateRange: { from: number; to: number };
}

const PERIOD_COLUMNS =
  "id, key, label_localized, description_localized, period_type, country_code, subdivision_code, hemisphere, rule_kind, rule_params, duration_days, is_day_off, source_text, source_url, status, ref_calendar_period_tags(tag_id)";
const OCCURRENCE_COLUMNS = "id, period_id, year, earliest, latest, status, verified_at, source_note";

type PeriodRow = Omit<AdminPeriod, "tag_ids"> & { ref_calendar_period_tags: Array<{ tag_id: string }> | null };

function toAdminPeriod(row: PeriodRow): AdminPeriod {
  const { ref_calendar_period_tags: tagRows, ...rest } = row;
  return { ...rest, tag_ids: (tagRows ?? []).map((t) => t.tag_id) };
}

async function loadReferenceData(admin: AdminClient): Promise<{ countries: AdminCountry[]; tags: AdminTag[] }> {
  const [countriesRes, tagsRes, usageRes] = await Promise.all([
    admin.from("ref_countries").select("code, name_hu, name_en, is_active").eq("continent", "Europe").order("name_hu"),
    admin.from("ref_calendar_tags").select("id, key, label_localized, icon_key, color_token, sort_order, status").order("sort_order"),
    admin.from("ref_calendar_period_tags").select("tag_id"),
  ]);
  const usage = new Map<string, number>();
  for (const row of usageRes.data ?? []) usage.set(row.tag_id, (usage.get(row.tag_id) ?? 0) + 1);
  return {
    countries: (countriesRes.data ?? []) as AdminCountry[],
    tags: ((tagsRes.data ?? []) as Omit<AdminTag, "usage">[]).map((tag) => ({ ...tag, usage: usage.get(tag.id) ?? 0 })),
  };
}

export async function getCalendarReferenceData(): Promise<{ countries: AdminCountry[]; tags: AdminTag[] }> {
  const { admin } = await requireAdmin();
  return loadReferenceData(admin);
}

export async function getCalendarAdminOverview(params: { scope?: string; year?: number }): Promise<CalendarAdminOverview> {
  const { admin } = await requireAdmin();
  const currentYear = new Date().getUTCFullYear();
  const year = params.year && Number.isInteger(params.year) && params.year >= 1900 && params.year <= 2198 ? params.year : currentYear;
  const scope = params.scope && (params.scope === GLOBAL_SCOPE || /^[A-Z]{2}$/.test(params.scope)) ? params.scope : "HU";

  const { countries, tags } = await loadReferenceData(admin);
  const base = admin.from("ref_calendar_periods").select(PERIOD_COLUMNS).order("key");
  const { data: periodRows } = await (scope === GLOBAL_SCOPE ? base.is("country_code", null) : base.eq("country_code", scope)).returns<PeriodRow[]>();
  const periods = (periodRows ?? []).map(toAdminPeriod);

  const ids = periods.map((p) => p.id);
  const occurrences: AdminOccurrence[] = [];
  // A PostgREST URL-hossza miatt kötegelve.
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await admin
      .from("ref_calendar_occurrences")
      .select(OCCURRENCE_COLUMNS)
      .in("period_id", ids.slice(i, i + 100))
      .gte("year", year - 1)
      .lte("year", year + 1)
      .returns<AdminOccurrence[]>();
    occurrences.push(...(data ?? []));
  }

  const missing = missingYears(
    periods.map((p) => ({ id: p.id, periodType: p.period_type, ruleKind: p.rule_kind, oneOff: p.rule_params?.one_off === true, status: p.status })),
    occurrences.map((o) => ({ periodId: o.period_id, year: o.year })),
    [year, year + 1],
  );
  const ahead = await yearsAhead(admin);
  return {
    countries,
    tags,
    scope,
    year,
    periods: periods.map((p) => ({
      ...p,
      occurrence: occurrences.find((o) => o.period_id === p.id && o.year === year) ?? null,
      missingYears: missing.get(p.id) ?? [],
    })),
    unverifiedCount: occurrences.filter((o) => o.year === year && o.status === "entered").length,
    generateRange: { from: currentYear, to: currentYear + ahead },
  };
}

export async function getCalendarPeriodDetail(id: string): Promise<{ period: AdminPeriod; occurrences: AdminOccurrence[] } | null> {
  const { admin } = await requireAdmin();
  if (!UUID_RE.test(id)) return null;
  const { data } = await admin.from("ref_calendar_periods").select(PERIOD_COLUMNS).eq("id", id).maybeSingle<PeriodRow>();
  if (!data) return null;
  const { data: occ } = await admin
    .from("ref_calendar_occurrences")
    .select(OCCURRENCE_COLUMNS)
    .eq("period_id", id)
    .order("year", { ascending: false })
    .returns<AdminOccurrence[]>();
  return { period: toAdminPeriod(data), occurrences: occ ?? [] };
}

// ─── Definíciók ───────────────────────────────────────────────────────────────

export async function saveCalendarPeriod(input: unknown): Promise<ActionResult<{ id: string; generated: number }>> {
  const { admin, user } = await requireAdmin();
  const parsed = periodInputSchema.safeParse(input);
  if (!parsed.success) {
    const ruleIssue = parsed.error.issues.some((issue) => issue.message === "ruleInvalid");
    return { ok: false, error: ruleIssue ? "ruleInvalid" : "validationFailed" };
  }
  const v = parsed.data;
  const description: Record<string, string> = {};
  if (v.descriptionHu) description.hu = v.descriptionHu;
  if (v.descriptionEn) description.en = v.descriptionEn;
  const payload = {
    description_localized: Object.keys(description).length ? description : null,
    period_type: v.periodType,
    country_code: v.countryCode,
    subdivision_code: v.subdivisionCode,
    hemisphere: v.hemisphere,
    rule_kind: v.ruleKind,
    rule_params: v.ruleKind === "explicit" ? (v.ruleParams.one_off === true ? { one_off: true } : {}) : v.ruleParams,
    duration_days: v.ruleKind === "explicit" ? null : v.durationDays,
    is_day_off: v.isDayOff,
    source_text: v.sourceText,
    source_url: v.sourceUrl,
    status: v.status,
    updated_by: user.id,
  };

  let id: string;
  if (v.id) {
    // A kulcs nem módosítható (trigger is védi); a natív nyelvű név megmarad.
    const { data: existing } = await admin.from("ref_calendar_periods").select("label_localized").eq("id", v.id).maybeSingle();
    if (!existing) return { ok: false, error: "notFound" };
    const label = { ...(existing.label_localized as LocalizedLabel), hu: v.labelHu, en: v.labelEn };
    const { error } = await admin.from("ref_calendar_periods").update({ ...payload, label_localized: label }).eq("id", v.id);
    if (error) return { ok: false, error: dbError(error) };
    id = v.id;
  } else {
    const { data, error } = await admin
      .from("ref_calendar_periods")
      .insert({ ...payload, key: v.key, label_localized: { hu: v.labelHu, en: v.labelEn } })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: dbError(error) };
    id = data.id as string;
  }

  // Címkék szinkronizálása
  const { data: currentTags } = await admin.from("ref_calendar_period_tags").select("tag_id").eq("period_id", id);
  const current = new Set((currentTags ?? []).map((t) => t.tag_id as string));
  const wanted = new Set(v.tagIds);
  const toRemove = [...current].filter((tagId) => !wanted.has(tagId));
  const toAdd = [...wanted].filter((tagId) => !current.has(tagId));
  if (toRemove.length) {
    const { error } = await admin.from("ref_calendar_period_tags").delete().eq("period_id", id).in("tag_id", toRemove);
    if (error) return { ok: false, error: "saveFailed" };
  }
  if (toAdd.length) {
    const { error } = await admin
      .from("ref_calendar_period_tags")
      .upsert(toAdd.map((tagId) => ({ period_id: id, tag_id: tagId })), { onConflict: "period_id,tag_id", ignoreDuplicates: true });
    if (error) return { ok: false, error: dbError(error, "validationFailed") };
  }

  // FR-M23-004 1.: szabályalapú definíciónál a folyó évre és a következő évekre generál.
  let generated = 0;
  if (v.ruleKind !== "explicit" && v.status === "active") {
    const from = new Date().getUTCFullYear();
    const { data } = await admin.rpc("calendar_generate_occurrences", {
      p_from_year: from,
      p_to_year: from + (await yearsAhead(admin)),
      p_period_id: id,
    });
    generated = Number(data ?? 0);
  }
  await audit(admin, user.id, v.id ? "calendar.period.update" : "calendar.period.create", id, { key: v.key });
  revalidatePath(ADMIN_PATH, "layout");
  return { ok: true, data: { id, generated } };
}

export async function setCalendarPeriodStatus(id: string, status: "active" | "inactive"): Promise<ActionResult> {
  const { admin, user } = await requireAdmin();
  if (!UUID_RE.test(id) || (status !== "active" && status !== "inactive")) return { ok: false, error: "validationFailed" };
  const { data, error } = await admin.from("ref_calendar_periods").update({ status, updated_by: user.id }).eq("id", id).select("id");
  if (error) return { ok: false, error: "saveFailed" };
  if (!data?.length) return { ok: false, error: "notFound" };
  await audit(admin, user.id, `calendar.period.${status}`, id);
  revalidatePath(ADMIN_PATH, "layout");
  return { ok: true, data: null };
}

export async function generateCalendarOccurrences(params: { periodId?: string } = {}): Promise<ActionResult<{ count: number }>> {
  const { admin, user } = await requireAdmin();
  if (params.periodId && !UUID_RE.test(params.periodId)) return { ok: false, error: "validationFailed" };
  const from = new Date().getUTCFullYear();
  const { data, error } = await admin.rpc("calendar_generate_occurrences", {
    p_from_year: from,
    p_to_year: from + (await yearsAhead(admin)),
    p_period_id: params.periodId ?? null,
  });
  if (error) return { ok: false, error: "saveFailed" };
  await audit(admin, user.id, "calendar.occurrences.generate", params.periodId ?? null, { count: data });
  revalidatePath(ADMIN_PATH, "layout");
  return { ok: true, data: { count: Number(data ?? 0) } };
}

// ─── Előfordulások ────────────────────────────────────────────────────────────

export async function saveCalendarOccurrence(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { admin, user } = await requireAdmin();
  const parsed = occurrenceInputSchema.safeParse(input);
  if (!parsed.success) {
    const rangeIssue = parsed.error.issues.some((issue) => issue.message === "invalidRange");
    return { ok: false, error: rangeIssue ? "invalidRange" : "validationFailed" };
  }
  const v = parsed.data;
  const payload = {
    year: Number(v.earliest.slice(0, 4)),
    earliest: v.earliest,
    latest: v.latest,
    source_note: v.sourceNote,
    // A kézi felvitel és módosítás ellenőrzésig nem publikus (FR-M23-004 3., NyK-05).
    status: "entered" as const,
    verified_by: null,
    verified_at: null,
  };
  let id: string;
  if (v.id) {
    const { data, error } = await admin.from("ref_calendar_occurrences").update(payload).eq("id", v.id).eq("period_id", v.periodId).select("id");
    if (error) return { ok: false, error: dbError(error, "yearExists") };
    if (!data?.length) return { ok: false, error: "notFound" };
    id = v.id;
  } else {
    const { data, error } = await admin.from("ref_calendar_occurrences").insert({ ...payload, period_id: v.periodId }).select("id").single();
    if (error || !data) return { ok: false, error: dbError(error, "yearExists") };
    id = data.id as string;
  }
  await audit(admin, user.id, v.id ? "calendar.occurrence.update" : "calendar.occurrence.create", id);
  revalidatePath(ADMIN_PATH, "layout");
  return { ok: true, data: { id } };
}

export async function verifyCalendarOccurrence(id: string): Promise<ActionResult> {
  const { admin, user } = await requireAdmin();
  if (!UUID_RE.test(id)) return { ok: false, error: "validationFailed" };
  const { data, error } = await admin
    .from("ref_calendar_occurrences")
    .update({ status: "verified", verified_by: user.id, verified_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: "saveFailed" };
  if (!data?.length) return { ok: false, error: "notFound" };
  await audit(admin, user.id, "calendar.occurrence.verify", id);
  revalidatePath(ADMIN_PATH, "layout");
  return { ok: true, data: null };
}

export async function deleteCalendarOccurrence(id: string): Promise<ActionResult> {
  const { admin, user } = await requireAdmin();
  if (!UUID_RE.test(id)) return { ok: false, error: "validationFailed" };
  const { data, error } = await admin.from("ref_calendar_occurrences").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: "saveFailed" };
  if (!data?.length) return { ok: false, error: "notFound" };
  await audit(admin, user.id, "calendar.occurrence.delete", id);
  revalidatePath(ADMIN_PATH, "layout");
  return { ok: true, data: null };
}

// ─── Címkék ───────────────────────────────────────────────────────────────────

export async function saveCalendarTag(input: unknown): Promise<ActionResult<{ id: string }>> {
  const { admin, user } = await requireAdmin();
  const parsed = tagInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validationFailed" };
  const v = parsed.data;
  const payload = {
    label_localized: { hu: v.labelHu, en: v.labelEn },
    icon_key: v.iconKey,
    color_token: v.colorToken,
    sort_order: v.sortOrder,
    status: v.status,
    updated_by: user.id,
  };
  let id: string;
  if (v.id) {
    // A kulcs nem módosítható: az UPDATE nem írja.
    const { data, error } = await admin.from("ref_calendar_tags").update(payload).eq("id", v.id).select("id");
    if (error) return { ok: false, error: dbError(error) };
    if (!data?.length) return { ok: false, error: "notFound" };
    id = v.id;
  } else {
    const { data, error } = await admin.from("ref_calendar_tags").insert({ ...payload, key: v.key }).select("id").single();
    if (error || !data) return { ok: false, error: dbError(error) };
    id = data.id as string;
  }
  await audit(admin, user.id, v.id ? "calendar.tag.update" : "calendar.tag.create", id, { key: v.key });
  revalidatePath(ADMIN_PATH, "layout");
  return { ok: true, data: { id } };
}
