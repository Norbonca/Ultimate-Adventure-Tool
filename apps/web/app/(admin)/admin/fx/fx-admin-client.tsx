"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Toggle } from "@/components/ui/Toggle";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { syncFxNow, updateFxSource, type fetchFxAdminData } from "./actions";

type Data = Awaited<ReturnType<typeof fetchFxAdminData>>;

export function FxAdminClient({ data, locale }: { data: Data; locale: string }) {
  const { t } = useTranslation();
  const tr = t as (k: string, p?: Record<string, string | number>) => string;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString(locale === "en" ? "en-GB" : "hu-HU", { dateStyle: "short", timeStyle: "short" }) : "—");

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: tr(`admin.fx.errors.${r.error}`) });
      router.refresh();
    });

  return (
    <div className="mt-6 space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <p className="text-sm font-semibold text-slate-900">{t("admin.fx.latest")}</p>
          <p className="text-sm text-slate-600">{data.latestDate ? tr("admin.fx.latestValue", { date: data.latestDate, count: data.latestCount }) : t("admin.fx.none")}</p>
        </div>
        <button type="button" disabled={pending} onClick={() => act(syncFxNow, t("admin.fx.syncStarted"))} className="inline-flex h-10 items-center gap-2 rounded-trevu bg-trevu-600 px-4 text-sm font-semibold text-white disabled:opacity-60" data-testid="fx-sync-now">
          <Icon name={pending ? "loader-2" : "refresh-cw"} size={16} className={pending ? "animate-spin" : ""} aria-hidden />{t("admin.fx.syncNow")}
        </button>
      </section>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-trevu-700" : "text-red-600"}`}>{msg.text}</p>}

      <section className="rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900">{t("admin.fx.sources")}</h2>
        <ul className="divide-y divide-slate-100">
          {data.sources.map((s) => (
            <li key={s.code} className="flex flex-wrap items-center gap-4 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{s.name} <span className="font-mono text-xs text-slate-400">{s.code}</span></p>
                <p className="text-xs text-slate-500">{s.notes ?? ""}{s.last_synced_at ? ` · ${tr("admin.fx.lastSync", { at: dt(s.last_synced_at) })}` : ""}</p>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                {t("admin.fx.priority")}
                <input type="number" min={1} max={999} defaultValue={s.priority} disabled={pending}
                  onBlur={(e) => { const v = Number(e.target.value); if (v !== s.priority) act(() => updateFxSource({ code: s.code, enabled: s.enabled, priority: v }), t("admin.fx.saved")); }}
                  className="h-9 w-20 rounded-trevu border border-slate-200 px-2 text-sm" />
              </label>
              <Toggle checked={s.enabled} disabled={pending} aria-label={tr("admin.fx.enable", { name: s.name })}
                onChange={(v) => act(() => updateFxSource({ code: s.code, enabled: v, priority: s.priority }), t("admin.fx.saved"))} />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900">{t("admin.fx.runs")}</h2>
        {data.runs.length === 0 ? <p className="px-5 py-4 text-sm text-slate-500">{t("admin.fx.noRuns")}</p> : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500"><tr><th className="px-5 py-2 font-medium">{t("admin.fx.colStarted")}</th><th className="px-2 py-2 font-medium">{t("admin.fx.colTrigger")}</th><th className="px-2 py-2 font-medium">{t("admin.fx.colStatus")}</th><th className="px-2 py-2 font-medium">{t("admin.fx.colRates")}</th><th className="px-5 py-2 font-medium">{t("admin.fx.colError")}</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.runs.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-2 text-slate-700">{dt(r.started_at)}</td>
                  <td className="px-2 py-2 text-slate-600">{r.triggered_by}</td>
                  <td className={`px-2 py-2 font-semibold ${r.status === "error" ? "text-red-600" : r.status === "ok" ? "text-trevu-700" : "text-slate-600"}`}>{r.status}</td>
                  <td className="px-2 py-2 font-mono text-slate-700">{r.rates_upserted}{r.rate_date ? ` · ${r.rate_date}` : ""}</td>
                  <td className="max-w-xs truncate px-5 py-2 text-xs text-slate-500">{r.error_message ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
