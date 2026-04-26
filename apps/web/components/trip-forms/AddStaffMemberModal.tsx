"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  assignStaffSeat,
  inviteStaffByEmail,
  searchUsersForStaffSeat,
} from "@/app/(app)/trips/actions";

interface CrewPosition {
  id: string;
  role_name: string;
}

interface SearchResult {
  userId: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  alreadyOnTrip: boolean;
}

interface AddStaffMemberModalProps {
  tripId: string;
  crewPositions: CrewPosition[];
  onClose: () => void;
  onAssigned: () => void;
  onInvited?: () => void;
}

export function AddStaffMemberModal({
  tripId,
  crewPositions,
  onClose,
  onAssigned,
  onInvited,
}: AddStaffMemberModalProps) {
  const { t } = useTranslation();

  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(
    crewPositions[0]?.id ?? null
  );
  const [customRoleLabel, setCustomRoleLabel] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<
    | { mode: "existing"; displayName: string }
    | { mode: "invited"; email: string }
    | null
  >(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const res = await searchUsersForStaffSeat(tripId, trimmed);
      if (cancelled) return;
      setResults(res.results);
      setSearching(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setSearching(false);
    };
  }, [query, tripId]);

  const positionLabel =
    crewPositions.find((p) => p.id === selectedPositionId)?.role_name ||
    customRoleLabel.trim() ||
    null;

  const canSubmit = !!selectedUserId && !pending;

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviteError(null);
    setInviteSuccess(null);
    setInviteSending(true);
    try {
      const res = await inviteStaffByEmail(
        tripId,
        email,
        selectedPositionId,
        positionLabel
      );
      if (!res.ok) {
        setInviteError(res.error);
        return;
      }
      if (res.mode === "existing") {
        setInviteSuccess({ mode: "existing", displayName: res.displayName });
      } else {
        setInviteSuccess({ mode: "invited", email: res.email });
      }
      onInvited?.();
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : String(e));
    } finally {
      setInviteSending(false);
    }
  };

  const resetInvite = () => {
    setInviteEmail("");
    setInviteError(null);
    setInviteSuccess(null);
  };

  const handleSubmit = async () => {
    if (!selectedUserId) return;
    setError(null);
    setPending(true);
    try {
      const result = await assignStaffSeat(
        tripId,
        selectedUserId,
        selectedPositionId,
        positionLabel
      );
      if (!result || result.error) {
        setError(result?.error ?? t("trips.crew.addStaffError"));
        return;
      }
      onAssigned();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-7 pb-4">
          <div>
            <h2 className="text-lg font-bold text-navy-900">
              {t("trips.crew.addStaffTitle")}
            </h2>
            <p className="text-sm text-navy-500 mt-1">
              {t("trips.crew.addStaffSubtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-navy-400 hover:text-navy-700 transition-colors p-1"
            aria-label={t("common.close")}
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        <div className="px-8 pb-4 space-y-5 overflow-y-auto">
          {/* POZÍCIÓ */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-navy-500">
              {t("trips.crew.positionSection")}
            </div>
            <div className="flex flex-wrap gap-2">
              {crewPositions.map((p) => {
                const active = selectedPositionId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPositionId(p.id);
                      setCustomRoleLabel("");
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                      active
                        ? "bg-trevu-500 text-white"
                        : "bg-navy-50 text-navy-700 hover:bg-navy-100"
                    }`}
                  >
                    {p.role_name}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setSelectedPositionId(null)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  selectedPositionId === null
                    ? "bg-trevu-500 text-white"
                    : "bg-navy-50 text-navy-700 hover:bg-navy-100"
                }`}
              >
                {t("trips.crew.positionNone")}
              </button>
            </div>
            {selectedPositionId === null && (
              <input
                type="text"
                value={customRoleLabel}
                onChange={(e) => setCustomRoleLabel(e.target.value)}
                placeholder={t("trips.crew.staffRolePlaceholder")}
                maxLength={100}
                className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
              />
            )}
          </div>

          {/* FELHASZNÁLÓ KERESÉS */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-navy-500">
              {t("trips.crew.searchSection")}
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-navy-300 bg-white focus-within:ring-2 focus-within:ring-trevu-500 focus-within:border-trevu-500 transition-colors">
              <span className="text-navy-400">🔍</span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("trips.crew.searchPlaceholder")}
                className="flex-1 outline-none text-sm text-navy-900 placeholder-navy-400"
              />
            </div>
          </div>

          {/* TALÁLATOK */}
          {query.trim().length >= 2 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-navy-500">
                {t("trips.crew.resultsSection")}
              </div>
              {searching && (
                <div className="text-sm text-navy-400 px-3 py-2">
                  {t("common.loading")}…
                </div>
              )}
              {!searching && results.length === 0 && (
                <div className="text-sm text-navy-400 px-3 py-2">
                  {t("trips.crew.noResults")}
                </div>
              )}
              {results.map((u) => {
                const isSelected = selectedUserId === u.userId;
                const disabled = u.alreadyOnTrip;
                return (
                  <div
                    key={u.userId}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-trevu-500 bg-trevu-50"
                        : "border-navy-200 bg-white"
                    } ${disabled ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {u.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={u.avatarUrl}
                          alt={u.displayName}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-navy-200 text-navy-600 flex items-center justify-center text-xs font-bold">
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-navy-900 truncate">
                          {u.displayName}
                        </div>
                        <div className="text-xs text-navy-500 truncate">
                          {u.email ?? ""}
                          {u.alreadyOnTrip && (
                            <span className="ml-2 text-amber-600">
                              · {t("trips.crew.alreadyOnTrip")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected ? (
                      <span className="px-3 py-1 rounded-md bg-trevu-500 text-white text-xs font-bold">
                        {t("trips.crew.resultSelected")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(u.userId)}
                        disabled={disabled}
                        className="px-3 py-1 rounded-md text-xs font-semibold text-trevu-700 border border-trevu-300 hover:bg-trevu-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {t("trips.crew.resultSelect")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Email-alapú meghívás — állandó szekció (S29) */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-navy-500">
              {t("trips.crew.inviteTitle")}
            </div>

            {!inviteSuccess && (
              <>
                <div className="text-xs text-navy-500 leading-relaxed">
                  {t("trips.crew.inviteDesc")}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-navy-300 bg-white focus-within:ring-2 focus-within:ring-trevu-500 focus-within:border-trevu-500 transition-colors">
                    <span className="text-navy-400 text-sm">✉</span>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => {
                        setInviteEmail(e.target.value);
                        setInviteError(null);
                      }}
                      placeholder={t("trips.crew.inviteEmailPlaceholder")}
                      className="flex-1 outline-none text-sm text-navy-900 placeholder-navy-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleInvite}
                    disabled={inviteSending || !inviteEmail.trim()}
                    className="px-4 py-2.5 rounded-lg bg-trevu-500 hover:bg-trevu-600 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {inviteSending
                      ? t("trips.crew.inviteSending")
                      : t("trips.crew.inviteSubmit")}
                  </button>
                </div>
                {inviteError && (
                  <div className="text-xs text-red-600 px-1">{inviteError}</div>
                )}
              </>
            )}

            {inviteSuccess && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-trevu-50 border border-trevu-300">
                <div className="w-8 h-8 rounded-full bg-trevu-500 flex items-center justify-center text-white shrink-0 text-sm">
                  ✓
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-trevu-700">
                    {inviteSuccess.mode === "invited"
                      ? t("trips.crew.inviteSentNewTitle")
                      : t("trips.crew.inviteAddedExistingTitle")}
                  </div>
                  <div className="text-xs text-trevu-700 mt-0.5 leading-relaxed">
                    {inviteSuccess.mode === "invited"
                      ? t("trips.crew.inviteSentNewDesc").replace(
                          "{email}",
                          inviteSuccess.email
                        )
                      : t("trips.crew.inviteAddedExistingDesc").replace(
                          "{name}",
                          inviteSuccess.displayName
                        )}
                  </div>
                  <button
                    type="button"
                    onClick={resetInvite}
                    className="text-xs font-semibold text-trevu-700 hover:text-trevu-800 mt-2 underline"
                  >
                    {t("trips.crew.inviteAnother")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-8 py-4 border-t border-navy-100">
          <div className="text-xs text-navy-500">
            ⓘ {t("trips.crew.assignWillAppear")}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-navy-600 text-sm font-semibold hover:bg-navy-50 transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-4 py-2 rounded-lg bg-trevu-500 hover:bg-trevu-600 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("trips.crew.confirmAssign")}
            </button>
          </div>
        </div>

        {error && (
          <div className="px-8 pb-4 text-sm text-red-600">{error}</div>
        )}
      </div>
    </div>
  );
}
