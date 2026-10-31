"use client";

/**
 * M22 — ötlet beküldése / szerkesztése (FR-M22-001, FR-M22-002, FR-M22-011 1.). Design: D22 `sGfJS`.
 * Egyetlen képernyő: kötelező mezők felül (cím, kategória, célterületek, időablak), opcionálisak a
 * „További részletek” alatt. A hasonló ötletek felajánlása nem akadályozza a mentést (BR-M22-005).
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { createIdea, previewSimilarIdeas, updateIdea } from "@/app/(app)/ideas/actions";
import { autoYear, formatWindow, monthName, SEASON_MONTHS, validateWindow, windowDates } from "@/lib/ideas/window";
import { CONTINENTS, IDEA_INTENTS, IDEA_VISIBILITIES, type IdeaDestination, type IdeaIntent, type IdeaVisibility } from "@/lib/ideas/types";

export interface IdeaFormCategory { id: string; name: string; name_localized: Record<string, string> | null; icon_name: string }
export interface IdeaFormCountry { code: string; name_hu: string; name_en: string; flag_emoji: string | null }
export interface IdeaFormCurrency { code: string }
export interface IdeaFormInitial {
  id?: string;
  slug?: string;
  title?: string;
  category_id?: string;
  sub_discipline_id?: string | null;
  destinations?: IdeaDestination[];
  window_start_month?: number;
  window_end_month?: number;
  window_year?: number;
  period_key?: string | null;
  duration_min_days?: number | null;
  duration_max_days?: number | null;
  description?: string | null;
  difficulty?: number | null;
  group_size_min?: number | null;
  group_size_max?: number | null;
  budget_amount?: number | null;
  budget_currency?: string | null;
  intent?: IdeaIntent;
  visibility?: IdeaVisibility;
  created_via?: "form" | "discover_empty";
}

interface Props {
  mode: "create" | "edit";
  initial?: IdeaFormInitial;
  categories: IdeaFormCategory[];
  countries: IdeaFormCountry[];
  currencies: IdeaFormCurrency[];
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function IdeaForm({ mode, initial, categories, countries, currencies }: Props) {
  const { t: tt, locale } = useTranslation();
  const t = tt as (k: string, p?: Record<string, string | number>) => string;
  const router = useRouter();
  const [pending, start] = useTransition();
  const now = useMemo(() => new Date(), []);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [dests, setDests] = useState<IdeaDestination[]>(initial?.destinations?.length ? initial.destinations : [{ name: "", continent: null, country_codes: [] }]);
  const nextMonth = now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2;
  const [sm, setSm] = useState(initial?.window_start_month ?? nextMonth);
  const [em, setEm] = useState(initial?.window_end_month ?? initial?.window_start_month ?? nextMonth);
  const [yearOverride, setYearOverride] = useState<number | null>(initial?.window_year ?? null);
  const [periodKey, setPeriodKey] = useState<string | null>(initial?.period_key ?? null);
  const [more, setMore] = useState(mode === "edit");
  const [durMin, setDurMin] = useState(initial?.duration_min_days ?? "");
  const [durMax, setDurMax] = useState(initial?.duration_max_days ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [difficulty, setDifficulty] = useState<number | "">(initial?.difficulty ?? "");
  const [gMin, setGMin] = useState(initial?.group_size_min ?? "");
  const [gMax, setGMax] = useState(initial?.group_size_max ?? "");
  const [budget, setBudget] = useState(initial?.budget_amount ?? "");
  const [currency, setCurrency] = useState(initial?.budget_currency ?? "HUF");
  const [intent, setIntent] = useState<IdeaIntent>(initial?.intent ?? "seeking_organizer");
  const [visibility, setVisibility] = useState<IdeaVisibility>(initial?.visibility ?? "public");
  const [error, setError] = useState<{ field: string; key: string } | null>(null);
  const [similar, setSimilar] = useState<{ id: string; slug: string; title: string; member_count: number }[]>([]);
  const [dismissSimilar, setDismissSimilar] = useState(false);

  const year = yearOverride ?? autoYear(sm, em, now);
  const windowErr = validateWindow({ startMonth: sm, endMonth: em, year }, now);
  const countryName = (c: IdeaFormCountry) => (locale === "en" ? c.name_en : c.name_hu);
  const catName = (c: IdeaFormCategory) => c.name_localized?.[locale] ?? c.name;

  // generált cím (FR-M22-001): kategória · első célterület · időablak
  const generatedTitle = useMemo(() => {
    const cat = categories.find((c) => c.id === categoryId);
    const dest = dests[0]?.name?.trim();
    if (!cat || !dest) return "";
    return `${catName(cat)} · ${dest} · ${formatWindow({ startMonth: sm, endMonth: em, year }, locale)}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, dests, sm, em, year, locale]);

  // hasonló ötletek (FR-M22-002) — kategória + célterület + ablak után, késleltetve
  const codesKey = dests.flatMap((d) => d.country_codes).join(",");
  const contsKey = dests.map((d) => d.continent ?? "").join(",");
  useEffect(() => {
    if (!categoryId || (codesKey === "" && contsKey.replace(/,/g, "") === "")) return;
    let alive = true;
    const h = setTimeout(() => {
      const { start, end } = windowDates({ startMonth: sm, endMonth: em, year });
      previewSimilarIdeas({ category_id: categoryId, country_codes: codesKey ? codesKey.split(",") : [], continents: contsKey.split(",").filter(Boolean), start, end, excludeId: initial?.id ?? null })
        .then((r) => { if (alive) setSimilar(r); })
        .catch(() => undefined);
    }, 500);
    return () => { alive = false; clearTimeout(h); };
  }, [categoryId, codesKey, contsKey, sm, em, year, initial?.id]);

  const setDest = (i: number, patch: Partial<IdeaDestination>) => setDests((arr) => arr.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const addCountry = (i: number, code: string) => { if (!code) return; setDest(i, { country_codes: Array.from(new Set([...dests[i].country_codes, code])) }); };

  const submit = () =>
    start(async () => {
      setError(null);
      const payload = {
        title: title.trim() || generatedTitle,
        category_id: categoryId,
        destinations: dests.filter((d) => d.name.trim()).map((d) => ({ name: d.name.trim(), continent: d.continent || null, country_codes: d.country_codes })),
        window_start_month: sm, window_end_month: em, window_year: year, period_key: periodKey,
        duration_min_days: durMin === "" ? null : Number(durMin), duration_max_days: durMax === "" ? null : Number(durMax),
        description: description || null, difficulty: difficulty === "" ? null : Number(difficulty),
        group_size_min: gMin === "" ? null : Number(gMin), group_size_max: gMax === "" ? null : Number(gMax),
        budget_amount: budget === "" ? null : Number(budget), budget_currency: budget === "" ? null : currency,
        intent, visibility, language: locale, created_via: initial?.created_via ?? "form",
      };
      const res = mode === "edit" && initial?.id ? await updateIdea(initial.id, payload) : await createIdea(payload);
      if (!res.ok) { setError({ field: res.field ?? "", key: res.error }); return; }
      router.push(`/ideas/${res.slug}`);
    });

  const errText = error ? t(`ideas.errors.${error.key}`) : null;
  const fieldErr = (f: string) => (error && error.field === f ? <p role="alert" className="mt-1 text-xs text-[var(--color-danger)]">{errText}</p> : null);
  const inputCls = "input-trevu w-full px-3.5 py-3 text-sm";
  const labelCls = "mb-1.5 block text-sm font-semibold text-navy-900";

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-6" data-testid="idea-form" noValidate>
      {/* cím */}
      <div>
        <label htmlFor="idea-title" className={labelCls}>{t("ideas.form.title")} *</label>
        <input id="idea-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={generatedTitle || t("ideas.form.titlePlaceholder")} className={inputCls} />
        <p className="mt-1 text-xs text-navy-500">{t("ideas.form.titleHint")}</p>
        {fieldErr("title")}
      </div>

      {/* kategória */}
      <div>
        <label htmlFor="idea-category" className={labelCls}>{t("ideas.form.category")} *</label>
        <select id="idea-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
          <option value="">{t("ideas.form.categoryPlaceholder")}</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{catName(c)}</option>)}
        </select>
        {fieldErr("category_id")}
      </div>

      {/* célterületek */}
      <fieldset>
        <legend className={labelCls}>{t("ideas.form.destinations")} * <span className="font-normal text-navy-500">— {t("ideas.form.destinationsHint")}</span></legend>
        <div className="space-y-3">
          {dests.map((d, i) => (
            <div key={i} className="rounded-xl border border-navy-200 p-3" data-testid={`idea-destination-${i}`}>
              <div className="flex gap-2">
                <input aria-label={t("ideas.form.destinationName")} value={d.name} onChange={(e) => setDest(i, { name: e.target.value })} maxLength={100} placeholder={t("ideas.form.destinationPlaceholder")} className={inputCls} />
                {dests.length > 1 && <button type="button" aria-label={t("common.remove")} onClick={() => setDests((arr) => arr.filter((_, j) => j !== i))} className="shrink-0 rounded-trevu px-3 text-navy-500 hover:bg-navy-50"><Icon name="x" size={16} /></button>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {d.country_codes.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 rounded-chip bg-trevu-50 px-2.5 py-1 text-xs font-semibold text-trevu-700">{countries.find((x) => x.code === c)?.flag_emoji ?? ""} {c}<button type="button" aria-label={t("common.remove")} onClick={() => setDest(i, { country_codes: d.country_codes.filter((x) => x !== c) })}>×</button></span>
                ))}
                <select aria-label={t("ideas.form.addCountry")} value="" onChange={(e) => addCountry(i, e.target.value)} className="input-trevu px-3 py-2 text-xs">
                  <option value="">+ {t("ideas.form.addCountry")}</option>
                  {countries.map((c) => <option key={c.code} value={c.code}>{countryName(c)}</option>)}
                </select>
                <select aria-label={t("ideas.form.continent")} value={d.continent ?? ""} onChange={(e) => setDest(i, { continent: e.target.value || null })} className="input-trevu px-3 py-2 text-xs">
                  <option value="">{t("ideas.form.continentNone")}</option>
                  {CONTINENTS.map((c) => <option key={c} value={c}>{t(`ideas.continent.${c.replace(/ /g, "_")}`)}</option>)}
                </select>
              </div>
            </div>
          ))}
          {dests.length < 5 && <button type="button" onClick={() => setDests((arr) => [...arr, { name: "", continent: null, country_codes: [] }])} className="text-sm font-semibold text-trevu-700">+ {t("ideas.form.addDestination")}</button>}
        </div>
        {fieldErr("destinations")}
      </fieldset>

      {/* időablak */}
      <div>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelCls}>{t("ideas.form.windowStart")} *
            <select value={sm} onChange={(e) => { setSm(Number(e.target.value)); setPeriodKey(null); setYearOverride(null); }} className={`${inputCls} mt-1 font-normal`}>{MONTHS.map((m) => <option key={m} value={m}>{monthName(m, locale)}</option>)}</select>
          </label>
          <label className={labelCls}>{t("ideas.form.windowEnd")} *
            <select value={em} onChange={(e) => { setEm(Number(e.target.value)); setPeriodKey(null); setYearOverride(null); }} className={`${inputCls} mt-1 font-normal`}>{MONTHS.map((m) => <option key={m} value={m}>{monthName(m, locale)}</option>)}</select>
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-navy-50 px-3.5 py-2.5" data-testid="idea-window-hint">
          <Icon name="calendar-range" size={16} className="shrink-0 text-trevu-700" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-navy-900">{formatWindow({ startMonth: sm, endMonth: em, year }, locale)}</p>
            <p className="text-xs text-navy-400">{t("ideas.form.yearAuto", { year })} · {t("ideas.form.seasonChips")}</p>
          </div>
          <select aria-label={t("ideas.form.yearChange")} value={year} onChange={(e) => setYearOverride(Number(e.target.value))} className="input-trevu px-2 py-1.5 text-xs">
            {[now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(SEASON_MONTHS) as (keyof typeof SEASON_MONTHS)[]).map((s) => (
            <button key={s} type="button" aria-pressed={periodKey === s} onClick={() => { const [a, b] = SEASON_MONTHS[s]; setSm(a); setEm(b); setPeriodKey(s); setYearOverride(null); }} className={`rounded-chip px-3 py-1.5 text-xs font-semibold ${periodKey === s ? "bg-trevu-50 text-trevu-700" : "bg-navy-50 text-navy-600"}`}>{t(`ideas.period.${s}`)}</button>
          ))}
        </div>
        {windowErr && <p role="alert" className="mt-1 text-xs text-[var(--color-danger)]">{t(`ideas.errors.${windowErr}`)}</p>}
        {fieldErr("window_end_month")}
      </div>

      {/* hasonló ötletek (FR-M22-002) */}
      {similar.length > 0 && !dismissSimilar && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3.5" data-testid="idea-similar">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-amber-800"><Icon name="lightbulb" size={18} aria-hidden /></span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold text-navy-900">{t("ideas.form.similarTitle")}</p>
            <ul className="space-y-1 text-sm text-navy-700">
              {similar.map((s) => <li key={s.id} className="flex flex-wrap items-center gap-2"><a href={`/ideas/${s.slug}`} className="font-semibold text-trevu-700 underline-offset-2 hover:underline">{s.title}</a><span className="text-navy-400">· {t("ideas.common.members", { count: s.member_count })}</span><a href={`/ideas/${s.slug}`} className="text-xs font-semibold text-trevu-700">{t("ideas.form.joinThis")} →</a></li>)}
            </ul>
            <button type="button" onClick={() => setDismissSimilar(true)} className="text-xs font-semibold text-navy-600 underline-offset-2 hover:underline">{t("ideas.form.submitAnyway")}</button>
          </div>
        </div>
      )}

      {/* további részletek */}
      <div className="rounded-xl border border-navy-200">
        <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-navy-900">
          <Icon name="chevron-down" size={16} className={`transition ${more ? "rotate-180" : ""}`} aria-hidden />{t("ideas.form.moreDetails")}
        </button>
        {more && (
          <div className="space-y-4 border-t border-navy-200 px-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <label className={labelCls}>{t("ideas.form.durationMin")}<input type="number" min={1} max={90} value={durMin} onChange={(e) => setDurMin(e.target.value === "" ? "" : Number(e.target.value))} className={`${inputCls} mt-1 font-normal`} /></label>
              <label className={labelCls}>{t("ideas.form.durationMax")}<input type="number" min={1} max={90} value={durMax} onChange={(e) => setDurMax(e.target.value === "" ? "" : Number(e.target.value))} className={`${inputCls} mt-1 font-normal`} /></label>
            </div>
            {fieldErr("duration_max_days")}
            <div>
              <label htmlFor="idea-desc" className={labelCls}>{t("ideas.form.description")}</label>
              <textarea id="idea-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={5} placeholder={t("ideas.form.descriptionPlaceholder")} className={`${inputCls} resize-y`} />
              <p className="mt-1 text-xs text-navy-500">{t("ideas.form.descriptionHint")}</p>
              {fieldErr("description")}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className={labelCls}>{t("ideas.form.difficulty")}
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value === "" ? "" : Number(e.target.value))} className={`${inputCls} mt-1 font-normal`}>
                  <option value="">—</option>{[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{t(`ideas.difficulty.${d}`)}</option>)}
                </select>
              </label>
              <label className={labelCls}>{t("ideas.form.groupSizeMin")}<input type="number" min={2} max={50} value={gMin} onChange={(e) => setGMin(e.target.value === "" ? "" : Number(e.target.value))} className={`${inputCls} mt-1 font-normal`} /></label>
              <label className={labelCls}>{t("ideas.form.groupSizeMax")}<input type="number" min={2} max={50} value={gMax} onChange={(e) => setGMax(e.target.value === "" ? "" : Number(e.target.value))} className={`${inputCls} mt-1 font-normal`} /></label>
            </div>
            {fieldErr("group_size_max")}
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <label className={labelCls}>{t("ideas.form.budget")}<input type="number" min={1} step="1" value={budget} onChange={(e) => setBudget(e.target.value === "" ? "" : Number(e.target.value))} className={`${inputCls} mt-1 font-normal`} /></label>
              <label className={labelCls}>{t("ideas.form.currency")}
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${inputCls} mt-1 font-normal`}>{currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}</select>
              </label>
            </div>
            {fieldErr("budget_amount")}
            <fieldset>
              <legend className={labelCls}>{t("ideas.form.intent")}</legend>
              <div className="space-y-1.5">{IDEA_INTENTS.map((i) => <label key={i} className="flex items-center gap-2 text-sm text-navy-900"><input type="radio" name="idea-intent" checked={intent === i} onChange={() => setIntent(i)} className="accent-trevu-600" />{t(`ideas.intent.${i}`)}</label>)}</div>
            </fieldset>
            <fieldset>
              <legend className={labelCls}>{t("ideas.form.visibility")}</legend>
              <div className="space-y-1.5">{IDEA_VISIBILITIES.map((v) => <label key={v} className="flex items-center gap-2 text-sm text-navy-900"><input type="radio" name="idea-visibility" checked={visibility === v} onChange={() => setVisibility(v)} className="accent-trevu-600" />{t(`ideas.visibility.${v}`)} <span className="text-xs text-navy-400">— {t(`ideas.visibility.${v}_hint`)}</span></label>)}</div>
            </fieldset>
          </div>
        )}
      </div>

      <p className="text-xs text-navy-500">{t("ideas.form.joinNote")}</p>
      {error && !error.field && <p role="alert" className="text-sm text-[var(--color-danger)]">{errText}</p>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="outline" href={mode === "edit" && initial?.slug ? `/ideas/${initial.slug}` : "/ideas"}>{t("common.cancel")}</Button>
        <Button type="submit" icon="lightbulb" loading={pending} disabled={!!windowErr} data-testid="idea-submit">{mode === "edit" ? t("ideas.form.save") : t("ideas.form.submit")}</Button>
      </div>
    </form>
  );
}
