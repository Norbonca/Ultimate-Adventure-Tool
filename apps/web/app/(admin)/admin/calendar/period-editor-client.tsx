"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TranslationKey } from "@uat/i18n";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { localizedLabel } from "@/lib/calendar/period";
import { previewOccurrences, RULE_KINDS, validateRuleParams, type CalendarRule, type RuleKind } from "@/lib/calendar/rules";
import { PERIOD_TYPES, type PeriodType } from "@/lib/calendar/schemas";
import {
  saveCalendarPeriod,
  setCalendarPeriodStatus,
  type AdminCountry,
  type AdminOccurrence,
  type AdminPeriod,
  type AdminTag,
} from "./actions";
import { monthName, rangeText, WEEKDAY_KEYS } from "./calendar-format";
import { OccurrencesPanel } from "./occurrences-panel";

interface FormState {
  key: string;
  labelHu: string;
  labelEn: string;
  descriptionHu: string;
  descriptionEn: string;
  periodType: PeriodType;
  countryCode: string;
  subdivisionCode: string;
  hemisphere: "" | "north" | "south";
  ruleKind: RuleKind;
  month: number;
  day: number;
  hasEnd: boolean;
  endMonth: number;
  endDay: number;
  offset: number;
  easterCalendar: "western" | "orthodox";
  weekday: number;
  nth: number;
  oneOff: boolean;
  durationDays: string;
  isDayOff: boolean;
  sourceText: string;
  sourceUrl: string;
  status: "active" | "inactive";
  tagIds: string[];
}

function initialState(period: AdminPeriod | null, defaultCountry: string): FormState {
  const p = (period?.rule_params ?? {}) as Record<string, unknown>;
  const num = (key: string, fallback: number) => (typeof p[key] === "number" ? (p[key] as number) : fallback);
  return {
    key: period?.key ?? "",
    labelHu: period?.label_localized.hu ?? "",
    labelEn: period?.label_localized.en ?? "",
    descriptionHu: period?.description_localized?.hu ?? "",
    descriptionEn: period?.description_localized?.en ?? "",
    periodType: (period?.period_type as PeriodType) ?? "public_holiday",
    countryCode: period ? period.country_code ?? "" : defaultCountry,
    subdivisionCode: period?.subdivision_code ?? "",
    hemisphere: period?.hemisphere ?? "",
    ruleKind: period?.rule_kind ?? "fixed_annual",
    month: num("month", 1),
    day: num("day", 1),
    hasEnd: p.end_month !== undefined,
    endMonth: num("end_month", 1),
    endDay: num("end_day", 1),
    offset: num("offset", 0),
    easterCalendar: p.calendar === "orthodox" ? "orthodox" : "western",
    weekday: num("weekday", 1),
    nth: num("n", 1),
    oneOff: p.one_off === true,
    durationDays: period?.duration_days ? String(period.duration_days) : "",
    isDayOff: period?.is_day_off ?? true,
    sourceText: period?.source_text ?? "",
    sourceUrl: period?.source_url ?? "",
    status: period?.status ?? "active",
    tagIds: period?.tag_ids ?? [],
  };
}

function ruleParams(f: FormState): Record<string, unknown> {
  switch (f.ruleKind) {
    case "fixed_annual":
      return f.hasEnd ? { month: f.month, day: f.day, end_month: f.endMonth, end_day: f.endDay } : { month: f.month, day: f.day };
    case "easter_offset":
      return f.easterCalendar === "orthodox" ? { offset: f.offset, calendar: "orthodox" } : { offset: f.offset };
    case "nth_weekday":
      return { month: f.month, weekday: f.weekday, n: f.nth };
    default:
      return f.oneOff ? { one_off: true } : {};
  }
}

/** M23 S6 — időszak-definíció szerkesztő szabályelőnézettel (FR-M23-003). */
export function PeriodEditorClient(props: {
  countries: AdminCountry[];
  tags: AdminTag[];
  period: AdminPeriod | null;
  occurrences: AdminOccurrence[];
  defaultCountry: string;
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialState(props.period, props.defaultCountry));
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const isNew = !props.period;

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const params = ruleParams(form);
  const rule = { kind: form.ruleKind, params, durationDays: form.durationDays ? Number(form.durationDays) : null } as CalendarRule;
  const ruleValid = validateRuleParams(form.ruleKind, params);
  const preview = form.ruleKind === "explicit" || !ruleValid ? [] : previewOccurrences(rule, new Date().getUTCFullYear(), 3);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await saveCalendarPeriod({
      id: props.period?.id,
      key: form.key,
      labelHu: form.labelHu,
      labelEn: form.labelEn,
      descriptionHu: form.descriptionHu,
      descriptionEn: form.descriptionEn,
      periodType: form.periodType,
      countryCode: form.countryCode || null,
      subdivisionCode: form.subdivisionCode.trim().toUpperCase() || null,
      hemisphere: form.periodType === "season" && form.hemisphere ? form.hemisphere : null,
      ruleKind: form.ruleKind,
      ruleParams: params,
      durationDays: form.ruleKind !== "explicit" && form.durationDays ? Number(form.durationDays) : null,
      isDayOff: form.isDayOff,
      sourceText: form.sourceText,
      sourceUrl: form.sourceUrl.trim() || null,
      status: form.status,
      tagIds: form.tagIds,
    });
    setBusy(false);
    if (!res.ok) {
      showToast(t(`errors.calendar.${res.error}` as TranslationKey), false);
      return;
    }
    showToast(res.data.generated > 0 ? t("admin.calendar.messages.generated", { count: res.data.generated }) : t("admin.calendar.messages.saved"));
    if (isNew) router.push(`/admin/calendar/periods/${res.data.id}`);
    else router.refresh();
  };

  const handleStatus = async () => {
    if (!props.period) return;
    const next = props.period.status === "active" ? "inactive" : "active";
    if (next === "inactive" && !confirm(t("admin.calendar.editor.deactivateConfirm"))) return;
    setBusy(true);
    const res = await setCalendarPeriodStatus(props.period.id, next);
    setBusy(false);
    if (res.ok) {
      set("status", next);
      showToast(t("admin.calendar.messages.statusChanged"));
      router.refresh();
    } else {
      showToast(t(`errors.calendar.${res.error}` as TranslationKey), false);
    }
  };

  const inputCls = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400 bg-white disabled:bg-slate-100";
  const labelCls = "flex flex-col gap-1 text-xs font-medium text-slate-600";
  const section = "bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4";
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const numberInput = (key: "day" | "endDay" | "offset", label: TranslationKey, min: number, max: number) => (
    <label className={labelCls}>
      {t(label)}
      <input type="number" min={min} max={max} className={inputCls} value={form[key]} onChange={(e) => set(key, Number(e.target.value))} />
    </label>
  );
  const monthSelect = (key: "month" | "endMonth", label: TranslationKey) => (
    <label className={labelCls}>
      {t(label)}
      <select className={inputCls} value={form[key]} onChange={(e) => set(key, Number(e.target.value))}>
        {months.map((m) => (
          <option key={m} value={m}>{monthName(m, locale)}</option>
        ))}
      </select>
    </label>
  );

  return (
    <>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm text-white ${toast.ok ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}
      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <div className={section}>
          <h2 className="text-sm font-semibold text-slate-800">{t("admin.calendar.editor.sectionBasics")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className={labelCls}>
              {t("admin.calendar.editor.key")}
              <input
                required
                className={`${inputCls} font-mono`}
                value={form.key}
                disabled={!isNew}
                pattern="[a-z0-9_]+"
                placeholder={t("admin.calendar.editor.keyPlaceholder")}
                onChange={(e) => set("key", e.target.value)}
              />
              <span className="text-[11px] font-normal text-slate-400">{t("admin.calendar.editor.keyHint")}</span>
            </label>
            <label className={labelCls}>
              {t("admin.calendar.editor.type")}
              <select className={inputCls} value={form.periodType} onChange={(e) => set("periodType", e.target.value as PeriodType)}>
                {PERIOD_TYPES.map((type) => (
                  <option key={type} value={type}>{t(`calendar.types.${type}` as TranslationKey)}</option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              {t("admin.calendar.editor.nameHu")}
              <input required className={inputCls} value={form.labelHu} onChange={(e) => set("labelHu", e.target.value)} />
            </label>
            <label className={labelCls}>
              {t("admin.calendar.editor.nameEn")}
              <input required className={inputCls} value={form.labelEn} onChange={(e) => set("labelEn", e.target.value)} />
            </label>
            <label className={labelCls}>
              {t("admin.calendar.editor.descriptionHu")}
              <textarea rows={2} className={`${inputCls} resize-none`} value={form.descriptionHu} onChange={(e) => set("descriptionHu", e.target.value)} />
            </label>
            <label className={labelCls}>
              {t("admin.calendar.editor.descriptionEn")}
              <textarea rows={2} className={`${inputCls} resize-none`} value={form.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} />
            </label>
            <label className={labelCls}>
              {t("admin.calendar.editor.country")}
              <select className={inputCls} value={form.countryCode} disabled={!isNew} onChange={(e) => set("countryCode", e.target.value)}>
                <option value="">{t("admin.calendar.editor.countryNone")}</option>
                {props.countries.map((c) => (
                  <option key={c.code} value={c.code}>{`${locale === "en" ? c.name_en : c.name_hu} (${c.code})`}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelCls}>
                {t("admin.calendar.editor.subdivision")}
                <input
                  className={`${inputCls} font-mono`}
                  value={form.subdivisionCode}
                  disabled={!isNew}
                  placeholder={t("admin.calendar.editor.subdivisionPlaceholder")}
                  onChange={(e) => set("subdivisionCode", e.target.value)}
                />
              </label>
              <label className={labelCls}>
                {t("admin.calendar.editor.hemisphere")}
                <select
                  className={inputCls}
                  value={form.hemisphere}
                  disabled={form.periodType !== "season"}
                  onChange={(e) => set("hemisphere", e.target.value as FormState["hemisphere"])}
                >
                  <option value="">—</option>
                  <option value="north">{t("calendar.hemispheres.north")}</option>
                  <option value="south">{t("calendar.hemispheres.south")}</option>
                </select>
                <span className="text-[11px] font-normal text-slate-400">{t("admin.calendar.editor.hemisphereHint")}</span>
              </label>
            </div>
          </div>
        </div>

        <div className={section}>
          <h2 className="text-sm font-semibold text-slate-800">{t("admin.calendar.editor.sectionRule")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <label className={`${labelCls} md:col-span-2`}>
              {t("admin.calendar.editor.ruleKind")}
              <select className={inputCls} value={form.ruleKind} onChange={(e) => set("ruleKind", e.target.value as RuleKind)}>
                {RULE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>{t(`calendar.ruleKinds.${kind}` as TranslationKey)}</option>
                ))}
              </select>
            </label>
            {form.ruleKind !== "explicit" && (
              <label className={`${labelCls} md:col-span-2`}>
                {t("admin.calendar.editor.duration")}
                <input type="number" min={1} max={366} className={inputCls} value={form.durationDays} onChange={(e) => set("durationDays", e.target.value)} />
                <span className="text-[11px] font-normal text-slate-400">{t("admin.calendar.editor.durationHint")}</span>
              </label>
            )}
            {form.ruleKind === "fixed_annual" && (
              <>
                {monthSelect("month", "admin.calendar.editor.month")}
                {numberInput("day", "admin.calendar.editor.day", 1, 31)}
                <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2 mt-5">
                  <input type="checkbox" className="w-4 h-4 accent-emerald-500" checked={form.hasEnd} onChange={(e) => set("hasEnd", e.target.checked)} />
                  {t("admin.calendar.editor.hasEnd")}
                </label>
                {form.hasEnd && (
                  <>
                    {monthSelect("endMonth", "admin.calendar.editor.endMonth")}
                    {numberInput("endDay", "admin.calendar.editor.endDay", 1, 31)}
                  </>
                )}
              </>
            )}
            {form.ruleKind === "easter_offset" && (
              <>
                {numberInput("offset", "admin.calendar.editor.offset", -120, 120)}
                <label className={labelCls}>
                  {t("admin.calendar.editor.easterCalendar")}
                  <select className={inputCls} value={form.easterCalendar} onChange={(e) => set("easterCalendar", e.target.value as FormState["easterCalendar"])}>
                    <option value="western">{t("calendar.easterCalendars.western")}</option>
                    <option value="orthodox">{t("calendar.easterCalendars.orthodox")}</option>
                  </select>
                </label>
              </>
            )}
            {form.ruleKind === "nth_weekday" && (
              <>
                {monthSelect("month", "admin.calendar.editor.month")}
                <label className={labelCls}>
                  {t("admin.calendar.editor.weekday")}
                  <select className={inputCls} value={form.weekday} onChange={(e) => set("weekday", Number(e.target.value))}>
                    {WEEKDAY_KEYS.map((key, i) => (
                      <option key={key} value={i + 1}>{t(`calendar.weekdays.${key}` as TranslationKey)}</option>
                    ))}
                  </select>
                </label>
                <label className={labelCls}>
                  {t("admin.calendar.editor.nth")}
                  <select className={inputCls} value={form.nth} onChange={(e) => set("nth", Number(e.target.value))}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{`${n}.`}</option>
                    ))}
                    <option value={-1}>{t("admin.calendar.editor.nthLast")}</option>
                  </select>
                </label>
              </>
            )}
            {form.ruleKind === "explicit" && (
              <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-4">
                <input type="checkbox" className="w-4 h-4 accent-emerald-500" checked={form.oneOff} onChange={(e) => set("oneOff", e.target.checked)} />
                {t("admin.calendar.editor.oneOff")}
              </label>
            )}
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
            <p className="text-xs font-medium text-slate-500 mb-1">{t("admin.calendar.editor.preview")}</p>
            {form.ruleKind === "explicit" ? (
              <p className="text-sm text-slate-600">{t("admin.calendar.editor.previewExplicit")}</p>
            ) : !ruleValid ? (
              <p className="text-sm text-red-600">{t("errors.calendar.ruleInvalid")}</p>
            ) : (
              <ul className="text-sm text-slate-700 flex flex-wrap gap-x-6 gap-y-1">
                {preview.map(({ year, range }) => (
                  <li key={year}>
                    <span className="text-slate-400">{year}: </span>
                    {range ? rangeText(range, locale) : t("admin.calendar.editor.previewNone")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={section}>
          <h2 className="text-sm font-semibold text-slate-800">{t("admin.calendar.editor.sectionTags")}</h2>
          <div className="flex flex-wrap gap-3">
            {props.tags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-emerald-500"
                  checked={form.tagIds.includes(tag.id)}
                  onChange={(e) => set("tagIds", e.target.checked ? [...form.tagIds, tag.id] : form.tagIds.filter((id) => id !== tag.id))}
                />
                {localizedLabel(tag.label_localized, locale)}
                {tag.status === "inactive" && <span className="text-[10px] text-slate-400">({t("admin.calendar.statuses.inactive")})</span>}
              </label>
            ))}
          </div>
        </div>

        <div className={section}>
          <h2 className="text-sm font-semibold text-slate-800">{t("admin.calendar.editor.sectionSource")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className={labelCls}>
              {t("admin.calendar.editor.sourceText")}
              <input
                required
                className={inputCls}
                value={form.sourceText}
                placeholder={t("admin.calendar.editor.sourceTextPlaceholder")}
                onChange={(e) => set("sourceText", e.target.value)}
              />
            </label>
            <label className={labelCls}>
              {t("admin.calendar.editor.sourceUrl")}
              <input type="url" className={inputCls} value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="w-4 h-4 accent-emerald-500" checked={form.isDayOff} onChange={(e) => set("isDayOff", e.target.checked)} />
              {t("admin.calendar.editor.isDayOff")}
            </label>
            {isNew && (
              <label className={labelCls}>
                {t("admin.calendar.editor.status")}
                <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value as FormState["status"])}>
                  <option value="active">{t("admin.calendar.statuses.active")}</option>
                  <option value="inactive">{t("admin.calendar.statuses.inactive")}</option>
                </select>
              </label>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {!isNew && (
            <button
              type="button"
              onClick={handleStatus}
              disabled={busy}
              className="px-3 py-2 text-sm border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors"
            >
              {form.status === "active" ? t("admin.calendar.actions.deactivate") : t("admin.calendar.actions.activate")}
            </button>
          )}
          <button type="submit" disabled={busy} className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors">
            {busy ? t("admin.calendar.actions.working") : t("admin.calendar.actions.save")}
          </button>
        </div>
      </form>

      {props.period ? (
        <OccurrencesPanel period={props.period} occurrences={props.occurrences} onToast={showToast} />
      ) : (
        <p className="text-sm text-slate-500">{t("admin.calendar.editor.saveFirst")}</p>
      )}
    </>
  );
}
