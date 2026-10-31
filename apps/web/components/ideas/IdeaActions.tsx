"use client";

/**
 * M22 — az adatlap műveletei (FR-M22-004 táblája, FR-M22-005/006/007/014/015).
 * Design: D22 `o4u2N6` (csatlakozás panel), `b28y26` (vállalás panel). A panelek a közös Dialog-on.
 * Egy elsődleges művelet nézőhelyzetenként (CLAUDE.md 3.8 Action Hierarchy).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { joinIdea, leaveIdea, offerIdea, reportIdea, withdrawOffer } from "@/app/(app)/ideas/actions";
import { monthName } from "@/lib/ideas/window";
import type { IdeaReportReason } from "@/lib/ideas/types";

export interface IdeaActionsProps {
  ideaId: string;
  slug: string;
  joinable: boolean;
  isOwner: boolean;
  userId: string | null;
  member: { party_size: number; is_anonymous: boolean } | null;
  offered: boolean;
  reported: boolean;
  windowMonths: number[];
  /** mobil ragadós sáv (D22 M0RLZp) vagy asztali kártya */
  layout?: "card" | "sticky";
}

export function IdeaActions(p: IdeaActionsProps) {
  const { t: tt, locale } = useTranslation();
  const t = tt as (k: string, p?: Record<string, string | number>) => string;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<null | "join" | "offer" | "report">(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // csatlakozás panel állapota
  const [note, setNote] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [months, setMonths] = useState<number[]>(p.windowMonths);
  const [anon, setAnon] = useState(false);
  // vállalás panel
  const [message, setMessage] = useState("");
  const [planned, setPlanned] = useState<number[]>([]);
  // bejelentés
  const [reason, setReason] = useState<IdeaReportReason>("hidden_commercial");

  const loginHref = `/login?redirect=/ideas/${p.slug}`;
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done: string) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) { setError(t(`ideas.errors.${res.error ?? "saveFailed"}`)); return; }
      setDialog(null); setToast(done); router.refresh();
      setTimeout(() => setToast(null), 4000);
    });

  const toggle = (arr: number[], m: number, set: (v: number[]) => void) => set(arr.includes(m) ? arr.filter((x) => x !== m) : [...arr, m].sort((a, b) => a - b));

  const primary = (() => {
    if (p.isOwner) return <Button href={`/ideas/${p.slug}/edit`} icon="pencil" fullWidth>{t("ideas.detail.edit")}</Button>;
    if (p.offered) return <Button href={`/trips/new?idea=${p.ideaId}`} icon="lightbulb" fullWidth>{t("ideas.detail.createTrip")}</Button>;
    if (!p.joinable) return null;
    if (p.member) return <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-trevu bg-ghost text-sm font-semibold text-ink" data-testid="idea-joined"><Icon name="check" size={16} aria-hidden />{t("ideas.detail.joined")}</span>;
    if (!p.userId) return <Button href={loginHref} icon="hand" fullWidth>{t("ideas.detail.join")}</Button>;
    return <Button icon="hand" fullWidth onClick={() => setDialog("join")} data-testid="idea-join">{t("ideas.detail.join")}</Button>;
  })();

  const secondary: React.ReactNode[] = [];
  if (!p.isOwner && p.joinable) {
    if (p.member) secondary.push(<Button key="leave" variant="outline" size="sm" loading={pending} onClick={() => run(() => leaveIdea(p.ideaId), t("ideas.detail.leftToast"))}>{t("ideas.detail.leave")}</Button>);
    if (p.offered) secondary.push(<Button key="withdraw" variant="outline" size="sm" loading={pending} onClick={() => run(() => withdrawOffer(p.ideaId), t("ideas.detail.withdrawnToast"))}>{t("ideas.detail.withdrawOffer")}</Button>);
    else secondary.push(<Button key="offer" variant="outline" size="sm" icon="clipboard-check" href={p.userId ? undefined : loginHref} onClick={p.userId ? () => setDialog("offer") : undefined} data-testid="idea-offer">{t("ideas.detail.organize")}</Button>);
  }
  if (p.isOwner && p.joinable) secondary.push(<Button key="offer-own" variant="outline" size="sm" icon="clipboard-check" onClick={() => setDialog("offer")}>{t("ideas.detail.organize")}</Button>);
  secondary.push(<ShareButton key="share" slug={p.slug} label={t("ideas.detail.share")} copied={t("ideas.detail.copied")} />);
  if (p.userId && !p.isOwner && !p.reported) secondary.push(<Button key="report" variant="ghost" size="sm" icon="flag" onClick={() => setDialog("report")}>{t("ideas.detail.report")}</Button>);

  const wrap = p.layout === "sticky" ? "flex items-center gap-3" : "flex flex-col gap-3";

  return (
    <div className={wrap} data-testid="idea-actions">
      {primary && <div className={p.layout === "sticky" ? "flex-1" : ""}>{primary}</div>}
      {p.layout !== "sticky" && secondary.length > 0 && <div className="flex flex-wrap gap-2">{secondary}</div>}
      {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
      {toast && <p role="status" className="rounded-trevu bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] px-3 py-2 text-sm text-ink">{toast}</p>}

      {dialog === "join" && (
        <Dialog open onClose={() => setDialog(null)} busy={pending} icon="hand" tone="primary" title={t("ideas.join.title")} description={t("ideas.join.body")}
          actions={<><Button icon="hand" loading={pending} onClick={() => run(() => joinIdea({ idea_id: p.ideaId, note, preferred_months: months, is_anonymous: anon, party_size: partySize }), t("ideas.join.doneToast"))}>{t("ideas.detail.join")}</Button><Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>{t("common.cancel")}</Button></>}>
          <div className="space-y-4">
            <div>
              <label htmlFor="idea-join-note" className="mb-1.5 block text-sm font-semibold text-navy-900">{t("ideas.join.noteLabel")}</label>
              <textarea id="idea-join-note" value={note} maxLength={300} rows={3} onChange={(e) => setNote(e.target.value)} placeholder={t("ideas.join.notePlaceholder")} className="input-trevu w-full resize-none px-3.5 py-3 text-sm" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-navy-900">{t("ideas.join.partySize")}</span>
              <span className="inline-flex items-center rounded-trevu border border-navy-200">
                <button type="button" aria-label="−" className="h-9 w-9 text-lg" onClick={() => setPartySize((v) => Math.max(1, v - 1))}>−</button>
                <span className="w-14 text-center text-sm font-semibold" data-testid="idea-party-size">{t("ideas.common.people", { count: partySize })}</span>
                <button type="button" aria-label="+" className="h-9 w-9 text-lg" onClick={() => setPartySize((v) => Math.min(10, v + 1))}>+</button>
              </span>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-navy-900">{t("ideas.join.monthsLabel")}</p>
              <div className="flex flex-wrap gap-2">
                {p.windowMonths.map((m) => (
                  <button key={m} type="button" aria-pressed={months.includes(m)} onClick={() => toggle(months, m, setMonths)} className={`inline-flex items-center gap-1 rounded-chip px-3 py-1.5 text-xs font-semibold ${months.includes(m) ? "bg-trevu-50 text-trevu-700" : "bg-navy-50 text-navy-600"}`}>
                    {months.includes(m) && <Icon name="check" size={12} aria-hidden />}{monthName(m, locale)}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between gap-3 text-sm text-navy-900">
              <span>{t("ideas.join.anonymous")}</span>
              <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="h-5 w-5 accent-trevu-600" />
            </label>
          </div>
        </Dialog>
      )}

      {dialog === "offer" && (
        <Dialog open onClose={() => setDialog(null)} busy={pending} icon="clipboard-check" tone="primary" title={t("ideas.offer.title")} description={t("ideas.offer.body")}
          actions={<><Button icon="clipboard-check" loading={pending} onClick={() => run(() => offerIdea({ idea_id: p.ideaId, message, planned_months: planned }), t("ideas.offer.doneToast"))}>{t("ideas.offer.confirm")}</Button><Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>{t("common.cancel")}</Button></>}>
          <div className="space-y-4">
            <div>
              <label htmlFor="idea-offer-msg" className="mb-1.5 block text-sm font-semibold text-navy-900">{t("ideas.offer.messageLabel")}</label>
              <textarea id="idea-offer-msg" value={message} maxLength={500} rows={3} onChange={(e) => setMessage(e.target.value)} placeholder={t("ideas.offer.messagePlaceholder")} className="input-trevu w-full resize-none px-3.5 py-3 text-sm" />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-navy-900">{t("ideas.offer.monthsLabel")}</p>
              <div className="flex flex-wrap gap-2">
                {p.windowMonths.map((m) => (
                  <button key={m} type="button" aria-pressed={planned.includes(m)} onClick={() => toggle(planned, m, setPlanned)} className={`inline-flex items-center gap-1 rounded-chip px-3 py-1.5 text-xs font-semibold ${planned.includes(m) ? "bg-trevu-50 text-trevu-700" : "bg-navy-50 text-navy-600"}`}>
                    {planned.includes(m) && <Icon name="check" size={12} aria-hidden />}{monthName(m, locale)}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-navy-500">{t("ideas.offer.hint")}</p>
          </div>
        </Dialog>
      )}

      {dialog === "report" && (
        <Dialog open onClose={() => setDialog(null)} busy={pending} icon="flag" tone="danger" title={t("ideas.report.title")} description={t("ideas.report.body")}
          actions={<><Button variant="danger" icon="flag" loading={pending} onClick={() => run(() => reportIdea({ idea_id: p.ideaId, reason }), t("ideas.report.doneToast"))}>{t("ideas.report.confirm")}</Button><Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>{t("common.cancel")}</Button></>}>
          <div className="space-y-2">
            {(["hidden_commercial", "spam", "inappropriate", "other"] as IdeaReportReason[]).map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm text-navy-900"><input type="radio" name="idea-report-reason" checked={reason === r} onChange={() => setReason(r)} className="accent-trevu-600" />{t(`ideas.report.reason_${r}`)}</label>
            ))}
          </div>
        </Dialog>
      )}
    </div>
  );
}

function ShareButton({ slug, label, copied }: { slug: string; label: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button variant="outline" size="sm" icon="share-2" onClick={async () => {
      const url = `${window.location.origin}/ideas/${slug}`;
      try {
        if (navigator.share) await navigator.share({ url });
        else { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 2000); }
      } catch { /* a felhasználó bezárta */ }
    }}>{done ? copied : label}</Button>
  );
}
