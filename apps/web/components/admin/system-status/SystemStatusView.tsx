"use client";
/**
 * M151 — `/admin/system` tartalma (spec K-3, K-4, K-6).
 * Terv: design/D15_Admin.pen#ihHfu (1440) · #oDiPb (390) · sor #O6xN8 · címke #BuaVg
 */
import type { TranslationKey } from "@uat/i18n";
import { Icon } from "@/components/Icon";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { CheckResult } from "@/lib/system-status/types";
import {
  CHECK_ICON,
  CHECK_LAYOUT,
  affectedNames,
  checkValueText,
  cronStatusText,
  formatClock,
  formatWhen,
  type DisplayState,
} from "./format";
import { STATE_STYLE, StatusChip } from "./StatusChip";
import { useSystemStatus } from "./useSystemStatus";

export function SystemStatusView() {
  const { t, locale } = useTranslation();
  const { data, failed, checking, recheck } = useSystemStatus();
  const byKey = new Map<string, CheckResult>((data?.checks ?? []).map((c) => [c.key, c]));
  const overallState: DisplayState = data ? data.overall.state : "wait";
  const os = STATE_STYLE[overallState];
  const time = data ? formatClock(data.checkedAt, locale) : null;

  const overallTitle = !data
    ? t("admin.system.loading")
    : data.overall.state === "ok"
      ? t("admin.system.overall.ok")
      : data.overall.state === "warn"
        ? t("admin.system.overall.warn", { count: data.overall.warn + data.overall.down })
        : t("admin.system.overall.down", {
            names: affectedNames(data.checks.filter((c) => c.critical && c.state === "down").map((c) => c.key), t),
          });
  const overallSub = !data
    ? t("admin.system.loadingSub")
    : data.overall.state === "ok"
      ? t("admin.system.summaryOk", { ok: data.overall.ok, total: data.overall.total })
      : t("admin.system.summaryIssue", { ok: data.overall.ok, total: data.overall.total, names: affectedNames(data.overall.affected, t) });

  return (
    <div className="space-y-6">
      {/* Fejléc — cím, utolsó ellenőrzés, kézi ellenőrzés */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t("admin.system.title")}</h1>
          <p className="mt-1 hidden text-sm text-ink-muted md:block">{t("admin.system.lead")}</p>
          <p className="mt-1 text-xs text-ink-muted md:hidden">
            {time ? `${t("admin.system.lastCheck", { time })} · ${t("admin.system.autoRefresh")}` : t("admin.system.autoRefresh")}
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          {time && <p className="hidden text-sm text-ink-muted md:block">{t("admin.system.lastCheck", { time })}</p>}
          <button
            type="button"
            onClick={() => void recheck()}
            disabled={checking}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-canvas disabled:cursor-wait disabled:opacity-70 md:w-auto"
          >
            <Icon name="refresh-cw" size={16} className={checking ? "motion-safe:animate-spin" : undefined} />
            {checking ? t("admin.system.rechecking") : t("admin.system.recheck")}
          </button>
        </div>
      </header>

      {/* Lekérési hiba: az utolsó ismert állapot marad (K-6) */}
      {failed && (
        <div role="alert" className="flex items-center gap-3 rounded-xl bg-[var(--color-warning-subtle)] px-4 py-3 text-sm text-amber-800">
          <Icon name="wifi-off" size={18} />
          <span>
            <span className="font-semibold">{t("admin.system.stale")}</span> —{" "}
            {time ? t("admin.system.staleSub", { time }) : t("admin.system.staleNever")}
          </span>
        </div>
      )}

      {/* Összesítő + verzió — a domináns régió */}
      <section className={`flex flex-col gap-5 rounded-2xl p-5 md:flex-row md:items-center md:gap-8 md:px-7 md:py-6 ${os.soft}`}>
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface md:h-14 md:w-14 md:rounded-2xl ${os.iconColor}`}>
            <Icon
              name={data ? (data.overall.state === "ok" ? "activity" : os.icon) : "loader-2"}
              size={26}
              className={!data ? "motion-safe:animate-spin" : undefined}
            />
          </span>
          <div className="min-w-0">
            <p className="text-xl font-bold text-ink md:text-[28px] md:leading-tight" role="status" aria-live="polite">
              {overallTitle}
            </p>
            <p className="mt-1 text-sm text-ink-body">{overallSub}</p>
          </div>
        </div>
        {data && (
          <div className="border-t border-line pt-3 md:w-[360px] md:shrink-0 md:border-l md:border-t-0 md:pl-7 md:pt-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{t("admin.system.version.label")}</p>
            {data.version.commitSha ? (
              <>
                <p className="font-mono text-base font-semibold text-ink">{data.version.commitSha}</p>
                {data.version.commitMessage && <p className="text-xs text-ink-body">{data.version.commitMessage}</p>}
              </>
            ) : (
              <p className="text-xs text-ink-body">{t("admin.system.version.local")}</p>
            )}
            <p className="text-xs text-ink-muted">{[data.version.environment, data.version.region].filter(Boolean).join(" · ")}</p>
          </div>
        )}
      </section>

      {/* Ellenőrzések csoportonként — asztalon egy panel, mobilon csoportonként egy kártya (#oDiPb) */}
      <div className="space-y-4 md:space-y-0 md:rounded-2xl md:border md:border-line md:bg-surface md:px-7 md:pb-4 md:pt-2">
        {CHECK_LAYOUT.map(({ group, keys }) => (
          <section
            key={group}
            aria-labelledby={`sys-group-${group}`}
            className="rounded-2xl border border-line bg-surface px-4 py-1 md:rounded-none md:border-0 md:bg-transparent md:px-0 md:pt-4"
          >
            <h2 id={`sys-group-${group}`} className="pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted md:pt-0">
              {t(`admin.system.groups.${group}` as TranslationKey)}
            </h2>
            <ul className="divide-y divide-line">
              {keys.map((key) => {
                const check = byKey.get(key);
                const st: DisplayState = check ? check.state : "wait";
                const value = check ? checkValueText(check, t, locale) : "";
                return (
                  <li key={key} className="py-3 md:py-3.5">
                    <div className="flex items-center gap-3 md:gap-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas text-ink-secondary md:h-9 md:w-9 md:rounded-[10px]">
                        <Icon name={CHECK_ICON[key]} size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">{t(`admin.system.checks.${key}.name` as TranslationKey)}</p>
                        <p className="hidden text-xs text-ink-muted md:block">{t(`admin.system.checks.${key}.desc` as TranslationKey)}</p>
                        {value && <p className="font-mono text-xs text-ink-muted md:hidden">{value}</p>}
                      </div>
                      {value && <p className="hidden max-w-[260px] truncate text-right font-mono text-xs text-ink-body md:block">{value}</p>}
                      <StatusChip state={st} label={t(`admin.system.state.${st}` as TranslationKey)} />
                    </div>
                    {key === "cron" && check?.cron && check.cron.length > 0 && (
                      <ul className="mt-2 space-y-1.5 pl-11 md:pl-[50px]">
                        {check.cron.map((job) => {
                          const jobState: DisplayState = !job.active ? "wait" : job.status === "failed" ? "warn" : job.status === "succeeded" ? "ok" : "wait";
                          const last = !job.active
                            ? t("admin.system.cron.inactive")
                            : job.startTime
                              ? t("admin.system.cron.lastRun", { time: formatWhen(job.startTime, locale), status: cronStatusText(job.status, t) })
                              : t("admin.system.cron.never");
                          return (
                            <li key={job.name} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATE_STYLE[jobState].dot}`} aria-hidden="true" />
                              <span className="font-mono text-ink-body md:w-60">{job.name}</span>
                              <span className="hidden font-mono text-ink-muted md:inline md:w-36">{job.schedule}</span>
                              <span className="text-ink-muted">{last}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <p className="text-xs text-ink-muted">{t("admin.system.footNote")}</p>
    </div>
  );
}
