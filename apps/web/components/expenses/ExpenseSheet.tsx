"use client";
/**
 * Költség hozzáadása / szerkesztése (D04 Hpeqs modal 1440 · ACfdz alsó lap 390 · X60Jf átváltási sáv 4 állapota).
 * A mentés sosem tiltott az árfolyam miatt (Norbert, 2026-10-31 09:39); legfeljebb 2 tizedes (GAP-012).
 */
import { useEffect, useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { CurrencySelect } from "@/components/trip-forms/CurrencySelect";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { convertCents, parseAmountToCents, splitAmount } from "@/lib/expenses/money";
import { CATEGORY_KEY, dateLabel, money, rateLabel } from "@/lib/expenses/present";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/expenses/schemas";
import type { ResolvedRate } from "@/lib/expenses/build";
import { previewExpenseFx, saveExpense, type ExpenseListItem, type ExpensesView } from "@/app/(app)/trips/expense-actions";

type SplitType = "equal" | "custom" | "percentage";
interface Props {
  view: ExpensesView;
  locale: string;
  expense: ExpenseListItem | null;
  canDelete: boolean;
  onClose: () => void;
  onSaved: (toast: string) => void;
  onDelete: (id: string) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function ExpenseSheet({ view, locale, expense, canDelete, onClose, onSaved, onDelete }: Props) {
  const { t } = useTranslation();
  const tr = t as (k: string, p?: Record<string, string | number>) => string;
  const cur = view.trip.settlementCurrency;
  const [title, setTitle] = useState(expense?.title ?? "");
  const [amount, setAmount] = useState(expense ? expense.amount.replace(".", locale === "en" ? "." : ",") : "");
  const [currency, setCurrency] = useState(expense?.currency ?? cur);
  const [category, setCategory] = useState<ExpenseCategory>((expense?.category as ExpenseCategory) ?? "food_drinks");
  const [date, setDate] = useState(expense?.date ?? today());
  const [payerId, setPayerId] = useState(expense?.payerId ?? view.viewerId);
  const [splitType, setSplitType] = useState<SplitType>((expense?.splitType as SplitType) ?? "equal");
  const [people, setPeople] = useState<string[]>(expense ? expense.splits.map((s) => s.userId) : view.members.map((m) => m.id));
  const [custom, setCustom] = useState<Record<string, string>>(() =>
    Object.fromEntries((expense?.splits ?? []).map((s) => [s.userId, expense?.splitType === "percentage" ? String(s.percentage ?? "") : s.amount])),
  );
  const [note, setNote] = useState(expense?.description ?? "");
  const [remoteFx, setRemoteFx] = useState<{ key: string; fx: ResolvedRate | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fxKey = `${currency}|${date}`;

  // Csak aszinkron setState az effectben (react-hooks/set-state-in-effect); azonos pénznemnél nincs lekérés.
  useEffect(() => {
    if (currency === cur) return;
    let alive = true;
    previewExpenseFx(view.trip.id, currency, date).then((r) => { if (alive) setRemoteFx({ key: `${currency}|${date}`, fx: r.ok ? r.fx : null }); });
    return () => { alive = false; };
  }, [currency, date, cur, view.trip.id]);

  const fx: ResolvedRate | null = useMemo(
    () => (currency === cur ? { rate: 1, rate_date: date, source: "same", quality: "same" } : remoteFx?.key === fxKey ? remoteFx.fx : null),
    [currency, cur, date, remoteFx, fxKey],
  );

  const cents = parseAmountToCents(amount);
  const amountError = amount !== "" && cents === null;
  const preview = useMemo(() => {
    if (cents === null || splitType !== "equal" || people.length === 0) return null;
    const r = splitAmount(cents, { type: "equal", userIds: people }, payerId);
    if (!r.ok) return null;
    const base = Math.min(...r.shares.map((s) => s.amount));
    return fx?.rate ? convertCents(base, fx.rate) : null;
  }, [cents, splitType, people, payerId, fx]);

  const settlementCents = cents !== null && fx?.rate ? convertCents(cents, fx.rate) : null;

  function togglePerson(id: string) {
    setPeople((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (cents === null || cents <= 0) { setError(t("expenses.errors.amountInvalid")); return; }
    if (people.length === 0) { setError(t("expenses.errors.noParticipants")); return; }
    startTransition(async () => {
      const r = await saveExpense({
        tripId: view.trip.id, title, amount, currency, category, date, payerId, splitType, participants: people,
        custom: splitType === "equal" ? undefined : Object.fromEntries(people.map((p) => [p, custom[p] ?? ""])),
        description: note,
      }, expense?.id);
      if (!r.ok) { setError(r.error); return; }
      onSaved(tr("expenses.toast.saved", { amount: settlementCents !== null ? money(settlementCents, cur, locale) : money(cents, currency, locale) }));
    });
  }

  const input = "h-11 w-full rounded-trevu border border-navy-200 bg-navy-50 px-3.5 text-[15px] text-navy-900 focus:border-trevu-500 focus:outline-none";
  const label = "mb-1.5 block text-xs font-medium text-navy-500";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/65 lg:items-center" role="dialog" aria-modal="true" aria-labelledby="expense-sheet-title" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full min-w-0 overflow-y-auto rounded-t-[20px] bg-white px-4 pb-7 pt-2.5 lg:max-w-[560px] lg:rounded-2xl lg:p-7"
        data-testid="expense-sheet"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-navy-300 lg:hidden" aria-hidden />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="expense-sheet-title" className="text-xl font-semibold text-navy-900">{expense ? t("expenses.editExpense") : t("expenses.addExpense")}</h2>
            <p className="mt-1 hidden text-[13px] text-navy-500 lg:block">{view.trip.title} · {tr("expenses.settlementCurrency", { currency: cur })}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("expenses.form.close")} className="p-1 text-navy-400"><Icon name="x" size={22} aria-hidden /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="exp-title" className={label}>{t("expenses.form.title")}</label>
            <input id="exp-title" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
          </div>
          <div className="flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <label htmlFor="exp-amount" className={label}>{t("expenses.form.amount")}</label>
              <input id="exp-amount" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={amountError} className={`${input} font-mono ${amountError ? "border-red-500" : ""}`} />
            </div>
            <div className="w-32 shrink-0 lg:w-44">
              <label htmlFor="exp-currency" className={label}>{t("expenses.form.currency")}</label>
              <CurrencySelect id="exp-currency" value={currency} onChange={setCurrency} className={input} />
            </div>
          </div>
          {amountError && <p className="-mt-2 text-xs text-red-600">{t("expenses.errors.amountInvalid")}</p>}

          <FxBand fx={fx} currency={currency} cur={cur} locale={locale} settlementCents={settlementCents} />

          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              <label htmlFor="exp-cat" className={label}>{t("expenses.form.category")}</label>
              <select id="exp-cat" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className={input}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{tr(CATEGORY_KEY[c])}</option>)}
              </select>
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="exp-date" className={label}>{t("expenses.form.date")}</label>
              <input id="exp-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={input} />
            </div>
          </div>
          <div>
            <label htmlFor="exp-payer" className={label}>{t("expenses.form.payer")}</label>
            <select id="exp-payer" value={payerId} onChange={(e) => setPayerId(e.target.value)} className={input}>
              {view.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <fieldset>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <legend className="text-xs font-medium text-navy-500">{tr("expenses.form.splitPeople", { count: people.length })}</legend>
              <div className="flex rounded-chip bg-navy-100 p-0.5" role="radiogroup">
                {(["equal", "custom", "percentage"] as SplitType[]).map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={splitType === s} onClick={() => setSplitType(s)}
                    className={`rounded-chip px-3 py-1.5 text-xs font-semibold ${splitType === s ? "bg-white text-navy-900 shadow-trevu-sm" : "text-navy-500"}`}>
                    {t(`expenses.splitType.${s}` as never)}
                  </button>
                ))}
              </div>
            </div>
            <ul className="divide-y divide-navy-100 overflow-hidden rounded-trevu border border-navy-200">
              {view.members.map((m) => {
                const on = people.includes(m.id);
                return (
                  <li key={m.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <input type="checkbox" checked={on} onChange={() => togglePerson(m.id)} id={`exp-p-${m.id}`} className="h-5 w-5 accent-trevu-600" />
                    <label htmlFor={`exp-p-${m.id}`} className={`flex-1 truncate text-sm ${on ? "text-navy-800" : "text-navy-400"}`}>{m.id === view.viewerId ? t("expenses.you") : m.name}</label>
                    {splitType === "equal" ? (
                      <span className="font-mono text-sm font-semibold text-navy-900">{on && preview !== null ? money(preview, cur, locale) : "—"}</span>
                    ) : (
                      <input aria-label={m.name} inputMode="decimal" disabled={!on} value={custom[m.id] ?? ""} onChange={(e) => setCustom((c) => ({ ...c, [m.id]: e.target.value }))}
                        className="h-9 w-24 rounded-trevu border border-navy-200 px-2 text-right font-mono text-sm disabled:bg-navy-50" placeholder={splitType === "percentage" ? "%" : currency} />
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-1.5 text-xs text-navy-500">{t("expenses.form.remainderNote")}</p>
          </fieldset>

          <div>
            <label htmlFor="exp-note" className={label}>{t("expenses.form.note")}</label>
            <input id="exp-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={input} />
          </div>

          {error && <p role="alert" className="rounded-trevu border border-red-300 px-3 py-2 text-sm text-navy-900">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {canDelete && expense ? (
              <button type="button" onClick={() => onDelete(expense.id)} disabled={pending} className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600">
                <Icon name="trash-2" size={16} aria-hidden />{t("expenses.form.delete")}
              </button>
            ) : <span className="text-[13px] text-navy-400">{t("expenses.form.receiptLater")}</span>}
            <div className="flex flex-1 justify-end gap-3 sm:flex-none">
              <button type="button" onClick={onClose} className="h-11 rounded-trevu border border-navy-300 px-5 text-sm font-semibold text-navy-800">{t("expenses.form.cancel")}</button>
              <button type="submit" disabled={pending} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-trevu bg-trevu-600 px-5 text-sm font-semibold text-white disabled:opacity-60 sm:flex-none" data-testid="expense-save">
                <Icon name={pending ? "loader-2" : "check"} size={18} className={pending ? "animate-spin" : ""} aria-hidden />{t("expenses.form.save")}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

/** Átváltási sáv — D04 X60Jf: friss / visszalépés / utolsó ismert (figyelmeztetés) / függőben. Egyik sem tiltja a mentést. */
function FxBand({ fx, currency, cur, locale, settlementCents }: { fx: ResolvedRate | null; currency: string; cur: string; locale: string; settlementCents: number | null }) {
  const { t } = useTranslation();
  const tr = t as (k: string, p?: Record<string, string | number>) => string;
  if (!fx || fx.quality === "same") {
    return currency === cur ? <p className="text-xs text-navy-500" data-testid="fx-band" data-quality="same">{t("expenses.fx.same")}</p> : null;
  }
  const q = fx.quality;
  const warn = q === "stale";
  const none = q === "none" || fx.rate === null;
  const rate = fx.rate ? rateLabel(fx.rate, cur, currency, locale) : "";
  const key = none ? "expenses.fx.none" : q === "trip" ? "expenses.fx.trip" : q === "peg" ? "expenses.fx.peg" : q === "exact" ? "expenses.fx.exact" : q === "backfill" ? "expenses.fx.backfill" : "expenses.fx.stale";
  const tone = warn ? "border-amber-400 bg-amber-50 text-amber-800" : none ? "border-navy-300 bg-navy-50 text-navy-600" : "border-trevu-300 bg-trevu-50 text-trevu-800";
  const icon = warn ? "alert-triangle" : none ? "clock" : q === "backfill" ? "calendar" : "check";
  return (
    <div className={`flex items-start gap-3 rounded-trevu border px-3.5 py-3 ${tone}`} data-testid="fx-band" data-quality={none ? "none" : q}>
      <Icon name={icon} size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium">{t("expenses.form.inSettlement")}</span>
          <span className="font-mono text-[15px] font-bold">{settlementCents !== null ? `≈ ${money(settlementCents, cur, locale)}` : "—"}</span>
        </div>
        <p className="mt-1 text-xs">{tr(key, { rate, date: dateLabel(fx.rate_date, locale) })}</p>
      </div>
    </div>
  );
}
