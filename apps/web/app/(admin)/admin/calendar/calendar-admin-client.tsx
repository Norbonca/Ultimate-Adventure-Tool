"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { TranslationKey } from "@uat/i18n";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { localizedLabel } from "@/lib/calendar/period";
import { PERIOD_TYPES } from "@/lib/calendar/schemas";
import { generateCalendarOccurrences, type CalendarAdminOverview } from "./actions";
import { rangeText, ruleSummary, statusBadgeClass } from "./calendar-format";
import { TagsPanel } from "./tags-panel";

const GLOBAL_SCOPE = "_global";

export function CalendarAdminClient({ overview, initialTab }: { overview: CalendarAdminOverview; initialTab: "periods" | "tags" }) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<"periods" | "tags">(initialTab);
  const [typeFilter, setTypeFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const navigate = (next: { country?: string; year?: number; tab?: string }) => {
    const params = new URLSearchParams({
      country: next.country ?? overview.scope,
      year: String(next.year ?? overview.year),
    });
    if ((next.tab ?? tab) === "tags") params.set("tab", "tags");
    router.push(`${pathname}?${params.toString()}`);
  };

  const tagById = useMemo(() => new Map(overview.tags.map((tag) => [tag.id, tag])), [overview.tags]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return overview.periods
      .filter((p) => !typeFilter || p.period_type === typeFilter)
      .filter((p) => !tagFilter || p.tag_ids.includes(tagFilter))
      .filter((p) => !statusFilter || p.status === statusFilter)
      .filter((p) => !needle || p.key.includes(needle) || localizedLabel(p.label_localized, locale).toLowerCase().includes(needle))
      .sort((a, b) => (a.occurrence?.earliest ?? "9999").localeCompare(b.occurrence?.earliest ?? "9999") || a.key.localeCompare(b.key));
  }, [overview.periods, typeFilter, tagFilter, statusFilter, search, locale]);

  const missingCount = overview.periods.filter((p) => p.missingYears.length > 0).length;

  const handleGenerate = async () => {
    setBusy(true);
    const res = await generateCalendarOccurrences();
    setBusy(false);
    if (res.ok) {
      showToast(t("admin.calendar.messages.generated", { count: res.data.count }));
      router.refresh();
    } else {
      showToast(t(`errors.calendar.${res.error}` as TranslationKey), false);
    }
  };

  const years = Array.from({ length: 6 }, (_, i) => overview.generateRange.from - 1 + i);
  const inputCls = "text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400 bg-white";
  const tabCls = (active: boolean) =>
    `px-4 py-2 text-sm rounded-lg transition-colors ${active ? "bg-emerald-500 text-white" : "text-slate-600 hover:bg-slate-100"}`;

  return (
    <>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm text-white ${toast.ok ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center gap-2" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "periods"} className={tabCls(tab === "periods")} onClick={() => { setTab("periods"); navigate({ tab: "periods" }); }}>
          {t("admin.calendar.tabs.periods")}
        </button>
        <button type="button" role="tab" aria-selected={tab === "tags"} className={tabCls(tab === "tags")} onClick={() => { setTab("tags"); navigate({ tab: "tags" }); }}>
          {t("admin.calendar.tabs.tags")}
        </button>
      </div>

      {tab === "tags" ? (
        <TagsPanel tags={overview.tags} onToast={showToast} />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              {t("admin.calendar.filters.country")}
              <select className={inputCls} value={overview.scope} onChange={(e) => navigate({ country: e.target.value })}>
                {!overview.scope && <option value="">{t("admin.calendar.filters.chooseCountry")}</option>}
                {overview.countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {`${locale === "en" ? c.name_en : c.name_hu} (${c.code})${c.is_active ? "" : ` — ${t("admin.calendar.filters.inactiveCountry")}`}`}
                  </option>
                ))}
                <option value={GLOBAL_SCOPE}>{t("admin.calendar.filters.global")}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              {t("admin.calendar.filters.year")}
              <select className={inputCls} value={overview.year} onChange={(e) => navigate({ year: Number(e.target.value) })}>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              {t("admin.calendar.filters.type")}
              <select className={inputCls} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">{t("admin.calendar.filters.all")}</option>
                {PERIOD_TYPES.map((type) => (
                  <option key={type} value={type}>{t(`calendar.types.${type}` as TranslationKey)}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              {t("admin.calendar.filters.tag")}
              <select className={inputCls} value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
                <option value="">{t("admin.calendar.filters.all")}</option>
                {overview.tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>{localizedLabel(tag.label_localized, locale)}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              {t("admin.calendar.filters.status")}
              <select className={inputCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">{t("admin.calendar.filters.all")}</option>
                <option value="active">{t("admin.calendar.statuses.active")}</option>
                <option value="inactive">{t("admin.calendar.statuses.inactive")}</option>
              </select>
            </label>
            <input
              type="search"
              className={`${inputCls} flex-1 min-w-48`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.calendar.filters.search")}
              aria-label={t("admin.calendar.filters.search")}
            />
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={busy}
                className="px-3 py-2 text-sm border border-slate-200 text-slate-700 rounded-lg hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-50 transition-colors"
              >
                {busy ? t("admin.calendar.actions.working") : t("admin.calendar.actions.generate", overview.generateRange)}
              </button>
              <Link
                href={overview.scope && overview.scope !== GLOBAL_SCOPE ? `/admin/calendar/periods/new?country=${overview.scope}` : "/admin/calendar/periods/new"}
                className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                + {t("admin.calendar.actions.newPeriod")}
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{t("admin.calendar.summary.periods", { count: overview.periods.length })}</span>
            {missingCount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                {t("admin.calendar.summary.missingYears", { count: missingCount, year: overview.year, nextYear: overview.year + 1 })}
              </span>
            )}
            {overview.unverifiedCount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {t("admin.calendar.summary.unverified", { count: overview.unverifiedCount })}
              </span>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            {!overview.scope ? (
              <p className="text-sm text-slate-400 text-center py-10">{t("admin.calendar.summary.noCountry")}</p>
            ) : overview.periods.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">{t("admin.calendar.summary.noPeriods")}</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">{t("admin.calendar.summary.noResults")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    {(["dates", "name", "type", "rule", "occurrence", "tags", "status"] as const).map((col) => (
                      <th key={col} className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">
                        {t(`admin.calendar.columns.${col}` as TranslationKey)}
                      </th>
                    ))}
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {p.occurrence ? (
                          rangeText(p.occurrence, locale)
                        ) : p.missingYears.includes(overview.year) ? (
                          <span className="text-amber-600">{t("admin.calendar.summary.missing")}</span>
                        ) : (
                          <span className="text-slate-400">{t("admin.calendar.summary.noOccurrence")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{localizedLabel(p.label_localized, locale)}</p>
                        <p className="text-xs text-slate-400 font-mono">{p.key}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{t(`calendar.types.${p.period_type}` as TranslationKey)}</td>
                      <td className="px-4 py-3 text-slate-600">{ruleSummary(p, t, locale)}</td>
                      <td className="px-4 py-3">
                        {p.occurrence && (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass[p.occurrence.status]}`}>
                            {t(`calendar.occurrenceStatus.${p.occurrence.status}` as TranslationKey)}
                          </span>
                        )}
                        {p.missingYears.includes(overview.year + 1) && (
                          <p className="text-[11px] text-amber-600 mt-1">{`${overview.year + 1}: ${t("admin.calendar.summary.missing")}`}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {p.tag_ids.map((id) => {
                            const tag = tagById.get(id);
                            return tag ? (
                              <span key={id} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">{localizedLabel(tag.label_localized, locale)}</span>
                            ) : null;
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass[p.status]}`}>
                          {t(`admin.calendar.statuses.${p.status}` as TranslationKey)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/calendar/periods/${p.id}`}
                          className="px-2.5 py-1 text-xs border border-slate-200 text-slate-600 rounded-lg hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                        >
                          {t("admin.calendar.actions.edit")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  );
}
