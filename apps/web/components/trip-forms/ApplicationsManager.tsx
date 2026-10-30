"use client";

/**
 * ApplicationsManager — szervezői döntés a függő jelentkezésekről.
 * Design: design/D02_Trip_Management.pen → "Trip Edit - Csapat tab" (`lIGgE`, mobil `aP0QW`),
 * "FÜGGŐBEN LEVŐ JELENTKEZÉSEK" blokk: sor = avatar + név + meta, jobbra Elfogad (primary) /
 * Várólistára (másodlagos, csak `pending`) / Elutasít (outline, danger). Az elutasítás a kártyán
 * belül bomlik ki: címkézett szövegmező (max 1000, opcionális), számláló, „Elutasítás küldése" + „Mégse".
 * A várólistás sor „VÁRÓLISTÁN" jelölést kap, és Elfogad / Elutasít gombokkal a listában marad.
 * Spec: 00_Rendszerszintu_Funkcionalis_Specifikacio.md §11.5.2–§11.5.3.
 *
 * Használat: Trip Edit → Csapat tab (`applicationsSlot`) és `/trips/[slug]/manage`.
 * `initial` nélkül maga tölti be a résztvevőket (StaffSeatsManager-minta).
 */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  approveApplication,
  rejectApplication,
  waitlistApplication,
  checkInParticipant,
  removeParticipant,
  fetchTripParticipants,
} from "@/app/(app)/trips/actions";
import { Icon } from "@/components/Icon";
import { notifyParticipantsChanged, useParticipantsChanged } from "@/lib/participants-events";
import { RemoveMemberModal } from "./RemoveMemberModal";

type ProfileLite = { display_name: string | null; avatar_url: string | null } | null;
type PositionLite = { id: string; role_name: string | null } | null;

export interface ParticipantRow {
  id: string;
  user_id: string;
  status: string;
  application_text: string | null;
  applied_at: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  checked_in_at?: string | null;
  is_staff_seat?: boolean;
  profiles: ProfileLite | ProfileLite[];
  trip_crew_positions?: PositionLite | PositionLite[];
}

const MEMBER_STATUSES = ["approved", "approved_pending_payment", "participant"];
const REJECTION_MAX = 1000;

function profileOf(p: ParticipantRow): ProfileLite {
  return Array.isArray(p.profiles) ? p.profiles[0] ?? null : p.profiles;
}

function positionOf(p: ParticipantRow): PositionLite {
  const pos = p.trip_crew_positions;
  if (!pos) return null;
  return Array.isArray(pos) ? pos[0] ?? null : pos;
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div
      className="rounded-full bg-trevu-500 text-white flex items-center justify-center font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function useParticipants(tripId: string, initial?: ParticipantRow[]) {
  const [rows, setRows] = useState<ParticipantRow[] | null>(initial ?? null);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    if (initial && reloadKey === 0) return;
    let alive = true;
    fetchTripParticipants(tripId)
      .then((data) => alive && setRows(data as ParticipantRow[]))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [tripId, initial, reloadKey]);
  useParticipantsChanged(tripId, () => setReloadKey((k) => k + 1));
  return [rows, setRows] as const;
}

interface ApplicationsManagerProps {
  tripId: string;
  /** Szerver oldalon már lekért résztvevők (manage oldal) — ha nincs, a komponens tölt. */
  initial?: ParticipantRow[];
}

const btnBase =
  "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 min-h-[36px]";
const btnPrimary = `${btnBase} bg-trevu-600 text-white hover:bg-trevu-700`;
const btnSecondary = `${btnBase} border border-navy-200 bg-white text-navy-700 hover:bg-navy-50`;
const btnDangerOutline = `${btnBase} border border-navy-200 bg-white text-red-600 hover:bg-red-50`;
const btnDanger = `${btnBase} bg-red-500 text-white hover:bg-red-600`;

export function ApplicationsManager({ tripId, initial }: ApplicationsManagerProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [rows, setRows] = useParticipants(tripId, initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Melyik kártya van „Elutasítás — indoklás megadása" állapotban, és mit írt a szervező. */
  const [rejecting, setRejecting] = useState<{ id: string; reason: string } | null>(null);
  const [, startTransition] = useTransition();
  const dateLocale = locale === "en" ? "en-US" : "hu-HU";

  if (rows === null) {
    return <p className="text-sm text-navy-400 py-3 text-center">{t("trips.crew.applicationsLoading")}</p>;
  }

  const pending = rows.filter(
    (p) => !p.is_staff_seat && (p.status === "pending" || p.status === "waitlisted")
  );
  if (pending.length === 0) {
    return <p className="text-sm text-navy-400 py-3 text-center">{t("trips.crew.noApplications")}</p>;
  }

  const run = (
    participantId: string,
    nextStatus: string,
    call: () => Promise<{ ok: boolean; error?: string }>
  ) => {
    setError(null);
    setBusyId(participantId);
    startTransition(async () => {
      const res = await call();
      setBusyId(null);
      if (!res.ok) {
        setError(res.error || t("errors.generic"));
        return;
      }
      setRejecting(null);
      setRows((prev) =>
        (prev ?? []).map((p) => (p.id === participantId ? { ...p, status: nextStatus } : p))
      );
      notifyParticipantsChanged(tripId);
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      {pending.map((p) => {
        const name = profileOf(p)?.display_name || "—";
        const position = positionOf(p)?.role_name;
        const hasMessage = !!p.application_text;
        const busy = busyId === p.id;
        const isWaitlisted = p.status === "waitlisted";
        const isRejecting = rejecting?.id === p.id;
        const reason = isRejecting ? rejecting.reason : "";
        return (
          <div
            key={p.id}
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3"
            data-testid="application-card"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <Avatar name={name} />
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-navy-800">
                    <span className="truncate">{name}</span>
                    {isWaitlisted && (
                      <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        {t("trips.participantStatus.waitlisted")}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-navy-500">
                    {position
                      ? t("trips.crew.appliedForPosition", { position })
                      : t("trips.crew.appliedGeneral")}
                    {p.applied_at &&
                      ` · ${t("trips.crew.appliedOn", { date: new Date(p.applied_at).toLocaleDateString(dateLocale) })}`}
                    {" · "}
                    {hasMessage ? (
                      <>
                        <Icon name="message-circle" size={11} className="inline -mt-0.5 mr-0.5" />
                        {t("trips.crew.messageAttached")}
                      </>
                    ) : (
                      t("trips.crew.noMessage")
                    )}
                  </span>
                  {hasMessage && (
                    <p className="mt-2 rounded-lg bg-white/70 px-2.5 py-2 text-xs leading-relaxed text-navy-700 whitespace-pre-wrap">
                      {p.application_text}
                    </p>
                  )}
                </div>
              </div>

              {isRejecting ? (
                <span className="shrink-0 text-xs font-semibold text-red-600 sm:pt-2">
                  {t("trips.crew.rejectingTitle")}
                </span>
              ) : (
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => run(p.id, "approved", () => approveApplication(tripId, p.id))}
                    disabled={busy}
                    className={btnPrimary}
                  >
                    {busy ? t("trips.crew.deciding") : t("trips.manage.approve")}
                  </button>
                  {!isWaitlisted && (
                    <button
                      type="button"
                      onClick={() => run(p.id, "waitlisted", () => waitlistApplication(tripId, p.id))}
                      disabled={busy}
                      className={btnSecondary}
                    >
                      {t("trips.crew.waitlist")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setRejecting({ id: p.id, reason: "" });
                    }}
                    disabled={busy}
                    className={btnDangerOutline}
                  >
                    {t("trips.manage.reject")}
                  </button>
                </div>
              )}
            </div>

            {isRejecting && (
              <div className="mt-3 space-y-2">
                <label htmlFor={`reject-reason-${p.id}`} className="block text-xs font-semibold text-navy-800">
                  {t("trips.crew.rejectReasonLabel")}
                </label>
                <textarea
                  id={`reject-reason-${p.id}`}
                  value={reason}
                  maxLength={REJECTION_MAX}
                  rows={3}
                  onChange={(e) => setRejecting({ id: p.id, reason: e.target.value })}
                  placeholder={t("trips.crew.rejectReasonPlaceholder")}
                  className="w-full rounded-xl border border-navy-200 bg-white px-3 py-2.5 text-sm text-navy-900 outline-none transition-colors focus:border-trevu-500 focus:ring-2 focus:ring-trevu-500"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-navy-500">
                    {t("trips.crew.rejectReasonHint")} · {reason.length} / {REJECTION_MAX}
                  </span>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setRejecting(null)}
                      disabled={busy}
                      className={btnSecondary}
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        run(p.id, "rejected", () => rejectApplication(tripId, p.id, reason.trim() || undefined))
                      }
                      disabled={busy}
                      className={btnDanger}
                    >
                      {busy ? t("trips.crew.deciding") : t("trips.crew.rejectSubmit")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/**
 * CrewMembersList — elfogadott csapattagok sorai check-innel és eltávolítással
 * (Csapat tab „CSAPATTAGOK — check-in és eltávolítás" blokk, D02 `lIGgE`; modal `o4u2N6`).
 * Sor: avatar + név + státuszcímke; meta: vendég · pozíció · fizetés · jelentkezés dátuma;
 * jobbra „Check-in" (approved) vagy „Bejelentkezve · HH:MM" címke (participant), és az
 * `action.remove_member` ikon (`user-minus`). Mobilon a gombok teljes szélességű sorokban.
 */
export function CrewMembersList({ tripId, initial, max = 8 }: ApplicationsManagerProps & { max?: number }) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [rows, setRows] = useParticipants(tripId, initial);
  const [showAll, setShowAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<ParticipantRow | null>(null);
  const [, startTransition] = useTransition();
  const dateLocale = locale === "en" ? "en-US" : "hu-HU";

  if (rows === null) {
    return <p className="text-sm text-navy-400 py-3 text-center">{t("trips.crew.membersLoading")}</p>;
  }
  const members = rows.filter((p) => !p.is_staff_seat && MEMBER_STATUSES.includes(p.status));
  if (members.length === 0) {
    return <p className="text-sm text-navy-400 py-3 text-center">{t("trips.crew.noMembers")}</p>;
  }
  const shown = showAll ? members : members.slice(0, max);
  const rest = members.length - shown.length;

  const apply = (
    participantId: string,
    patch: Partial<ParticipantRow>,
    call: () => Promise<{ ok: boolean; error?: string }>
  ) => {
    setError(null);
    setBusyId(participantId);
    startTransition(async () => {
      const res = await call();
      setBusyId(null);
      if (!res.ok) {
        setError(res.error || t("errors.generic"));
        return;
      }
      setRemoving(null);
      setRows((prev) => (prev ?? []).map((p) => (p.id === participantId ? { ...p, ...patch } : p)));
      notifyParticipantsChanged(tripId);
      router.refresh();
    });
  };

  const statusLabel = (status: string) =>
    status === "participant"
      ? t("trips.participantStatus.participant")
      : status === "approved_pending_payment"
        ? t("trips.participantStatus.approvedPendingPayment")
        : t("trips.participantStatus.approved");

  return (
    <div className="space-y-2">
      {shown.map((p) => {
        const name = profileOf(p)?.display_name || "—";
        const position = positionOf(p)?.role_name;
        const busy = busyId === p.id;
        const checkedIn = p.status === "participant";
        const meta = [
          t("trips.crew.guest"),
          position ? t("trips.crew.positionMeta", { position }) : t("trips.crew.generalSeat"),
          p.paid_at ? t("trips.crew.paid") : t("trips.crew.paymentPending"),
          p.applied_at
            ? t("trips.crew.appliedShort", {
                date: new Date(p.applied_at).toLocaleDateString(dateLocale, { month: "2-digit", day: "2-digit" }),
              })
            : null,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <div
            key={p.id}
            className="flex flex-col gap-3 rounded-xl border border-navy-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            data-testid="member-row"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Avatar name={name} size={40} />
              <div className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-semibold text-navy-800">
                  <span className="truncate">{name}</span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      checkedIn ? "bg-trevu-50 text-trevu-700" : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {statusLabel(p.status)}
                  </span>
                </span>
                <span className="block text-xs text-navy-500 truncate">{meta}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {checkedIn ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-trevu-200 bg-trevu-50 px-3 py-1.5 text-xs font-semibold text-trevu-700">
                  <Icon name="clock" size={14} aria-hidden />
                  {t("trips.crew.checkedInAt", {
                    time: p.checked_in_at
                      ? new Date(p.checked_in_at).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })
                      : "—",
                  })}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    apply(p.id, { status: "participant", checked_in_at: new Date().toISOString() }, () =>
                      checkInParticipant(tripId, p.id)
                    )
                  }
                  disabled={busy}
                  className={`${btnSecondary} inline-flex items-center gap-1.5 w-full justify-center sm:w-auto`}
                >
                  <Icon name="check" size={14} aria-hidden />
                  {busy ? t("trips.crew.deciding") : t("trips.crew.checkIn")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setRemoving(p)}
                disabled={busy}
                aria-label={t("trips.crew.removeMember", { name })}
                title={t("trips.crew.removeMember", { name })}
                className="rounded-lg p-2 text-navy-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <Icon name="user-minus" size={18} aria-hidden />
              </button>
            </div>
          </div>
        );
      })}
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="block w-full py-2 text-center text-sm font-semibold text-trevu-700 hover:underline"
        >
          {t("trips.crew.showMoreMembers", { count: rest })}
        </button>
      )}
      {error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</p>}
      {removing && (
        <RemoveMemberModal
          name={profileOf(removing)?.display_name || "—"}
          busy={busyId === removing.id}
          onCancel={() => setRemoving(null)}
          onConfirm={(message) =>
            apply(removing.id, { status: "removed" }, () => removeParticipant(tripId, removing.id, message))
          }
        />
      )}
    </div>
  );
}
