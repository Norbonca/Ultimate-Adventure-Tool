"use client";

/**
 * M22 — az ötletgazda kezelőműveletei (FR-M22-011): lezárás okkal, a lezárás visszavonása
 * (Norbert, 2026-10-31), megújítás lejárt ötletnél, törlés. Design: D22 `p1frie`.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui";
import { closeIdea, deleteIdea, renewIdea, reopenIdea } from "@/app/(app)/ideas/actions";
import { autoYear, monthName } from "@/lib/ideas/window";
import type { IdeaCloseReason, IdeaStatus } from "@/lib/ideas/types";

export function IdeaOwnerActions({ ideaId, status, memberCount, hasLinkedTrips }: { ideaId: string; status: IdeaStatus; memberCount: number; hasLinkedTrips: boolean }) {
  const { t: tt, locale } = useTranslation();
  const t = tt as (k: string, p?: Record<string, string | number>) => string;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<null | "close" | "renew" | "delete">(null);
  const [reason, setReason] = useState<IdeaCloseReason>("no_longer_relevant");
  const [sm, setSm] = useState(1);
  const [em, setEm] = useState(2);
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, next?: string) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) { setError(t(`ideas.errors.${res.error ?? "saveFailed"}`)); return; }
      setDialog(null);
      if (next) router.push(next); else router.refresh();
    });

  const active = status === "open" || status === "organizing" || status === "converted";
  const deletable = memberCount <= 1 && !hasLinkedTrips;

  return (
    <div className="flex flex-wrap gap-2" data-testid="idea-owner-actions">
      {active && <Button variant="outline" size="sm" icon="x-circle" onClick={() => setDialog("close")}>{t("ideas.owner.close")}</Button>}
      {status === "closed" && <Button variant="outline" size="sm" icon="refresh-cw" loading={pending} onClick={() => run(() => reopenIdea(ideaId))}>{t("ideas.owner.reopen")}</Button>}
      {status === "expired" && <Button variant="outline" size="sm" icon="refresh-cw" onClick={() => setDialog("renew")}>{t("ideas.owner.renew")}</Button>}
      {deletable && <Button variant="ghost" size="sm" icon="trash-2" onClick={() => setDialog("delete")}>{t("ideas.owner.delete")}</Button>}
      {error && <p role="alert" className="w-full text-sm text-[var(--color-danger)]">{error}</p>}

      {dialog === "close" && (
        <Dialog open onClose={() => setDialog(null)} busy={pending} icon="x-circle" tone="danger" title={t("ideas.owner.closeTitle")} description={t("ideas.owner.closeBody")}
          actions={<><Button variant="danger" icon="x-circle" loading={pending} onClick={() => run(() => closeIdea({ idea_id: ideaId, reason }))}>{t("ideas.owner.closeConfirm")}</Button><Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>{t("common.cancel")}</Button></>}>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-semibold text-navy-900">{t("ideas.owner.closeReason")}</legend>
            {(["realized", "no_longer_relevant", "other"] as IdeaCloseReason[]).map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm text-navy-900"><input type="radio" name="idea-close-reason" checked={reason === r} onChange={() => setReason(r)} className="accent-trevu-600" />{t(`ideas.closeReason.${r}`)}</label>
            ))}
          </fieldset>
        </Dialog>
      )}

      {dialog === "renew" && (
        <Dialog open onClose={() => setDialog(null)} busy={pending} icon="refresh-cw" tone="primary" title={t("ideas.owner.renewTitle")} description={t("ideas.owner.renewBody")}
          actions={<><Button icon="refresh-cw" loading={pending} onClick={() => run(() => renewIdea({ idea_id: ideaId, window_start_month: sm, window_end_month: em, window_year: autoYear(sm, em) }))}>{t("ideas.owner.renewConfirm")}</Button><Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>{t("common.cancel")}</Button></>}>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-navy-900">{t("ideas.form.windowStart")}
              <select value={sm} onChange={(e) => setSm(Number(e.target.value))} className="input-trevu mt-1 w-full px-3 py-2 text-sm font-normal">{Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{monthName(m, locale)}</option>)}</select>
            </label>
            <label className="text-sm font-semibold text-navy-900">{t("ideas.form.windowEnd")}
              <select value={em} onChange={(e) => setEm(Number(e.target.value))} className="input-trevu mt-1 w-full px-3 py-2 text-sm font-normal">{Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{monthName(m, locale)}</option>)}</select>
            </label>
          </div>
          <p className="mt-2 text-xs text-navy-500">{t("ideas.form.yearAuto", { year: autoYear(sm, em) })}</p>
        </Dialog>
      )}

      {dialog === "delete" && (
        <Dialog open onClose={() => setDialog(null)} busy={pending} icon="trash-2" tone="danger" title={t("ideas.owner.deleteTitle")} description={t("ideas.owner.deleteBody")}
          actions={<><Button variant="danger" icon="trash-2" loading={pending} onClick={() => run(() => deleteIdea(ideaId), "/ideas/mine")}>{t("ideas.owner.deleteConfirm")}</Button><Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>{t("common.cancel")}</Button></>} />
      )}
    </div>
  );
}
