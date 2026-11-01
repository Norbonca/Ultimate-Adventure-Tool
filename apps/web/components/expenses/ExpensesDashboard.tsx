"use client";
/**
 * M03 Költségek dashboard (D04 fxd4X / lgLnv / xlpH8 / JQ22A). Összegek centben, az elszámolási pénznemben.
 */
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { decimalToCents } from "@/lib/expenses/money";
import { CATEGORY_ICON, CATEGORY_KEY, dateLabel, money } from "@/lib/expenses/present";
import type { ExpenseCategory } from "@/lib/expenses/schemas";
import type { ExpenseListItem, ExpensesView } from "@/app/(app)/trips/expense-actions";
import { setExpenseDeleted } from "@/app/(app)/trips/expense-actions";
import { ExpenseSheet } from "./ExpenseSheet";

type Filter = "all" | "mine" | ExpenseCategory;
type Toast = { text: string; undoId?: string } | null;

export function ExpensesDashboard({ view, locale }: { view: ExpensesView; locale: string }) {
  const { t } = useTranslation();
  const tr = t as (k: string, p?: Record<string, string | number>) => string;
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<ExpenseListItem | "new" | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const cur = view.trip.settlementCurrency;
  const names = useMemo(() => new Map(view.members.map((m) => [m.id, m.name])), [view.members]);
  const active = view.expenses.filter((e) => e.status === "active");

  const totals = useMemo(() => {
    const total = active.reduce((s, e) => s + (e.amountSettlement ? decimalToCents(e.amountSettlement) : 0), 0);
    const byCat = new Map<string, number>();
    for (const e of active) byCat.set(e.category, (byCat.get(e.category) ?? 0) + (e.amountSettlement ? decimalToCents(e.amountSettlement) : 0));
    return {
      total,
      currencies: new Set(active.map((e) => e.currency)).size,
      perPerson: view.members.length ? Math.round(total / view.members.length) : 0,
      byCat: [...byCat.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [active, view.members.length]);

  const me = view.balances.find((b) => b.userId === view.viewerId)?.balance ?? 0;
  const awaiting = view.settlements.filter((s) => s.status === "pending").length;
  const stale = active.find((e) => e.fxQuality === "stale");
  const shown = active.filter((e) => (filter === "all" ? true : filter === "mine" ? e.payerId === view.viewerId || e.splits.some((s) => s.userId === view.viewerId) : e.category === filter));
  const canEdit = (e: ExpenseListItem) => view.isOrganizer || e.payerId === view.viewerId || e.createdBy === view.viewerId;

  function onSaved(text: string) {
    setEditing(null);
    setToast({ text });
    router.refresh();
    setTimeout(() => setToast(null), 4000);
  }
  function onDelete(id: string) {
    startTransition(async () => {
      const r = await setExpenseDeleted(id, true);
      if (!r.ok) { setError(r.error); return; }
      setEditing(null);
      setToast({ text: t("expenses.toast.deleted"), undoId: id });
      router.refresh();
      setTimeout(() => setToast(null), 8000);
    });
  }
  function undo(id: string) {
    startTransition(async () => {
      const r = await setExpenseDeleted(id, false);
      setToast(r.ok ? { text: t("expenses.toast.restored") } : null);
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  const addButton = (full: boolean) => (
    <button
      type="button"
      onClick={() => setEditing("new")}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-trevu bg-trevu-600 px-5 text-sm font-semibold text-white hover:bg-trevu-700 ${full ? "w-full h-12 text-base" : ""}`}
      data-testid="expense-add"
    >
      <Icon name="plus" size={18} aria-hidden />
      {active.length === 0 ? t("expenses.firstExpense") : t("expenses.addExpense")}
    </button>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-12 lg:py-8">
      {error && (
        <div role="alert" className="mb-4 flex items-center gap-3 rounded-trevu border border-red-300 bg-white px-4 py-3 text-sm text-navy-900">
          <Icon name="alert-circle" size={18} className="text-red-500" aria-hidden />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label={t("expenses.form.close")}><Icon name="x" size={16} aria-hidden /></button>
        </div>
      )}

      {active.length === 0 ? (
        <div className="space-y-4" data-testid="expenses-empty">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-navy-200 bg-white px-6 py-12 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-trevu-50 text-trevu-600"><Icon name="receipt" size={28} aria-hidden /></span>
            <h2 className="text-xl font-semibold text-navy-900">{t("expenses.empty.title")}</h2>
            <p className="max-w-lg text-sm text-navy-600">{tr("expenses.empty.body", { currency: cur })}</p>
            {view.canAdd && <div className="mt-2">{addButton(false)}</div>}
          </div>
          {!view.canAdd && <NoPermission t={t} />}
        </div>
      ) : (
        <>
          {stale && (
            <div className="mb-5 flex items-start gap-3 rounded-trevu border border-amber-400 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800" data-testid="expenses-stale">
              <Icon name="alert-triangle" size={18} aria-hidden className="mt-0.5 shrink-0" />
              <span>{tr("expenses.staleBanner", { currency: stale.currency, date: dateLabel(stale.fxRateDate, locale) })}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
            <Kpi label={t("expenses.totalExpenses")} value={money(totals.total, cur, locale)} sub={`${tr("expenses.itemsCount", { count: active.length })} · ${tr("expenses.currenciesCount", { count: totals.currencies })}`} />
            <Kpi label={t("expenses.perPerson")} value={money(totals.perPerson, cur, locale)} sub={tr("expenses.participantsCount", { count: view.members.length })} />
            <Kpi label={t("expenses.yourBalance")} value={`${me > 0 ? "+" : ""}${money(me, cur, locale)}`} sub={me > 0 ? t("expenses.owedToYou") : me < 0 ? t("expenses.youOwe") : t("expenses.settled")} tone={me > 0 ? "pos" : me < 0 ? "neg" : undefined} />
            <Kpi label={t("expenses.openSettlements")} value={String(view.transfers.length)} sub={tr("expenses.awaitingConfirmation", { count: awaiting })} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
            <section aria-labelledby="exp-items">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 id="exp-items" className="text-lg font-semibold text-navy-900 lg:text-xl">{t("expenses.items")}</h2>
                <div className="flex flex-wrap gap-2">
                  {(["all", "mine"] as Filter[]).concat(totals.byCat.map(([c]) => c as ExpenseCategory)).map((f) => (
                    <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
                      className={`rounded-chip px-2.5 py-1 text-xs font-semibold ${filter === f ? "bg-trevu-50 text-trevu-700" : "bg-navy-100 text-navy-600"}`}>
                      {f === "all" ? t("expenses.filterAll") : f === "mine" ? t("expenses.filterMine") : tr(CATEGORY_KEY[f as ExpenseCategory])}
                    </button>
                  ))}
                </div>
              </div>
              <ul className="divide-y divide-navy-100 overflow-hidden rounded-2xl border border-navy-200 bg-white" data-testid="expenses-list">
                {shown.map((e) => (
                  <li key={e.id}>
                    <ExpenseRow e={e} cur={cur} locale={locale} names={names} viewerId={view.viewerId} editable={canEdit(e)} onOpen={() => setEditing(e)} />
                  </li>
                ))}
              </ul>
            </section>
            <aside className="space-y-6">
              <BalancesCard view={view} names={names} locale={locale} />
              <CategoriesCard byCat={totals.byCat} total={totals.total} cur={cur} locale={locale} />
            </aside>
          </div>
          {!view.canAdd && <div className="mt-6"><NoPermission t={t} /></div>}
        </>
      )}

      {view.canAdd && active.length > 0 && <div className="mt-6 hidden lg:flex lg:justify-end">{addButton(false)}</div>}
      {view.canAdd && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-200 bg-white/95 px-4 pb-7 pt-3 backdrop-blur lg:hidden">{addButton(true)}</div>
      )}

      {editing && (
        <ExpenseSheet view={view} locale={locale} expense={editing === "new" ? null : editing}
          canDelete={editing !== "new" && canEdit(editing)} onClose={() => setEditing(null)} onSaved={onSaved} onDelete={onDelete} />
      )}

      {toast && (
        <div role="status" className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-trevu border border-trevu-600 bg-white px-4 py-3 shadow-trevu-lg lg:bottom-8" data-testid="expenses-toast">
          <Icon name="check-circle-2" size={18} className="text-trevu-600" aria-hidden />
          <span className="flex-1 text-sm font-semibold text-navy-900">{toast.text}</span>
          {toast.undoId && <button type="button" className="text-sm font-semibold text-trevu-700" onClick={() => undo(toast.undoId!)}>{t("expenses.toast.undo")}</button>}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "pos" | "neg" }) {
  return (
    <div className="rounded-2xl border border-navy-200 bg-white p-4 lg:p-5">
      <p className="text-xs font-medium text-navy-500">{label}</p>
      <p className={`mt-1 font-mono text-xl font-bold lg:text-[28px] ${tone === "pos" ? "text-trevu-600" : tone === "neg" ? "text-red-600" : "text-navy-900"}`}>{value}</p>
      <p className="mt-1 text-xs text-navy-500 lg:text-[13px]">{sub}</p>
    </div>
  );
}

function NoPermission({ t }: { t: (k: never) => string }) {
  const tt = t as unknown as (k: string) => string;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-navy-200 bg-white p-4" data-testid="expenses-no-permission">
      <Icon name="lock" size={20} className="mt-0.5 shrink-0 text-navy-400" aria-hidden />
      <div>
        <p className="text-sm font-semibold text-navy-900">{tt("expenses.noPermission.title")}</p>
        <p className="mt-1 text-[13px] text-navy-600">{tt("expenses.noPermission.body")}</p>
      </div>
    </div>
  );
}

function ExpenseRow({ e, cur, locale, names, viewerId, editable, onOpen }: {
  e: ExpenseListItem; cur: string; locale: string; names: Map<string, string>; viewerId: string; editable: boolean; onOpen: () => void;
}) {
  const { t } = useTranslation();
  const tr = t as (k: string, p?: Record<string, string | number>) => string;
  const who = e.payerId === viewerId ? t("expenses.youPaid") : tr("expenses.paidBy", { name: names.get(e.payerId) ?? "—" });
  const split = e.splitType === "equal" ? tr("expenses.splitSummaryEqual", { count: e.splits.length }) : e.splitType === "custom" ? t("expenses.splitSummaryCustom") : t("expenses.splitSummaryPercentage");
  const foreign = e.currency !== cur;
  const warn = e.fxQuality === "stale" || e.fxQuality === "none";
  const inner = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-trevu bg-navy-100 text-navy-600">
        <Icon name={CATEGORY_ICON[e.category as ExpenseCategory] ?? "receipt"} size={20} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-navy-900">{e.title}</span>
        <span className="block truncate text-[13px] text-navy-500">{who} · {dateLabel(e.date, locale)}<span className="hidden sm:inline"> · {split}</span></span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="font-mono text-[15px] font-bold text-navy-900">
          {e.amountSettlement ? money(decimalToCents(e.amountSettlement), cur, locale) : "—"}
        </span>
        {foreign && (
          <span className={`inline-flex items-center gap-1 text-xs ${warn ? "text-amber-700" : "text-navy-500"}`}>
            {warn && <Icon name="alert-triangle" size={12} aria-hidden />}
            {money(decimalToCents(e.amount), e.currency, locale)}
            {e.fxQuality === "stale" ? ` · ${t("expenses.lastKnownRate")}` : e.fxQuality === "none" ? ` · ${t("expenses.conversionPending")}` : ""}
          </span>
        )}
      </span>
    </>
  );
  return editable ? (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-navy-50 sm:gap-4 sm:px-5 sm:py-4" data-testid="expense-row">
      {inner}
      <Icon name="pencil" size={16} className="hidden shrink-0 text-navy-400 sm:block" aria-hidden />
    </button>
  ) : (
    <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4" data-testid="expense-row">{inner}</div>
  );
}

function BalancesCard({ view, names, locale }: { view: ExpensesView; names: Map<string, string>; locale: string }) {
  const { t } = useTranslation();
  const tr = t as (k: string, p?: Record<string, string | number>) => string;
  const rows = [...view.balances].filter((b) => b.balance !== 0 || b.userId === view.viewerId).sort((a, b) => b.balance - a.balance);
  const top = rows.slice(0, 5);
  const rest = rows.slice(5);
  const restSum = rest.reduce((s, b) => s + b.balance, 0);
  const cur = view.trip.settlementCurrency;
  return (
    <section className="rounded-2xl border border-navy-200 bg-white p-5" data-testid="expenses-balances">
      <h2 className="text-lg font-semibold text-navy-900">{t("expenses.balances")}</h2>
      <ul className="mt-3 space-y-2.5">
        {top.map((b) => (
          <li key={b.userId} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-navy-700">{b.userId === view.viewerId ? t("expenses.you") : names.get(b.userId) ?? "—"}</span>
            <span className={`font-mono font-bold ${b.balance > 0 ? "text-trevu-600" : b.balance < 0 ? "text-red-600" : "text-navy-500"}`}>{b.balance > 0 ? "+" : ""}{money(b.balance, cur, locale)}</span>
          </li>
        ))}
        {rest.length > 0 && (
          <li className="flex items-center justify-between gap-3 text-sm">
            <span className="text-navy-500">{tr("expenses.moreParticipants", { count: rest.length })}</span>
            <span className="font-mono font-bold text-navy-600">{money(restSum, cur, locale)}</span>
          </li>
        )}
      </ul>
      <Link href={`/trips/${view.trip.slug}/expenses/settle`} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-trevu bg-trevu-600 text-sm font-semibold text-white hover:bg-trevu-700">
        {t("expenses.openSettle")}
        <Icon name="arrow-right" size={16} aria-hidden />
      </Link>
    </section>
  );
}

function CategoriesCard({ byCat, total, cur, locale }: { byCat: [string, number][]; total: number; cur: string; locale: string }) {
  const { t } = useTranslation();
  const tr = t as (k: string) => string;
  if (!byCat.length) return null;
  return (
    <section className="rounded-2xl border border-navy-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-navy-900">{t("expenses.categoriesTitle")}</h2>
      <ul className="mt-3 space-y-3">
        {byCat.map(([c, v]) => (
          <li key={c}>
            <div className="flex justify-between text-[13px]"><span className="text-navy-700">{tr(CATEGORY_KEY[c as ExpenseCategory])}</span><span className="font-mono font-semibold text-navy-900">{money(v, cur, locale)}</span></div>
            <div className="mt-1.5 h-1.5 rounded-full bg-navy-100"><div className="h-1.5 rounded-full bg-trevu-500" style={{ width: `${total ? Math.max(2, Math.round((v / total) * 100)) : 0}%` }} /></div>
          </li>
        ))}
      </ul>
    </section>
  );
}
