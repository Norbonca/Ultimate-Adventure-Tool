"use client";

// Design: D02 `XKV28` dangerSec (Beállítások tab) + `v54yy` dialogs A/B/C + `m5cJrw` (mobile bottom sheet).
// BR-M02-009: draft → delete; published without applicants → soft delete (30 days); with applicants → cancel.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Button, Dialog } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { deleteOrCancelTrip, fetchTripApplicantCount } from "@/app/(app)/trips/deletion-actions";
import {
  CANCELLATION_REASONS,
  CANCELLATION_REASON_LABEL,
  tripDeletionMode,
  type CancellationReason,
  type TripDeletionMode,
} from "@/lib/trip-deletion";

interface TripDangerZoneProps {
  tripId: string;
  slug: string;
  title: string;
  status: string;
}

export function TripDangerZone({ tripId, slug, title, status }: TripDangerZoneProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [mode, setMode] = useState<TripDeletionMode>(null);
  const [applicants, setApplicants] = useState(0);
  const [reason, setReason] = useState<CancellationReason | "">("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deletable = tripDeletionMode(status, 0) !== null;
  const [until, setUntil] = useState("");

  const open = async () => {
    setError(null);
    setBusy(true);
    const count = status === "draft" ? 0 : await fetchTripApplicantCount(tripId);
    setBusy(false);
    if (count === null) {
      setError(t("trips.deletion.failed"));
      return;
    }
    setApplicants(count);
    setUntil(
      new Intl.DateTimeFormat(locale === "en" ? "en-US" : "hu-HU", { dateStyle: "long" }).format(
        new Date(Date.now() + 30 * 86_400_000)
      )
    );
    setMode(tripDeletionMode(status, count));
  };

  const close = () => {
    if (busy) return;
    setMode(null);
    setReason("");
    setMessage("");
    setError(null);
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const res = await deleteOrCancelTrip(tripId, mode === "cancel" ? (reason || undefined) : undefined, message.trim() || undefined);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMode(null);
    router.push(res.result === "cancelled" ? `/trips/${slug}` : "/trips");
    router.refresh();
  };

  const dialog = {
    draft: {
      icon: "trash-2",
      tone: "danger" as const,
      title: t("trips.deletion.draftTitle", { title }),
      body: t("trips.deletion.draftBody"),
      confirm: t("trips.deletion.draftConfirm"),
    },
    soft: {
      icon: "archive",
      tone: "danger" as const,
      title: t("trips.deletion.softTitle", { title }),
      body: t("trips.deletion.softBody"),
      confirm: t("trips.deletion.softConfirm"),
    },
    cancel: {
      icon: "calendar",
      tone: "warning" as const,
      title: t("trips.deletion.cancelTitle", { title }),
      body: t("trips.deletion.cancelBody", { count: applicants }),
      confirm: t("trips.deletion.cancelConfirm"),
    },
  };
  const current = mode ? dialog[mode] : null;

  return (
    <section className="mt-8 pt-6 border-t border-navy-200" aria-labelledby="trip-danger-title">
      <h3 id="trip-danger-title" className="text-base font-semibold text-navy-900 mb-3">
        {t("trips.deletion.sectionTitle")}
      </h3>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-coral bg-[var(--color-danger-subtle)] px-5 py-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy-900">{t("trips.deletion.rowTitle")}</p>
          <p className="text-[13px] leading-relaxed text-navy-600 mt-1">
            {deletable ? t("trips.deletion.rowDesc") : t("trips.deletion.completedNote")}
          </p>
          {error && !mode && <p role="alert" className="text-[13px] text-red-600 mt-2">{error}</p>}
        </div>
        <button
          type="button"
          onClick={open}
          disabled={!deletable || busy}
          className="inline-flex items-center justify-center gap-2 rounded-trevu border border-coral bg-white px-5 py-3 text-[15px] font-semibold text-red-600 hover:bg-[var(--color-danger-subtle)] transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          <Icon name="trash-2" size={18} />
          <span>{t("trips.deletion.button")}</span>
        </button>
      </div>

      {current && (
        <Dialog
          open
          onClose={close}
          busy={busy}
          icon={current.icon}
          tone={current.tone}
          title={current.title}
          description={current.body}
          actions={
            <>
              <Button
                variant="danger"
                icon={current.icon}
                loading={busy}
                disabled={mode === "cancel" && !reason}
                onClick={confirm}
              >
                {current.confirm}
              </Button>
              <Button variant="outline" onClick={close} disabled={busy}>
                {t("common.cancel")}
              </Button>
            </>
          }
        >
          {mode === "soft" && (
            <p className="flex items-center gap-2.5 rounded-trevu bg-trevu-50 px-3.5 py-3 text-[13px] font-semibold text-trevu-700">
              <Icon name="refresh-cw" size={18} />
              {t("trips.deletion.softUndo", { date: until })}
            </p>
          )}
          {mode === "cancel" && (
            <>
              <div>
                <label htmlFor="cancel-reason" className="block text-sm font-semibold text-navy-900 mb-1.5">
                  {t("trips.deletion.reasonLabel")} <span className="text-coral">*</span>
                </label>
                <select
                  id="cancel-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value as CancellationReason | "")}
                  className="input-trevu w-full min-h-[48px] px-3.5 text-[15px]"
                >
                  <option value="">{t("trips.deletion.reasonPlaceholder")}</option>
                  {CANCELLATION_REASONS.map((value) => (
                    <option key={value} value={value}>
                      {t(CANCELLATION_REASON_LABEL[value])}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="cancel-message" className="block text-sm font-semibold text-navy-900 mb-1.5">
                  {t("trips.deletion.messageLabel")}
                </label>
                <textarea
                  id="cancel-message"
                  value={message}
                  maxLength={2000}
                  rows={3}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={t("trips.deletion.messagePlaceholder")}
                  className="input-trevu w-full px-3.5 py-3 text-sm resize-none"
                />
              </div>
            </>
          )}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </Dialog>
      )}
    </section>
  );
}
