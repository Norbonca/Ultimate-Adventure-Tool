"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { applyToTrip, cancelApplication } from "@/app/(app)/trips/actions";

type Participation = {
  id: string;
  status:
    | "pending"
    | "approved"
    | "approved_pending_payment"
    | "participant"
    | "rejected"
    | "waitlisted"
    | "cancelled";
  application_text: string | null;
  rejection_reason: string | null;
} | null;

interface ApplyButtonProps {
  tripId: string;
  requireApproval: boolean;
  spotsLeft: number;
  isAuthenticated: boolean;
  participation: Participation;
}

export function ApplyButton({
  tripId,
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

  // 1) Nem bejelentkezett → login redirect link
  if (!isAuthenticated) {
    return (
      <a
        href={`/login?redirect=/trips`}
        className="block w-full py-3 text-center bg-trevu-600 text-white font-bold rounded-xl hover:bg-trevu-700 transition-colors shadow-lg shadow-trevu-600/20"
      >
        {t("trips.detail.loginToApply")}
      </a>
    );
  }

  // 2) Már van jelentkezés (status !== cancelled) → státusz megjelenítés + cancel opció
  if (participation && participation.status !== "cancelled") {
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
              💬 {t("trips.detail.yourMessage")}
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

  // 3) Nincs jelentkezés (vagy cancelled) → apply form
  const handleApply = () => {
    setError(null);
    startTransition(async () => {
      const res = await applyToTrip(tripId, message);
      if (!res.ok) {
        setError(res.error || t("errors.generic"));
        return;
      }
      setShowForm(false);
      setMessage("");
      router.refresh();
    });
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        disabled={spotsLeft <= 0 && !requireApproval}
        className="w-full py-3 bg-trevu-600 text-white font-bold rounded-xl hover:bg-trevu-700 transition-colors shadow-lg shadow-trevu-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {t("trips.detail.apply")}
      </button>
    );
  }

  return (
    <div className="space-y-3">
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

      {requireApproval && (
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
          disabled={isPending}
          className="flex-1 py-2.5 text-sm font-bold text-white bg-trevu-600 hover:bg-trevu-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending
            ? t("common.loading")
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
