/**
 * M151 — küszöbök és összesítés (tiszta függvények, I/O nélkül). Spec §3.
 */
import type { CheckResult, CheckState, CheckValue, CronJobStatus, OverallStatus } from "./types";

export const DB_SLOW_MS = 800;
export const FX_MAX_AGE_DAYS = 4;
export const EXTERNAL_TIMEOUT_MS = 4000;
export const DB_TIMEOUT_MS = 5000;

export function evaluateDatabase(ms: number | null, failed: boolean): { state: CheckState; value: CheckValue | null } {
  if (failed || ms === null) return { state: "down", value: { key: "unreachable" } };
  return { state: ms > DB_SLOW_MS ? "warn" : "ok", value: { key: "latency", params: { ms: Math.round(ms) } } };
}

/** Elvárt (a telepített kód migrációs fájljai) ↔ lefutott (éles adatbázis). Üres elvárt lista: nem ellenőrizhető, nem hiba. */
export function evaluateMigrations(
  expected: string[],
  applied: string[] | null,
): { state: CheckState; value: CheckValue } {
  if (applied === null) return { state: "down", value: { key: "queryFailed" } };
  const sortedApplied = [...applied].sort();
  const last = sortedApplied[sortedApplied.length - 1] ?? "—";
  if (expected.length === 0) return { state: "ok", value: { key: "migrationsUnknownExpected", params: { applied: applied.length, last } } };
  const appliedSet = new Set(applied);
  const missing = expected.filter((v) => !appliedSet.has(v)).sort();
  if (missing.length > 0) {
    return { state: "warn", value: { key: "migrationsMissing", params: { count: missing.length, list: missing.slice(0, 5).join(", ") } } };
  }
  return { state: "ok", value: { key: "migrationsAll", params: { applied: expected.length, total: expected.length, last } } };
}

export function evaluateCron(jobs: CronJobStatus[] | null): { state: CheckState; value: CheckValue } {
  if (jobs === null) return { state: "down", value: { key: "queryFailed" } };
  const active = jobs.filter((j) => j.active);
  const failed = active.filter((j) => j.status === "failed");
  if (failed.length > 0) {
    return { state: "warn", value: { key: "cronFailed", params: { failed: failed.length, total: active.length, names: failed.map((j) => j.name).join(", ") } } };
  }
  const ok = active.filter((j) => j.status === "succeeded").length;
  return { state: "ok", value: { key: "cronOk", params: { ok, total: active.length } } };
}

export interface FxRun {
  status: string;
  startedAt: string;
}

/** Az utolsó futás hibás → figyelmeztetés; az utolsó sikeres régebbi, mint 4 nap (hétvége + ünnep) → figyelmeztetés. */
export function evaluateFx(runs: FxRun[] | null, now: Date): { state: CheckState; value: CheckValue } {
  if (runs === null) return { state: "down", value: { key: "queryFailed" } };
  // fx_sync_runs.status: running | ok | partial | error (065). A futó sort átugorjuk.
  const finished = runs.filter((r) => r.status !== "running");
  if (finished.length === 0) return { state: "warn", value: { key: "fxNever" } };
  if (finished[0].status === "error") {
    return { state: "warn", value: { key: "fxLastFailed", params: { at: finished[0].startedAt } } };
  }
  const lastOk = finished.find((r) => r.status === "ok" || r.status === "partial");
  if (!lastOk) return { state: "warn", value: { key: "fxNever" } };
  const ageDays = (now.getTime() - new Date(lastOk.startedAt).getTime()) / 86_400_000;
  return { state: ageDays > FX_MAX_AGE_DAYS ? "warn" : "ok", value: { key: "fxLast", params: { at: lastOk.startedAt } } };
}

/** Külső szolgáltatás: kiesésnél csak figyelmeztetés, soha nem hiba (spec §3). */
export function evaluateExternal(httpStatus: number | null, ms: number | null): { state: CheckState; value: CheckValue } {
  if (httpStatus === null || ms === null) return { state: "warn", value: { key: "timeout" } };
  if (httpStatus < 200 || httpStatus >= 300) return { state: "warn", value: { key: "httpStatus", params: { status: httpStatus } } };
  return { state: "ok", value: { key: "latency", params: { ms: Math.round(ms) } } };
}

export function evaluateHttpCritical(httpStatus: number | null, ms: number | null): { state: CheckState; value: CheckValue } {
  if (httpStatus === null || ms === null) return { state: "down", value: { key: "unreachable" } };
  if (httpStatus < 200 || httpStatus >= 300) return { state: "down", value: { key: "httpStatus", params: { status: httpStatus } } };
  return { state: "ok", value: { key: "httpLatency", params: { status: httpStatus, ms: Math.round(ms) } } };
}

/** Hiba, ha kritikus ellenőrzés hibás; figyelmeztetés, ha bármi nincs rendben; különben rendben. */
export function summarize(checks: CheckResult[]): OverallStatus {
  const down = checks.filter((c) => c.state === "down").length;
  const warn = checks.filter((c) => c.state === "warn").length;
  const criticalDown = checks.some((c) => c.critical && c.state === "down");
  const state: CheckState = criticalDown ? "down" : down + warn > 0 ? "warn" : "ok";
  const affected = [
    ...checks.filter((c) => c.state === "down"),
    ...checks.filter((c) => c.state === "warn"),
  ].map((c) => c.key);
  return { state, ok: checks.length - down - warn, warn, down, total: checks.length, affected };
}

/** Buildkor rögzített lista (next.config → TREVU_EXPECTED_MIGRATIONS): „001,002,…”. */
export function parseExpectedMigrations(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
