/**
 * M151 Rendszerállapot — az ellenőrzések futtatása (csak szerveren; service role kliens).
 * Spec: modules/15_Admin_Panel/151_System_Status/README.md §3 · terv: design/D15_Admin.pen#ihHfu
 * A hívó (API-route) felel a platform-admin jogosultságért.
 */
import { createAdminClient } from "@/lib/supabase/admin-client";
import { FRANKFURTER_STATUS_URL, NOMINATIM_STATUS_URL, EOX_STATUS_TILE_URL, STATUS_USER_AGENT } from "./endpoints";
import {
  DB_TIMEOUT_MS,
  EXTERNAL_TIMEOUT_MS,
  evaluateCron,
  evaluateDatabase,
  evaluateExternal,
  evaluateFx,
  evaluateHttpCritical,
  evaluateMigrations,
  parseExpectedMigrations,
  summarize,
  type FxRun,
} from "./evaluate";
import type { CheckResult, CronJobStatus, SystemStatus, VersionInfo } from "./types";

type AdminClient = ReturnType<typeof createAdminClient>;

async function timed<T>(fn: () => PromiseLike<T>, timeoutMs: number): Promise<{ result: T | null; ms: number | null; error: unknown }> {
  const started = performance.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      Promise.resolve(fn()),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
      }),
    ]);
    return { result, ms: performance.now() - started, error: null };
  } catch (error) {
    return { result: null, ms: null, error };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function httpProbe(url: string, init: RequestInit = {}, timeoutMs = EXTERNAL_TIMEOUT_MS) {
  const { result, ms } = await timed(
    () =>
      fetch(url, {
        ...init,
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "User-Agent": STATUS_USER_AGENT, ...(init.headers ?? {}) },
      }),
    timeoutMs + 200,
  );
  // A törzset nem olvassuk végig — csak az állapotkód és az idő kell.
  result?.body?.cancel().catch(() => {});
  return { status: result ? result.status : null, ms: result ? ms : null };
}

async function checkDatabase(admin: AdminClient): Promise<CheckResult> {
  const { result, ms } = await timed(() => admin.from("ref_countries").select("code").limit(1), DB_TIMEOUT_MS);
  const failed = !result || Boolean(result.error);
  if (result?.error) console.error("system-status database:", result.error.message);
  return { key: "database", group: "platform", critical: true, ...evaluateDatabase(ms, failed) };
}

async function checkAuth(): Promise<CheckResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { status, ms } = url ? await httpProbe(`${url}/auth/v1/health`, { headers: { apikey: anon ?? "" } }) : { status: null, ms: null };
  return { key: "auth", group: "platform", critical: true, ...evaluateHttpCritical(status, ms) };
}

async function checkStorage(admin: AdminClient): Promise<CheckResult> {
  const { result } = await timed(() => admin.storage.listBuckets(), DB_TIMEOUT_MS);
  if (!result || result.error) {
    if (result?.error) console.error("system-status storage:", result.error.message);
    return { key: "storage", group: "platform", critical: true, state: "down", value: { key: "unreachable" } };
  }
  return { key: "storage", group: "platform", critical: true, state: "ok", value: { key: "buckets", params: { count: result.data?.length ?? 0 } } };
}

interface RpcPayload {
  migrations: string[] | null;
  cron: Array<{ name: string; schedule: string; active: boolean; status: string | null; start_time: string | null }> | null;
}

async function checkMigrationsAndCron(admin: AdminClient): Promise<CheckResult[]> {
  const { result } = await timed(() => admin.rpc("admin_system_status"), DB_TIMEOUT_MS);
  const payload = result && !result.error ? (result.data as RpcPayload) : null;
  if (result?.error) console.error("system-status rpc:", result.error.message);
  const applied = payload?.migrations ?? null;
  const cron: CronJobStatus[] | null = payload?.cron
    ? payload.cron.map((j) => ({ name: j.name, schedule: j.schedule, active: j.active, status: j.status, startTime: j.start_time }))
    : null;
  const expected = parseExpectedMigrations(process.env.TREVU_EXPECTED_MIGRATIONS);
  return [
    { key: "migrations", group: "data", critical: false, ...evaluateMigrations(expected, applied) },
    { key: "cron", group: "data", critical: false, ...evaluateCron(cron), cron: cron ?? undefined },
  ];
}

async function checkFx(admin: AdminClient, now: Date): Promise<CheckResult> {
  const { result } = await timed(
    () => admin.from("fx_sync_runs").select("status, started_at").order("started_at", { ascending: false }).limit(10),
    DB_TIMEOUT_MS,
  );
  const runs: FxRun[] | null =
    result && !result.error ? (result.data ?? []).map((r) => ({ status: r.status as string, startedAt: r.started_at as string })) : null;
  return { key: "fx", group: "data", critical: false, ...evaluateFx(runs, now) };
}

async function checkExternal(key: "extFrankfurter" | "extNominatim" | "extEox", url: string): Promise<CheckResult> {
  const { status, ms } = await httpProbe(url);
  return { key, group: "external", critical: false, ...evaluateExternal(status, ms) };
}

export function readVersion(): VersionInfo {
  const message = process.env.VERCEL_GIT_COMMIT_MESSAGE?.split("\n")[0] ?? null;
  return {
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    commitMessage: message ? message.slice(0, 120) : null,
    region: process.env.VERCEL_REGION ?? null,
  };
}

export async function runSystemChecks(now = new Date()): Promise<SystemStatus> {
  const admin = createAdminClient();
  const [database, auth, storage, dataChecks, fx, frankfurter, nominatim, eox] = await Promise.all([
    checkDatabase(admin),
    checkAuth(),
    checkStorage(admin),
    checkMigrationsAndCron(admin),
    checkFx(admin, now),
    checkExternal("extFrankfurter", FRANKFURTER_STATUS_URL),
    checkExternal("extNominatim", NOMINATIM_STATUS_URL),
    checkExternal("extEox", EOX_STATUS_TILE_URL),
  ]);
  const app: CheckResult = { key: "app", group: "platform", critical: true, state: "ok", value: { key: "responding" } };
  const checks = [app, database, auth, storage, ...dataChecks, fx, frankfurter, nominatim, eox];
  return { checkedAt: now.toISOString(), overall: summarize(checks), version: readVersion(), checks };
}
