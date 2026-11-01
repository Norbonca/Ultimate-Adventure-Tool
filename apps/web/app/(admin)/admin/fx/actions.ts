"use server";
/**
 * Admin · Árfolyamok (rendszerspec §14.9, D15 yuhwh): források kapcsolása és sorrendje, „Szinkronizálás most”,
 * szinkron-napló. Az írás service role kliensen fut, a jogosultságot itt ellenőrizzük (calendar/actions.ts mintája).
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPlatformAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin-client";

export type FxAdminError = "validationFailed" | "saveFailed" | "throttled";
export type FxActionResult = { ok: true } | { ok: false; error: FxAdminError };

async function requireAdmin() {
  const user = await getPlatformAdmin();
  if (!user) redirect("/admin/login");
  return createAdminClient();
}

export async function fetchFxAdminData() {
  const admin = await requireAdmin();
  const [{ data: sources }, { data: runs }, { data: latest }] = await Promise.all([
    admin.from("fx_rate_sources").select("code, name, kind, base_url, enabled, priority, last_synced_at, notes").order("priority"),
    admin.from("fx_sync_runs").select("id, source_code, started_at, finished_at, status, rate_date, rates_upserted, error_message, triggered_by").order("started_at", { ascending: false }).limit(15),
    admin.from("exchange_rates").select("rate_date").eq("source", "ecb").order("rate_date", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const { count } = latest
    ? await admin.from("exchange_rates").select("id", { count: "exact", head: true }).eq("source", "ecb").eq("rate_date", latest.rate_date)
    : { count: 0 };
  return { sources: sources ?? [], runs: runs ?? [], latestDate: latest?.rate_date ?? null, latestCount: count ?? 0 };
}

const sourceSchema = z.object({ code: z.string().min(1).max(40), enabled: z.boolean(), priority: z.number().int().min(1).max(999) }).strict();

export async function updateFxSource(raw: unknown): Promise<FxActionResult> {
  const admin = await requireAdmin();
  const p = sourceSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: "validationFailed" };
  const { error } = await admin.from("fx_rate_sources").update({ enabled: p.data.enabled, priority: p.data.priority, updated_at: new Date().toISOString() }).eq("code", p.data.code);
  if (error) { console.error("updateFxSource:", error); return { ok: false, error: "saveFailed" }; }
  revalidatePath("/admin/fx");
  return { ok: true };
}

/** A 067 trigger_fx_sync()-et hívja (pg_net → Edge Function); az eredmény néhány mp múlva az fx_sync_runs-ban látszik. */
export async function syncFxNow(): Promise<FxActionResult> {
  const admin = await requireAdmin();
  const { error } = await admin.rpc("trigger_fx_sync", { p_triggered_by: "admin" });
  if (error) { console.error("syncFxNow:", error); return { ok: false, error: "saveFailed" }; }
  revalidatePath("/admin/fx");
  return { ok: true };
}
