"use client";

/**
 * Jelentkezés a túrára.
 * M024 (design/D02_Trip_Management.pen#s9YQ4F 1440, #X8RfTp 390, siker #OUuEB): ha a túra egy sorozat
 * időpontja, a felhasználó itt választja ki, melyik időpontra jelentkezik (BR-M024-004); a jelentkezés a
 * választott időpont önálló túrájára jön létre. Siker után a választott dátum és a Túráim látszik.
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { applyToTrip, cancelApplication } from "@/app/(app)/trips/actions";
import { Icon } from "@/components/Icon";

type Participation = {
  id: string;
  status:
    | "pending"
    | "approved"
    | "approved_pending_payment"
    | "participant"
    | "rejected"
    | "waitlisted"
    | "cancelled"
    | "removed";
  application_text: string | null;
  rejection_reason: string | null;
  removal_message?: string | null;
} | null;

/** M024: a sorozat egy időpontja a jelentkezési választóban. */
export interface ApplySeriesOption {
  tripId: string;
  slug: string;
  dateLabel: string;
  priceLabel: string;
  spotsLeft: number;
  requireApproval: boolean;
  /** Határidő lejárt / nem fogad jelentkezést. */
  closed: boolean;
  /** A felhasználónak már van élő jelentkezése erre az időpontra. */
  applied: boolean;
}

interface ApplyButtonProps {
  tripId: string;
  /** A bejelentkezés utáni visszatéréshez (GAP-007). */
  tripSlug: string;
  /** M024: a sorozat időpontjai (legalább kettő esetén időpontválasztó). */
  seriesOptions?: ApplySeriesOption[];
  requireApproval: boolean;
  spotsLeft: number;
  isAuthenticated: boolean;
  participation: Participation;
}

const selectable = (o: ApplySeriesOption) => !o.closed && !o.applied && (o.spotsLeft > 0 || o.requireApproval);

export function ApplyButton({
  tripId,
  tripSlug,
  seriesOptions,
  requireApproval,
  spotsLeft,
  isAuthenticated,
  participation,
}: ApplyButtonProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const options = seriesOptions && seriesOptions.length > 1 ? seriesOptions : null;
  const defaultChoice = options
    ? (options.find((o) => o.tripId === tripId && selectable(o)) ?? options.find(selectable))?.tripId ?? null
    : tripId;
  const [chosenId, setChosenId] = useState<string | null>(defaultChoice);
  const chosen = options?.find((o) => o.tripId === chosenId) ?? null;
  const [success, setSuccess] = useState<{ dateLabel: string | null; slug: string; status?: string } | null>(null);

  // 0) M024: sikeres jelentkezés — a választott dátummal (D02 #OUuEB)
  if (success) {
    return (
      <div className="space-y-3 text-center" role="status" data-testid="apply-success">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)]">
          <Icon name="check" size={28} className="text-[var(--color-success)]" />
        </div>
        <p className="text-lg font-bold text-navy-900">{t("series.successTitle")}</p>
        {success.dateLabel && (
          <p className="inline-flex items-center gap-2 rounded-lg bg-trevu-50 px-3 py-2 text-sm font-semibold text-navy-900" data-testid="apply-success-date">
            <Icon name="calendar-days" size={16} className="text-trevu-700" />
            {t("series.successDate", { date: success.dateLabel })}
          </p>
        )}
        <p className="text-sm text-navy-500">
          {success.status === "approved" ? t("series.successBodyApproved") : t("series.successBodyPending")}
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/trips" className="block w-full rounded-xl bg-trevu-600 py-3 text-center font-bold text-white hover:bg-trevu-700">
            {t("series.openMyTrips")}
          </Link>
          {success.slug !== tripSlug ? (
            <Link href={`/trips/${success.slug}`} className="block w-full rounded-xl border border-navy-200 py-3 text-center font-semibold text-navy-700 hover:bg-navy-50">
              {t("series.backToTrip")}
            </Link>
          ) : (
            <button type="button" onClick={() => setSuccess(null)} className="block w-full rounded-xl border border-navy-200 py-3 text-center font-semibold text-navy-700 hover:bg-navy-50">
              {t("series.backToTrip")}
            </button>
          )}
        </div>
      </div>
    );
  }

  // 1) Nem bejelentkezett → login, majd vissza erre a túrára (GAP-007)
  if (!isAuthenticated) {
    return (
      <a
        href={`/login?redirect=${encodeURIComponent(`/trips/${tripSlug}`)}`}
        className="block w-full py-3 text-center bg-trevu-600 text-white font-bold rounded-xl hover:bg-trevu-700 transition-colors shadow-lg shadow-trevu-600/20"
      >
        {t("trips.detail.loginToApply")}
      </a>
    );
  }

  // 2) Már van jelentkezés (status !== cancelled/removed) → státusz megjelenítés + cancel opció
  if (participation && participation.status !== "cancelled" && participation.status !== "removed") {
    const statusConfig: Record<
      string,
      { label: string; bg: string; text: string; border: string; canCancel: boolean }
    > = {
      pending: {
        label: t("trips.participantStatus.pending"),
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        canCancel: true,
      },
      approved: {
        label: t("trips.participantStatus.approved"),
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
        canCancel: true,
      },
      approved_pending_payment: {
        label: t("trips.participant.awaitingPayment"),
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        canCancel: true,
      },
      participant: {
        label: t("trips.participantStatus.participant"),
        bg: "bg-trevu-50",
        text: "text-trevu-700",
        border: "border-trevu-200",
        canCancel: false,
      },
      rejected: {
        label: t("trips.participantStatus.rejected"),
        bg: "bg-red-50",
        text: "text-red-600",
        border: "border-red-200",
        canCancel: false,
      },
      waitlisted: {
        label: t("trips.participantStatus.waitlisted"),
        bg: "bg-navy-50",
        text: "text-navy-500",
        border: "border-navy-200",
        canCancel: true,
      },
    };
    const cfg = statusConfig[participation.status];

    const handleCancel = () => {
      if (!confirm(t("trips.detail.confirmCancel"))) return;
      setError(null);
      startTransition(async () => {
        const res = await cancelApplication(tripId);
        if (!res.ok) {
          setError(res.error || t("errors.generic"));
          return;
        }
        router.refresh();
      });
    };

    return (
      <div className="space-y-3">
        <div
          className={`w-full py-3 text-center font-semibold rounded-xl border ${cfg.bg} ${cfg.text} ${cfg.border}`}
        >
          {cfg.label}
        </div>

        {participation.status === "rejected" && participation.rejection_reason && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">
            {participation.rejection_reason}
          </p>
        )}

        {participation.application_text && (
          <div className="text-xs text-navy-500 bg-navy-50 rounded-lg p-3">
            <span className="font-semibold block mb-1">
              <Icon name="message-circle" size={12} className="inline -mt-0.5 mr-1" />{t("trips.detail.yourMessage")}
            </span>
            <span className="whitespace-pre-wrap">{participation.application_text}</span>
          </div>
        )}

        {cfg.canCancel && (
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="w-full text-xs text-navy-500 hover:text-red-600 underline disabled:opacity-50"
          >
            {isPending ? t("common.loading") : t("trips.detail.cancelApplication")}
          </button>
        )}

        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{error}</p>
        )}
      </div>
    );
  }

  // 3) Nincs jelentkezés (vagy cancelled / removed — §11.5.3: az eltávolított újra jelentkezhet) → apply form
  const targetId = options ? chosenId : tripId;
  const handleApply = () => {
    if (!targetId) return;
    setError(null);
    startTransition(async () => {
      const res = await applyToTrip(targetId, message);
      if (!res.ok) {
        setError(res.error || t("errors.generic"));
        return;
      }
      setShowForm(false);
      setMessage("");
      if (options) {
        setSuccess({ dateLabel: chosen?.dateLabel ?? null, slug: chosen?.slug ?? tripSlug, status: res.status });
      }
      router.refresh();
    });
  };
  const anySelectable = options ? options.some(selectable) : true;
  const applied = options?.filter((o) => o.applied) ?? [];

  // Az eltávolítás ténye és a szervező üzenete az újrajelentkezés fölött látszik (D02 o4u2N6 következménye).
  const removedNotice =
    participation?.status === "removed" ? (
      <div className="text-xs text-navy-600 bg-navy-50 rounded-lg p-3 space-y-1">
        <p className="font-semibold">{t("trips.detail.removedNotice")}</p>
        {participation.removal_message && (
          <p className="whitespace-pre-wrap">
            <span className="font-semibold">{t("trips.detail.removalMessage")}: </span>
            {participation.removal_message}
          </p>
        )}
      </div>
    ) : null;

  if (!showForm) {
    return (
      <div className="space-y-3">
        {removedNotice}
        <button
          onClick={() => setShowForm(true)}
          disabled={options ? !anySelectable : spotsLeft <= 0 && !requireApproval}
          className="w-full py-3 bg-trevu-600 text-white font-bold rounded-xl hover:bg-trevu-700 transition-colors shadow-lg shadow-trevu-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t("trips.detail.apply")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {removedNotice}
      {options && (
        <fieldset className="space-y-2" data-testid="apply-series-options">
          <legend className="mb-2 text-sm font-semibold text-navy-900">{t("series.chooseDate")}</legend>
          {applied.length > 0 && (
            <p className="flex gap-2 rounded-lg bg-trevu-50 p-2.5 text-xs text-navy-700" data-testid="apply-series-already">
              <Icon name="info" size={14} className="mt-0.5 shrink-0 text-trevu-700" />
              {t("series.alreadyApplied", { dates: applied.map((o) => o.dateLabel).join(", ") })}
            </p>
          )}
          {options.map((o) => {
            const enabled = selectable(o);
            const full = o.spotsLeft <= 0;
            const hint = o.applied
              ? t("series.alreadyAppliedOption")
              : o.closed
                ? t("series.closed")
                : full
                  ? o.requireApproval ? t("series.waitlistHint") : t("series.full")
                  : t("series.spots", { count: o.spotsLeft });
            return (
              <label
                key={o.tripId}
                className={[
                  "flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2",
                  enabled ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                  chosenId === o.tripId ? "border-trevu-600 bg-trevu-50" : "border-navy-200",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name={`apply-date-${tripId}`}
                  value={o.tripId}
                  checked={chosenId === o.tripId}
                  disabled={!enabled}
                  onChange={() => setChosenId(o.tripId)}
                  className="h-5 w-5 accent-trevu-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-navy-900">{o.dateLabel}</span>
                  <span className={`block text-xs ${full && !o.applied && !o.closed ? "text-[var(--color-danger)]" : "text-navy-500"}`}>{hint}</span>
                </span>
                <span className="text-sm font-semibold text-navy-700">{o.priceLabel}</span>
              </label>
            );
          })}
        </fieldset>
      )}
      <div>
        <label className="text-xs font-semibold text-navy-600 mb-1 block">
          {t("trips.detail.applicationMessage")}
          <span className="text-navy-400 font-normal ml-1">
            ({t("common.optional")})
          </span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder={t("trips.detail.applicationMessagePlaceholder")}
          className="w-full px-3 py-2 text-sm border border-navy-200 rounded-lg focus:border-trevu-500 focus:ring-2 focus:ring-trevu-100 outline-none resize-none"
        />
        <div className="text-right text-[10px] text-navy-400 mt-0.5">
          {message.length}/1000
        </div>
      </div>

      {(chosen ? chosen.requireApproval : requireApproval) && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 leading-relaxed">
          ℹ️ {t("trips.detail.approvalRequiredNote")}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => {
            setShowForm(false);
            setMessage("");
            setError(null);
          }}
          disabled={isPending}
          className="flex-1 py-2.5 text-sm font-semibold text-navy-600 bg-navy-50 hover:bg-navy-100 rounded-lg transition-colors disabled:opacity-50"
        >
          {t("common.cancel")}
        </button>
        <button
          onClick={handleApply}
          disabled={isPending || !targetId}
          data-testid="apply-submit"
          className="flex-1 py-2.5 text-sm font-bold text-white bg-trevu-600 hover:bg-trevu-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending
            ? t("common.loading")
            : chosen
              ? t("series.applyFor", { date: chosen.dateLabel })
              : requireApproval
                ? t("trips.detail.submitApplication")
                : t("trips.detail.joinTrip")}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{error}</p>
      )}
    </div>
  );
}
