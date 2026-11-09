"use client";
/**
 * Kiegyenlítés (D04 EzvWI / podMm / JQ22A). Az összeget senki nem módosítja: a fizető jelzi („Kifizettem”),
 * a kedvezményezett megerősíti; bármelyik fél jelezheti, hogy nem ért egyet (Norbert, 2026-10-31 14:03).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { decimalToCents } from "@/lib/expenses/money";
import { dateLabel, METHOD_KEY, money } from "@/lib/expenses/present";
import { confirmSettlement, disputeSettlement, markSettlementPaid, type ExpensesView, type SettlementItem } from "@/app/(app)/trips/expense-actions";

type Row = {
  key: string; from: string; to: string; amount: number;
  status: "open" | "pending" | "completed" | "disputed"; settlement?: SettlementItem;
};

function buildRows(view: ExpensesView): Row[] {
  const pending = view.settlements.filter((s) => s.status === "pending");
  const rows: Row[] = view.transfers.map((x) => {
    const s = pending.find((p) => p.payerId === x.from && p.receiverId === x.to);
    return { key: `t-${x.from}-${x.to}`, from: x.from, to: x.to, amount: x.amount, status: s ? "pending" : "open", settlement: s };
  });
  for (const s of pending) if (!rows.some((r) => r.settlement?.id === s.id)) {
    rows.push({ key: s.id, from: s.payerId, to: s.receiverId, amount: decimalToCents(s.amount), status: "pending", settlement: s });
  }
  for (const s of view.settlements.filter((x) => x.status === "completed" || x.status === "disputed")) {
    rows.push({ key: s.id, from: s.payerId, to: s.receiverId, amount: decimalToCents(s.amount), status: s.status as Row["status"], settlement: s });
  }
  return rows;
}

const CHIP: Record<Row["status"], { cls: string; icon: string }> = {
  open: { cls: "bg-navy-100 text-navy-600", icon: "circle" },
  pending: { cls: "bg-amber-50 text-amber-800", icon: "clock" },
  completed: { cls: "bg-emerald-50 text-emerald-700", icon: "check" },
  disputed: { cls: "bg-red-50 text-red-600", icon: "flag" },
};

export function SettleBoard({ view, locale, disputeDays }: { view: ExpensesView; locale: string; disputeDays: number }) {
  const { t } = useTranslation();
  const tr = t as (k: string, p?: Record<string, string | number>) => string;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ kind: "confirm" | "dispute" | "pay"; row: Row } | null>(null);
  const [note, setNote] = useState("");
  const names = new Map(view.members.map((m) => [m.id, m.id === view.viewerId ? t("expenses.you") : m.name]));
  const cur = view.trip.settlementCurrency;
  const rows = buildRows(view);
  const mine = rows.filter((r) => (r.from === view.viewerId || r.to === view.viewerId) && r.status !== "completed");
  const counts = { completed: 0, pending: 0, open: 0, disputed: 0 } as Record<Row["status"], number>;
  rows.forEach((r) => counts[r.status]++);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) { setError(r.error ?? t("errors.saveFailed" as never)); return; }
      setSheet(null);
      setNote("");
      router.refresh();
    });
  }

  const rowNote = (r: Row) => {
    const s = r.settlement;
    if (r.status === "pending" && s) return tr("expenses.settlePage.paidNote", { name: names.get(r.from) ?? "—", method: t(`expenses.settlePage.method.${METHOD_KEY[s.method] ?? "cash"}` as never), date: dateLabel(s.paidMarkedAt?.slice(0, 10) ?? s.createdAt.slice(0, 10), locale) });
    if (r.status === "disputed" && s) return `${tr("expenses.settlePage.disputedNote", { date: dateLabel(s.createdAt.slice(0, 10), locale) })}${s.disputeNote ? ` — ${s.disputeNote}` : ""}`;
    if (r.status === "open") return tr("expenses.settlePage.waitingPayer", { name: names.get(r.from) ?? "—" });
    return "";
  };

  const actionsFor = (r: Row) => {
    const isPayer = r.from === view.viewerId;
    const isPayee = r.to === view.viewerId;
    if (r.status === "open" && isPayer) {
      return <button type="button" disabled={pending} onClick={() => setSheet({ kind: "pay", row: r })} className="inline-flex h-11 items-center gap-1.5 rounded-trevu bg-trevu-600 px-4 text-sm font-semibold text-white" data-testid="settle-mark-paid"><Icon name="check" size={16} aria-hidden />{t("expenses.settlePage.markPaid")}</button>;
    }
    if (r.status === "pending" && r.settlement && (isPayer || isPayee)) {
      return (
        <div className="flex flex-wrap gap-2">
          {isPayee && <button type="button" disabled={pending} onClick={() => setSheet({ kind: "confirm", row: r })} className="inline-flex h-11 items-center gap-1.5 rounded-trevu bg-trevu-600 px-4 text-sm font-semibold text-white" data-testid="settle-confirm"><Icon name="check" size={16} aria-hidden />{t("expenses.settlePage.confirm")}</button>}
          <button type="button" disabled={pending} onClick={() => setSheet({ kind: "dispute", row: r })} className="inline-flex h-11 items-center gap-1.5 rounded-trevu border border-red-500 px-4 text-sm font-semibold text-red-600" data-testid="settle-dispute"><Icon name="flag" size={16} aria-hidden />{t("expenses.settlePage.dispute")}</button>
        </div>
      );
    }
    return null;
  };

  const renderRow = (r: Row, withActions: boolean) => (
    <li key={r.key} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5" data-testid="settle-row" data-status={r.status}>
      <div className="flex min-w-0 items-center gap-2 sm:w-72">
        <span className="truncate text-sm font-semibold text-navy-900">{names.get(r.from) ?? "—"}</span>
        <Icon name="arrow-right" size={16} className="shrink-0 text-trevu-600" aria-hidden />
        <span className="truncate text-sm font-semibold text-navy-900">{names.get(r.to) ?? "—"}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-xs font-semibold ${CHIP[r.status].cls}`}><Icon name={CHIP[r.status].icon} size={12} aria-hidden />{t(`expenses.settlePage.status.${r.status}` as never)}</span>
        </div>
        <p className="mt-1 truncate text-[13px] text-navy-500">{rowNote(r)}</p>
      </div>
      <span className="font-mono text-lg font-bold text-navy-900">{money(r.amount, cur, locale)}</span>
      {withActions && actionsFor(r)}
    </li>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-12 lg:py-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-navy-900">{tr("expenses.settlePage.intro", { count: view.transfers.length })}</h2>
        <p className="mt-1 max-w-3xl text-sm text-navy-600">{t("expenses.settlePage.introBody")}</p>
      </div>
      {error && <p role="alert" className="mb-4 rounded-trevu border border-red-300 bg-white px-4 py-3 text-sm text-navy-900">{error}</p>}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        <div className="space-y-6">
          <section>
            <h3 className="mb-3 text-lg font-semibold text-navy-900 lg:text-xl">{t("expenses.settlePage.yours")}</h3>
            {mine.length === 0 ? (
              <p className="rounded-2xl border border-navy-200 bg-white p-5 text-sm text-navy-600" data-testid="settle-nothing">{t("expenses.settlePage.nothing")}</p>
            ) : (
              <ul className="divide-y divide-navy-100 overflow-hidden rounded-2xl border border-navy-200 bg-white">{mine.map((r) => renderRow(r, true))}</ul>
            )}
          </section>
          <section>
            <h3 className="mb-3 text-lg font-semibold text-navy-900 lg:text-xl">{t("expenses.settlePage.all")}</h3>
            {rows.length === 0 ? (
              <p className="rounded-2xl border border-navy-200 bg-white p-5 text-sm text-navy-600">{t("expenses.settlePage.allSettled")}</p>
            ) : (
              <ul className="divide-y divide-navy-100 overflow-hidden rounded-2xl border border-navy-200 bg-white">{rows.map((r) => renderRow(r, false))}</ul>
            )}
          </section>
        </div>
        <aside className="space-y-6">
          <section className="rounded-2xl border border-navy-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-navy-900">{t("expenses.settlePage.summary")}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {(["completed", "pending", "open", "disputed"] as Row["status"][]).map((k) => (
                <li key={k} className="flex justify-between"><span className="text-navy-700">{t(`expenses.settlePage.status.${k}` as never)}</span><span className="font-mono font-bold text-navy-900">{counts[k]}</span></li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-navy-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-navy-900">{t("expenses.settlePage.howTitle")}</h3>
            <ul className="mt-3 space-y-3 text-[13px] text-navy-700">
              {([["list-checks", "how1"], ["check-check", "how2"], ["flag", "how3"], ["wrench", "how4"], ["clock", "how5"]] as const).map(([ic, k]) => (
                <li key={k} className="flex gap-2.5"><Icon name={ic === "check-check" ? "check-circle-2" : ic} size={16} className="mt-0.5 shrink-0 text-trevu-600" aria-hidden /><span>{tr(`expenses.settlePage.${k}`, { days: disputeDays })}</span></li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/65 lg:items-center" role="dialog" aria-modal="true" onClick={() => setSheet(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full rounded-t-trevu-3xl bg-white px-4 pb-7 pt-2.5 lg:max-w-[480px] lg:rounded-2xl lg:p-7" data-testid={`settle-sheet-${sheet.kind}`}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-navy-300 lg:hidden" aria-hidden />
            <h2 className="text-xl font-semibold text-navy-900">
              {sheet.kind === "confirm" ? t("expenses.settlePage.confirmTitle") : sheet.kind === "dispute" ? t("expenses.settlePage.disputeTitle") : t("expenses.settlePage.payWith")}
            </h2>
            <div className="mt-4 rounded-2xl border border-navy-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-navy-900">{names.get(sheet.row.from)} → {names.get(sheet.row.to)}</span>
                <span className="font-mono text-lg font-bold text-navy-900">{money(sheet.row.amount, cur, locale)}</span>
              </div>
              {sheet.row.settlement && <p className="mt-1 text-xs text-navy-500">{rowNote(sheet.row)}</p>}
            </div>
            {sheet.kind === "confirm" && <p className="mt-3 text-sm text-navy-600">{t("expenses.settlePage.confirmBody")}</p>}
            {sheet.kind === "dispute" && (
              <>
                <textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("expenses.settlePage.disputeNote")} aria-label={t("expenses.settlePage.disputeNote")}
                  className="mt-3 h-24 w-full rounded-trevu border border-navy-200 bg-navy-50 p-3 text-sm text-navy-900" />
                <p className="mt-2 text-xs text-navy-500">{t("expenses.settlePage.disputeHint")}</p>
              </>
            )}
            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex flex-col gap-3">
              {sheet.kind === "pay" && (["bank_transfer", "cash"] as const).map((m) => (
                <button key={m} type="button" disabled={pending} onClick={() => run(() => markSettlementPaid({ tripId: view.trip.id, receiverId: sheet.row.to, method: m }))}
                  className="h-12 rounded-trevu bg-trevu-600 text-base font-semibold text-white disabled:opacity-60" data-testid={`settle-pay-${m}`}>
                  {t(`expenses.settlePage.method.${METHOD_KEY[m]}` as never)}
                </button>
              ))}
              {sheet.kind === "confirm" && sheet.row.settlement && (
                <button type="button" disabled={pending} onClick={() => run(() => confirmSettlement(sheet.row.settlement!.id))} className="h-12 rounded-trevu bg-trevu-600 text-base font-semibold text-white disabled:opacity-60" data-testid="settle-confirm-ok">{t("expenses.settlePage.confirmOk")}</button>
              )}
              {sheet.kind === "dispute" && sheet.row.settlement && (
                <button type="button" disabled={pending} onClick={() => run(() => disputeSettlement({ settlementId: sheet.row.settlement!.id, note }))} className="h-12 rounded-trevu border border-red-500 text-base font-semibold text-red-600 disabled:opacity-60" data-testid="settle-dispute-ok">{t("expenses.settlePage.disputeOk")}</button>
              )}
              <button type="button" onClick={() => setSheet(null)} className="h-12 rounded-trevu bg-navy-100 text-base font-semibold text-navy-900">{t("expenses.form.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
