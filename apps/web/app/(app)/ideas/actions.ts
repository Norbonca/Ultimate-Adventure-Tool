"use server";

/**
 * M22 Trip Ideas — szerveroldali műveletek (FR-M22-001, 005, 007, 011, 014). A láthatóságot és az
 * állapotátmeneteket az adatbázis (052: RLS + triggerek) is kikényszeríti; itt a validáció és a
 * hibakulcsok (`ideas.errors.*`). Minden válasz `{ ok, error? }` alakú.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { closeSchema, firstIssue, ideaInputSchema, joinSchema, offerSchema, renewSchema, reportSchema, type IdeaInput } from "@/lib/ideas/schemas";
import { autoYear, expiresAt, validateWindow, windowDates } from "@/lib/ideas/window";
import { resolveTripTimezone } from "@/lib/calendar/context";
import { findSimilarIdeas, getIdeaById } from "@/lib/ideas/queries";
import { z } from "zod";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; field?: string };

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[áàâä]/g, "a").replace(/[éèêë]/g, "e").replace(/[íìîï]/g, "i").replace(/[óòôöő]/g, "o").replace(/[úùûüű]/g, "u")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
  return `${base || "otlet"}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Postgres-hibakód → ideas.errors kulcs */
function dbError(message: string | undefined): string {
  const m = message ?? "";
  if (m.includes("daily_limit")) return "dailyLimit";
  if (m.includes("idea_not_joinable")) return "notJoinable";
  if (m.includes("owner_cannot_leave")) return "ownerCannotLeave";
  if (m.includes("offer_locked")) return "offerLocked";
  if (m.includes("invalid_transition") || m.includes("closed_reason_required")) return "invalidTransition";
  if (m.includes("idea_not_deletable")) return "notDeletable";
  if (m.includes("destination_max")) return "destinationMax";
  if (m.includes("invalid_country_code")) return "destinationRequired";
  if (m.includes("row-level security") || m.includes("42501")) return "forbidden";
  return "saveFailed";
}

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

async function ownerTimezone(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("timezone, country_code").eq("id", userId).maybeSingle();
  const p = (data ?? null) as { timezone?: string | null; country_code?: string | null } | null;
  let countryPrimary: string | null = null;
  if (p?.country_code) {
    const { data: c } = await supabase.from("ref_countries").select("primary_timezone").eq("code", p.country_code).maybeSingle();
    countryPrimary = ((c ?? null) as { primary_timezone?: string | null } | null)?.primary_timezone ?? null;
  }
  return resolveTripTimezone({ organizerChoice: p?.timezone ?? null, countryPrimaryTimezone: countryPrimary }).timezone;
}

function windowFields(input: Pick<IdeaInput, "window_start_month" | "window_end_month" | "window_year">, tz: string) {
  const year = input.window_year ?? autoYear(input.window_start_month, input.window_end_month);
  const w = { startMonth: input.window_start_month, endMonth: input.window_end_month, year };
  const err = validateWindow(w);
  if (err) return { ok: false as const, error: err };
  const { start, end } = windowDates(w);
  return { ok: true as const, fields: { window_start_month: w.startMonth, window_end_month: w.endMonth, window_year: year, window_start_date: start, window_end_date: end, expires_at: expiresAt(w, tz).toISOString(), timezone: tz } };
}

export async function createIdea(raw: unknown): Promise<Result<{ slug: string; id: string }>> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "forbidden" };
  const parsed = ideaInputSchema.safeParse(raw);
  if (!parsed.success) { const i = firstIssue(parsed.error); return { ok: false, error: i.key, field: i.field }; }
  const input = parsed.data;
  const tz = await ownerTimezone(supabase, user.id);
  const wf = windowFields(input, tz);
  if (!wf.ok) return { ok: false, error: wf.error, field: "window_end_month" };
  const slug = slugify(input.title);
  const { data: idea, error } = await supabase
    .from("trip_ideas")
    .insert({
      owner_id: user.id, slug, title: input.title, description: input.description ?? null, category_id: input.category_id,
      sub_discipline_id: input.sub_discipline_id ?? null, ...wf.fields, period_key: input.period_key ?? null,
      duration_min_days: input.duration_min_days ?? null, duration_max_days: input.duration_max_days ?? null,
      difficulty: input.difficulty ?? null, group_size_min: input.group_size_min ?? null, group_size_max: input.group_size_max ?? null,
      budget_amount: input.budget_amount ?? null, budget_currency: input.budget_currency ?? null,
      intent: input.intent, visibility: input.visibility, language: input.language, created_via: input.created_via,
    })
    .select("id, slug")
    .single();
  if (error || !idea) return { ok: false, error: dbError(error?.message) };
  const { error: dErr } = await supabase.from("trip_idea_destinations").insert(
    input.destinations.map((d, i) => ({ idea_id: idea.id, name: d.name, continent: d.continent ?? null, country_codes: d.country_codes, sort_order: i })),
  );
  if (dErr) {
    await supabase.from("trip_ideas").update({ deleted_at: new Date().toISOString() }).eq("id", idea.id);
    return { ok: false, error: dbError(dErr.message), field: "destinations" };
  }
  revalidatePath("/ideas");
  return { ok: true, slug: idea.slug, id: idea.id };
}

export async function updateIdea(ideaId: string, raw: unknown): Promise<Result<{ slug: string }>> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "forbidden" };
  const parsed = ideaInputSchema.safeParse(raw);
  if (!parsed.success) { const i = firstIssue(parsed.error); return { ok: false, error: i.key, field: i.field }; }
  const input = parsed.data;
  const existing = await getIdeaById(ideaId);
  if (!existing || existing.owner_id !== user.id) return { ok: false, error: "forbidden" };
  const wf = windowFields(input, existing.timezone || (await ownerTimezone(supabase, user.id)));
  if (!wf.ok) return { ok: false, error: wf.error, field: "window_end_month" };
  const { error } = await supabase
    .from("trip_ideas")
    .update({
      title: input.title, description: input.description ?? null, category_id: input.category_id, sub_discipline_id: input.sub_discipline_id ?? null,
      ...wf.fields, period_key: input.period_key ?? null,
      duration_min_days: input.duration_min_days ?? null, duration_max_days: input.duration_max_days ?? null, difficulty: input.difficulty ?? null,
      group_size_min: input.group_size_min ?? null, group_size_max: input.group_size_max ?? null,
      budget_amount: input.budget_amount ?? null, budget_currency: input.budget_currency ?? null,
      intent: input.intent, visibility: input.visibility, language: input.language,
    })
    .eq("id", ideaId);
  if (error) return { ok: false, error: dbError(error.message) };
  await supabase.from("trip_idea_destinations").delete().eq("idea_id", ideaId);
  const { error: dErr } = await supabase.from("trip_idea_destinations").insert(
    input.destinations.map((d, i) => ({ idea_id: ideaId, name: d.name, continent: d.continent ?? null, country_codes: d.country_codes, sort_order: i })),
  );
  if (dErr) return { ok: false, error: dbError(dErr.message), field: "destinations" };
  revalidatePath(`/ideas/${existing.slug}`); revalidatePath("/ideas");
  return { ok: true, slug: existing.slug };
}

export async function closeIdea(raw: unknown): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "forbidden" };
  const parsed = closeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { error } = await supabase.from("trip_ideas").update({ status: "closed", closed_reason: parsed.data.reason }).eq("id", parsed.data.idea_id).eq("owner_id", user.id);
  if (error) return { ok: false, error: dbError(error.message) };
  revalidatePath("/ideas"); revalidatePath("/ideas/mine");
  return { ok: true };
}

/** A lezárás visszavonása (Norbert, 2026-10-31: a lezárt ötlet visszaállítható) — a trigger újraszámolja az állapotot. */
export async function reopenIdea(ideaId: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "forbidden" };
  const { error } = await supabase.from("trip_ideas").update({ status: "open" }).eq("id", ideaId).eq("owner_id", user.id);
  if (error) return { ok: false, error: dbError(error.message) };
  await supabase.rpc("trip_idea_recompute", { p_idea_id: ideaId });
  revalidatePath("/ideas"); revalidatePath("/ideas/mine");
  return { ok: true };
}

/** Megújítás lejárt ötletnél (FR-M22-011 3.): új időablak, utána nyitott. */
export async function renewIdea(raw: unknown): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "forbidden" };
  const parsed = renewSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const existing = await getIdeaById(parsed.data.idea_id);
  if (!existing || existing.owner_id !== user.id) return { ok: false, error: "forbidden" };
  const wf = windowFields(parsed.data, existing.timezone);
  if (!wf.ok) return { ok: false, error: wf.error, field: "window_end_month" };
  const { error } = await supabase.from("trip_ideas").update({ ...wf.fields, status: "open" }).eq("id", existing.id);
  if (error) return { ok: false, error: dbError(error.message) };
  await supabase.rpc("trip_idea_recompute", { p_idea_id: existing.id });
  revalidatePath(`/ideas/${existing.slug}`); revalidatePath("/ideas");
  return { ok: true };
}

export async function deleteIdea(ideaId: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "forbidden" };
  const { error } = await supabase.from("trip_ideas").update({ deleted_at: new Date().toISOString() }).eq("id", ideaId).eq("owner_id", user.id);
  if (error) return { ok: false, error: dbError(error.message) };
  revalidatePath("/ideas"); revalidatePath("/ideas/mine");
  return { ok: true };
}

export async function joinIdea(raw: unknown): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "forbidden" };
  const parsed = joinSchema.safeParse(raw);
  if (!parsed.success) { const i = firstIssue(parsed.error); return { ok: false, error: i.key, field: i.field }; }
  const d = parsed.data;
  const { error } = await supabase.from("trip_idea_members").upsert(
    { idea_id: d.idea_id, user_id: user.id, status: "active", note: d.note ?? null, preferred_months: d.preferred_months, is_anonymous: d.is_anonymous, party_size: d.party_size, joined_via: d.joined_via },
    { onConflict: "idea_id,user_id" },
  );
  if (error) return { ok: false, error: dbError(error.message) };
  revalidatePath("/ideas");
  return { ok: true };
}

export async function leaveIdea(ideaId: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "forbidden" };
  const { error } = await supabase.from("trip_idea_members").update({ status: "left" }).eq("idea_id", ideaId).eq("user_id", user.id);
  if (error) return { ok: false, error: dbError(error.message) };
  revalidatePath("/ideas");
  return { ok: true };
}

export async function offerIdea(raw: unknown): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "forbidden" };
  const parsed = offerSchema.safeParse(raw);
  if (!parsed.success) { const i = firstIssue(parsed.error); return { ok: false, error: i.key, field: i.field }; }
  const d = parsed.data;
  const { error } = await supabase.from("trip_idea_organizer_offers").upsert(
    { idea_id: d.idea_id, organizer_id: user.id, status: "active", message: d.message ?? null, planned_months: d.planned_months },
    { onConflict: "idea_id,organizer_id" },
  );
  if (error) return { ok: false, error: dbError(error.message) };
  revalidatePath("/ideas");
  return { ok: true };
}

export async function withdrawOffer(ideaId: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "forbidden" };
  const { error } = await supabase.from("trip_idea_organizer_offers").update({ status: "withdrawn" }).eq("idea_id", ideaId).eq("organizer_id", user.id);
  if (error) return { ok: false, error: dbError(error.message) };
  revalidatePath("/ideas");
  return { ok: true };
}

export async function reportIdea(raw: unknown): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "forbidden" };
  const parsed = reportSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { error } = await supabase.from("trip_idea_reports").insert({ idea_id: parsed.data.idea_id, reporter_id: user.id, reason: parsed.data.reason, details: parsed.data.details ?? null });
  if (error) return { ok: false, error: error.code === "23505" ? "alreadyReported" : dbError(error.message) };
  return { ok: true };
}

/** Ötlet–túra kapcsolat a túravázlat első mentésekor (FR-M22-008 3.); a hívó az M02 varázsló. */
export async function linkTripToIdea(ideaId: string, tripId: string): Promise<Result> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "forbidden" };
  const { error } = await supabase.from("trip_idea_trips").upsert({ idea_id: ideaId, trip_id: tripId, created_by: user.id }, { onConflict: "idea_id,trip_id", ignoreDuplicates: true });
  if (error) return { ok: false, error: dbError(error.message) };
  return { ok: true };
}

/** Hasonló ötletek az űrlaphoz (FR-M22-002), legfeljebb 3; csak a néző számára látható ötletek (RLS). */
export async function previewSimilarIdeas(raw: { category_id: string; country_codes: string[]; continents: string[]; start: string; end: string; excludeId?: string | null }) {
  const schema = z.object({ category_id: z.string().uuid(), country_codes: z.array(z.string().regex(/^[A-Z]{2}$/)).max(20), continents: z.array(z.string().max(20)).max(6), start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), excludeId: z.string().uuid().nullable().optional() });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return [];
  const items = await findSimilarIdeas(parsed.data);
  return items.map((i) => ({ id: i.id, slug: i.slug, title: i.title, member_count: i.member_count }));
}

/** A néző viszonya egy ötlethez (adatlap műveleteihez). */
export async function getMyIdeaRelation(ideaId: string): Promise<{ userId: string | null; member: { party_size: number; is_anonymous: boolean } | null; offered: boolean; reported: boolean }> {
  const { supabase, user } = await requireUser();
  if (!user) return { userId: null, member: null, offered: false, reported: false };
  const [m, o, r] = await Promise.all([
    supabase.from("trip_idea_members").select("party_size, is_anonymous").eq("idea_id", ideaId).eq("user_id", user.id).eq("status", "active").maybeSingle(),
    supabase.from("trip_idea_organizer_offers").select("id").eq("idea_id", ideaId).eq("organizer_id", user.id).eq("status", "active").maybeSingle(),
    supabase.from("trip_idea_reports").select("idea_id").eq("idea_id", ideaId).eq("reporter_id", user.id).maybeSingle(),
  ]);
  return { userId: user.id, member: (m.data as { party_size: number; is_anonymous: boolean } | null) ?? null, offered: !!o.data, reported: !!r.data };
}
