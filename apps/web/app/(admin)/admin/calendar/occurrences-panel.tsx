"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TranslationKey } from "@uat/i18n";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  deleteCalendarOccurrence,
  generateCalendarOccurrences,
  saveCalendarOccurrence,
  verifyCalendarOccurrence,
  type AdminOccurrence,
  type AdminPeriod,
} from "./actions";
import { statusBadgeClass } from "./calendar-format";

interface OccurrenceForm {
  id?: string;
  earliest: string;
  latest: string;
  sourceNote: string;
}

/** M23 S7 — előfordulások felvitele, ellenőrzése, törlése (FR-M23-004). */
export function OccurrencesPanel({
  period,
  occurrences,
  onToast,
}: {
  period: AdminPeriod;
  occurrences: AdminOccurrence[];
  onToast: (msg: string, ok?: boolean) => void;
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [form, setForm] = useState<OccurrenceForm | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const fail = (error: string) => onToast(t(`errors.calendar.${error}` as TranslationKey), false);
  const done = (message: string) => {
    onToast(message);
    router.refresh();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setBusy("form");
    const res = await saveCalendarOccurrence({ ...form, periodId: period.id, sourceNote: form.sourceNote });
    setBusy(null);
    if (res.ok) {
      setForm(null);
      done(t("admin.calendar.messages.saved"));
    } else fail(res.error);
  };

  const verify = async (id: string) => {
    setBusy(id);
    const res = await verifyCalendarOccurrence(id);
    setBusy(null);
    if (res.ok) done(t("admin.calendar.messages.verified"));
    else fail(res.error);
  };

  const remove = async (id: string) => {
    if (!confirm(t("admin.calendar.editor.deleteConfirm"))) return;
    setBusy(id);
    const res = await deleteCalendarOccurrence(id);
    setBusy(null);
    if (res.ok) done(t("admin.calendar.messages.deleted"));
    else fail(res.error);
  };

  const generate = async () => {
    setBusy("generate");
    const res = await generateCalendarOccurrences({ periodId: period.id });
    setBusy(null);
    if (res.ok) done(t("admin.calendar.messages.generated", { count: res.data.count }));
    else fail(res.error);
  };

  const dateTime = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "hu-HU", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(iso)) : "";
  const inputCls = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400 bg-white";
  const btn = "px-2.5 py-1 text-xs border rounded-lg disabled:opacity-50 transition-colors";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{t("admin.calendar.editor.occurrencesTitle")}</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">{t("admin.calendar.editor.occurrencesHint")}</p>
        </div>
        <div className="flex gap-2">
          {period.rule_kind !== "explicit" && (
            <button
              type="button"
              onClick={generate}
              disabled={busy !== null || period.status !== "active"}
              className="px-3 py-2 text-sm border border-slate-200 text-slate-700 rounded-lg hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-50 transition-colors"
            >
              {busy === "generate" ? t("admin.calendar.actions.working") : t("admin.calendar.actions.generateThis")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setForm({ earliest: "", latest: "", sourceNote: "" })}
            className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            + {t("admin.calendar.actions.addOccurrence")}
          </button>
        </div>
      </div>

      {form && (
        <form onSubmit={submit} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            {t("admin.calendar.columns.earliest")}
            <input
              type="date"
              required
              className={inputCls}
              value={form.earliest}
              onChange={(e) => setForm((f) => (f ? { ...f, earliest: e.target.value, latest: f.latest || e.target.value } : f))}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            {t("admin.calendar.columns.latest")}
            <input type="date" required min={form.earliest} className={inputCls} value={form.latest} onChange={(e) => setForm((f) => (f ? { ...f, latest: e.target.value } : f))} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 md:col-span-2">
            {t("admin.calendar.columns.sourceNote")}
            <input className={inputCls} value={form.sourceNote} onChange={(e) => setForm((f) => (f ? { ...f, sourceNote: e.target.value } : f))} />
          </label>
          <div className="md:col-span-4 flex justify-end gap-2">
            <button type="button" onClick={() => setForm(null)} className="px-3 py-2 text-sm border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
              {t("admin.calendar.actions.cancel")}
            </button>
            <button type="submit" disabled={busy === "form"} className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors">
              {t("admin.calendar.actions.save")}
            </button>
          </div>
        </form>
      )}

      {occurrences.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">{t("admin.calendar.editor.noOccurrences")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                {(["year", "earliest", "latest", "occurrence", "sourceNote", "verifiedAt"] as const).map((col) => (
                  <th key={col} className="px-3 py-2 font-medium text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">
                    {t(`admin.calendar.columns.${col}` as TranslationKey)}
                  </th>
                ))}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {occurrences.map((o) => (
                <tr key={o.id}>
                  <td className="px-3 py-2 text-slate-700">{o.year}</td>
                  <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{o.earliest}</td>
                  <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{o.latest}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass[o.status]}`}>
                      {t(`calendar.occurrenceStatus.${o.status}` as TranslationKey)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 max-w-sm">{o.source_note}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{dateTime(o.verified_at)}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      {o.status === "entered" && (
                        <button type="button" disabled={busy === o.id} onClick={() => verify(o.id)} className={`${btn} border-emerald-300 text-emerald-700 hover:bg-emerald-50`}>
                          {t("admin.calendar.actions.verify")}
                        </button>
                      )}
                      {o.status !== "generated" && (
                        <button
                          type="button"
                          onClick={() => setForm({ id: o.id, earliest: o.earliest, latest: o.latest, sourceNote: o.source_note ?? "" })}
                          className={`${btn} border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-600`}
                        >
                          {t("admin.calendar.actions.edit")}
                        </button>
                      )}
                      <button type="button" disabled={busy === o.id} onClick={() => remove(o.id)} className={`${btn} border-red-200 text-red-600 hover:bg-red-50`}>
                        {t("admin.calendar.actions.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
