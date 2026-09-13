"use client";

/**
 * ApplicationsManager — szervezői döntés a függő jelentkezésekről.
 * Design: design/D02_Trip_Management.pen → "Trip Edit - Csapat tab" (`lIGgE`),
 * "FÜGGŐBEN LEVŐ JELENTKEZÉSEK" blokk (`8dIOy` + `ClNiF`): sor = avatar + név +
 * meta, jobbra Elfogad (primary) / Elutasít (outline, danger).
 * Spec: 00_Rendszerszintu_Funkcionalis_Specifikacio.md §11.5.
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
  fetchTripParticipants,
} from "@/app/(app)/trips/actions";
import { Icon } from "@/components/Icon";

type ProfileLite = { display_name: string | null; avatar_url: string | null } | null;

export interface ParticipantRow {
  id: string;
  user_id: string;
  status: string;
  application_text: string | null;
  applied_at: string | null;
  profiles: ProfileLite | ProfileLite[];
}

const MEMBER_STATUSES = ["approved", "approved_pending_payment", "participant"];

function profileOf(p: ParticipantRow): ProfileLite {
  return Array.isArray(p.profiles) ? p.profiles[0] ?? null : p.profiles;
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
  useEffect(() => {
    if (initial) return;
    let alive = true;
    fetchTripParticipants(tripId)
      .then((data) => alive && setRows(data as ParticipantRow[]))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [tripId, initial]);
  return [rows, setRows] as const;
}

interface ApplicationsManagerProps {
  tripId: string;
  /** Szerver oldalon már lekért résztvevők (manage oldal) — ha nincs, a komponens tölt. */
  initial?: ParticipantRow[];
}

export function ApplicationsManager({ tripId, initial }: ApplicationsManagerProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [rows, setRows] = useParticipants(tripId, initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const dateLocale = locale === "en" ? "en-US" : "hu-HU";

  if (rows === null) {
    return <p className="text-sm text-navy-400 py-3 text-center">{t("trips.crew.applicationsLoading")}</p>;
  }

  const pending = rows.filter((p) => p.status === "pending" || p.status === "waitlisted");
  if (pending.length === 0) {
    return <p className="text-sm text-navy-400 py-3 text-center">{t("trips.crew.noApplications")}</p>;
  }

  const decide = (participantId: string, decision: "approve" | "reject") => {
    if (decision === "reject" && !confirm(t("trips.crew.confirmReject"))) return;
    setError(null);
    setBusyId(participantId);
    startTransition(async () => {
      const res =
        decision === "approve"
          ? await approveApplication(tripId, participantId)
          : await rejectApplication(tripId, participantId);
      setBusyId(null);
      if (!res.ok) {
        setError(res.error || t("errors.generic"));
        return;
      }
      setRows((prev) =>
        (prev ?? []).map((p) =>
          p.id === participantId
            ? { ...p, status: decision === "approve" ? "approved" : "rejected" }
            : p
        )
      );
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      {pending.map((p) => {
        const name = profileOf(p)?.display_name || "—";
        const hasMessage = !!p.application_text;
        const busy = busyId === p.id;
        return (
          <div
            key={p.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3"
          >
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <Avatar name={name} />
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-navy-800 truncate">{name}</span>
                <span className="block text-xs text-navy-500">
                  {p.applied_at &&
                    t("trips.crew.appliedOn").replace(
                      "{date}",
                      new Date(p.applied_at).toLocaleDateString(dateLocale)
                    )}
                  {p.status === "waitlisted" && ` · ${t("trips.participantStatus.waitlisted")}`}
                  {hasMessage && (
                    <>
                      {" · "}
                      <Icon name="message-circle" size={11} className="inline -mt-0.5 mr-0.5" />
                      {t("trips.crew.messageAttached")}
                    </>
                  )}
                </span>
                {hasMessage && (
                  <p className="mt-2 rounded-lg bg-white/70 px-2.5 py-2 text-xs leading-relaxed text-navy-700 whitespace-pre-wrap">
                    {p.application_text}
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => decide(p.id, "approve")}
                disabled={busy}
                className="rounded-lg bg-trevu-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-trevu-700 transition-colors disabled:opacity-50"
              >
                {busy ? t("trips.crew.deciding") : t("trips.manage.approve")}
              </button>
              <button
                type="button"
                onClick={() => decide(p.id, "reject")}
                disabled={busy}
                className="rounded-lg border border-navy-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {t("trips.manage.reject")}
              </button>
            </div>
          </div>
        );
      })}
      {error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/**
 * CrewMembersRow — elfogadott csapattagok avatarsora (+N), a Csapat tab
 * "CSAPATTAGOK" blokkja (`HOJ0D`) szerint.
 */
export function CrewMembersRow({ tripId, initial, max = 8 }: ApplicationsManagerProps & { max?: number }) {
  const { t } = useTranslation();
  const [rows] = useParticipants(tripId, initial);

  if (rows === null) {
    return <p className="text-sm text-navy-400 py-3 text-center">{t("trips.crew.membersLoading")}</p>;
  }
  const members = rows.filter((p) => MEMBER_STATUSES.includes(p.status));
  if (members.length === 0) {
    return <p className="text-sm text-navy-400 py-3 text-center">{t("trips.crew.noMembers")}</p>;
  }
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {shown.map((p) => {
        const name = profileOf(p)?.display_name || "—";
        return (
          <div key={p.id} title={name}>
            <Avatar name={name} size={44} />
          </div>
        );
      })}
      {rest > 0 && (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-100 text-sm font-semibold text-navy-500">
          {t("trips.crew.moreMembers").replace("{count}", String(rest))}
        </div>
      )}
    </div>
  );
}
