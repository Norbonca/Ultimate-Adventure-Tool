"use client";
/**
 * Túra szerkesztő · Beállítások · Elszámolás (D02 XKV28): elszámolási pénznem, átváltási mód, túraszintű árfolyamok,
 * résztvevői rögzítési jog (GAP-011). Az első aktív tétel után a pénznem és a mód zárolt (065 DB-trigger).
 * Saját mentés gombbal — a varázsló űrlapjától független.
 */
import { useState, useTransition } from "react";
import { TutorialHelp } from "@/components/tutorials/TutorialHelp";
import { Icon } from "@/components/Icon";
import { CurrencySelect } from "@/components/trip-forms/CurrencySelect";
import { Toggle } from "@/components/ui/Toggle";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { saveTripFxSettings } from "@/app/(app)/trips/expense-actions";
import { FX_MODE_KEY } from "@/lib/expenses/present";

export interface TripFxSettingsProps {
  tripId: string;
  settlementCurrency: string;
  fxMode: "expense_date" | "settlement_date" | "fixed";
  participantsCanAdd: boolean;
  rates: { currency: string; rate: string }[];
  locked: boolean;
}

const MODES = ["expense_date", "settlement_date", "fixed"] as const;

export function TripFxSettings(p: TripFxSettingsProps) {
  const { t } = useTranslation();
  const tr = t as (k: string, v?: Record<string, string | number>) => string;
  const [currency, setCurrency] = useState(p.settlementCurrency);
  const [mode, setMode] = useState(p.fxMode);
  const [canAdd, setCanAdd] = useState(p.participantsCanAdd);
  const [rates, setRates] = useState(p.rates.length ? p.rates : []);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMsg(null);
    start(async () => {
      const r = await saveTripFxSettings({
        tripId: p.tripId, settlementCurrency: currency, fxMode: mode, participantsCanAdd: canAdd,
        rates: mode === "fixed" ? rates.filter((x) => x.currency && x.rate) : [],
      });
      setMsg(r.ok ? { ok: true, text: t("expenses.settings.saved") } : { ok: false, text: r.error });
    });
  }

  const input = "h-11 w-full rounded-trevu border border-navy-200 bg-white px-3.5 text-sm text-navy-900 disabled:bg-navy-50 disabled:text-navy-400";
  return (
    <section className="rounded-2xl border border-navy-200 bg-white p-6" data-testid="trip-fx-settings">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-navy-400">{t("expenses.settings.title")}</h3>
        {/* M211 — súgó (D21) */}
        <TutorialHelp anchor="expenses.settings" />
      </div>
      <p className="mt-2 text-sm text-navy-600">{t("expenses.settings.lead")}</p>
      {p.locked && (
        <p className="mt-3 flex items-start gap-2 rounded-trevu bg-navy-50 px-3 py-2 text-[13px] text-navy-600"><Icon name="lock" size={16} className="mt-0.5 shrink-0" aria-hidden />{t("expenses.settings.locked")}</p>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="fx-currency" className="mb-1.5 block text-xs font-medium text-navy-500">{t("expenses.settings.currency")}</label>
          {p.locked ? <input id="fx-currency" disabled value={currency} className={input} /> : <CurrencySelect id="fx-currency" value={currency} onChange={setCurrency} className={input} />}
        </div>
        <div>
          <label htmlFor="fx-mode" className="mb-1.5 block text-xs font-medium text-navy-500">{t("expenses.settings.mode")}</label>
          <select id="fx-mode" disabled={p.locked} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className={input}>
            {MODES.map((m) => <option key={m} value={m}>{tr(`expenses.mode.${FX_MODE_KEY[m]}`)}</option>)}
          </select>
          <p className="mt-1.5 text-xs text-navy-500">{tr(`expenses.settings.modeHint.${FX_MODE_KEY[mode]}`)}</p>
        </div>
      </div>

      {mode === "fixed" && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-navy-900">{t("expenses.settings.rates")}</p>
          <p className="mt-1 text-xs text-navy-500">{tr("expenses.settings.ratesHint", { currency })}</p>
          <ul className="mt-3 space-y-2">
            {rates.map((r, i) => (
              <li key={i} className="flex items-center gap-2">
                <div className="w-40"><CurrencySelect value={r.currency} onChange={(c) => setRates((x) => x.map((y, j) => (j === i ? { ...y, currency: c } : y)))} className={input} /></div>
                <input aria-label={t("expenses.settings.rates")} inputMode="decimal" value={r.rate} onChange={(e) => setRates((x) => x.map((y, j) => (j === i ? { ...y, rate: e.target.value } : y)))} className={`${input} font-mono`} />
                <button type="button" onClick={() => setRates((x) => x.filter((_, j) => j !== i))} aria-label={t("expenses.form.delete")} className="p-2 text-navy-400"><Icon name="trash-2" size={16} aria-hidden /></button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setRates((x) => [...x, { currency: "", rate: "" }])} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-trevu-700"><Icon name="plus" size={16} aria-hidden />{t("expenses.settings.addRate")}</button>
          <p className="mt-2 text-xs text-navy-500">{t("expenses.settings.pegNote")}</p>
        </div>
      )}
      <div className="mt-5">
        <Toggle checked={canAdd} onChange={setCanAdd} label={t("expenses.settings.canAdd")} description={t("expenses.settings.canAddHint")} />
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-trevu bg-trevu-600 px-5 text-sm font-semibold text-white disabled:opacity-60" data-testid="fx-settings-save">
          <Icon name={pending ? "loader-2" : "save"} size={16} className={pending ? "animate-spin" : ""} aria-hidden />{t("expenses.form.save")}
        </button>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-trevu-700" : "text-red-600"}`}>{msg.text}</p>}
      </div>
    </section>
  );
}
