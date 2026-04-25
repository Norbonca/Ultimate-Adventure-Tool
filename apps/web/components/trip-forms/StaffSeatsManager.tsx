"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  assignStaffSeat,
  removeStaffSeat,
  fetchStaffSeats,
  fetchCrewPositions,
} from "@/app/(app)/trips/actions";
import { AddStaffMemberModal } from "./AddStaffMemberModal";

interface StaffSeat {
  participantId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isSelf: boolean;
  crewPositionId: string | null;
  crewRoleName: string | null;
  staffRoleLabel: string | null;
}

interface CrewPositionLite {
  id: string;
  role_name: string;
}

interface StaffSeatsManagerProps {
  tripId: string;
  totalSeats: number;
}

export function StaffSeatsManager({ tripId, totalSeats }: StaffSeatsManagerProps) {
  const { t } = useTranslation();
  const [seats, setSeats] = useState<StaffSeat[]>([]);
  const [guest, setGuest] = useState<{ max: number; current: number }>({ max: 0, current: 0 });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpenIdx, setPickerOpenIdx] = useState<number | null>(null);
  const [pickerPositionId, setPickerPositionId] = useState<string | null>(null);
  const [pickerCustomLabel, setPickerCustomLabel] = useState("");
  const [addModalOpenIdx, setAddModalOpenIdx] = useState<number | null>(null);
  const [crewPositions, setCrewPositions] = useState<CrewPositionLite[]>([]);

  useEffect(() => {
    fetchStaffSeats(tripId).then((res) => {
      setSeats(res.assigned);
      setGuest(res.guestSeats);
    });
    fetchCrewPositions(tripId).then((rows) => {
      setCrewPositions(
        (rows ?? []).map((p) => ({ id: p.id, role_name: p.role_name }))
      );
    });
  }, [tripId]);

  const reload = async () => {
    const res = await fetchStaffSeats(tripId);
    setSeats(res.assigned);
    setGuest(res.guestSeats);
  };

  const handleSelfAssign = async () => {
    setError(null);
    setPending(true);
    const positionLabel =
      crewPositions.find((p) => p.id === pickerPositionId)?.role_name ||
      pickerCustomLabel.trim().slice(0, 100) ||
      null;
    try {
      const result = await assignStaffSeat(
        tripId,
        "self",
        pickerPositionId,
        positionLabel
      );
      if (!result || result.error) {
        setError(result?.error ?? t("trips.crew.addStaffError"));
        return;
      }
      setPickerOpenIdx(null);
      setPickerPositionId(null);
      setPickerCustomLabel("");
      await reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[StaffSeatsManager] assignStaffSeat threw:", e);
      setError(`Kivétel: ${msg}`);
    } finally {
      setPending(false);
    }
  };

  const handleRemove = async (participantId: string) => {
    setError(null);
    setPending(true);
    try {
      const result = await removeStaffSeat(tripId, participantId);
      if (!result || result.error) {
        setError(result?.error ?? "Ismeretlen hiba a törlésnél");
        return;
      }
      await reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Kivétel: ${msg}`);
    } finally {
      setPending(false);
    }
  };

  const freeSlots = Math.max(0, totalSeats - seats.length);
  const emptySlots = Array.from({ length: freeSlots }, (_, i) => i);
  const selfAlreadyAssigned = seats.some((s) => s.isSelf);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl bg-trevu-50 border border-trevu-200 text-sm">
        <span className="font-semibold text-emerald-700">
          {t("trips.crew.staffSummaryGuests")
            .replace("{current}", String(guest.current))
            .replace("{max}", String(guest.max))}
        </span>
        <span className="text-navy-300">·</span>
        <span className="font-semibold text-emerald-700">
          {t("trips.crew.staffSummaryStaff")
            .replace("{filled}", String(seats.length))
            .replace("{total}", String(totalSeats))}
        </span>
      </div>

      {totalSeats === 0 && (
        <p className="text-sm text-navy-400 px-4 py-3 rounded-xl bg-navy-50 border border-dashed border-navy-200">
          {t("trips.crew.staffSeatsEmpty")}
        </p>
      )}

      {/* Filled seats */}
      {seats.map((seat) => {
        const positionLabel = seat.staffRoleLabel || seat.crewRoleName || null;
        return (
          <div
            key={seat.participantId}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-trevu-500 bg-trevu-50"
          >
            <div className="flex items-center gap-3 min-w-0">
              {seat.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={seat.avatarUrl}
                  alt={seat.displayName}
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-trevu-500 text-white flex items-center justify-center text-sm font-bold">
                  {seat.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-navy-900 truncate">{seat.displayName}</span>
                  {seat.isSelf && (
                    <span className="px-2 py-0.5 rounded-full bg-trevu-600 text-white text-[10px] font-bold uppercase tracking-wider">
                      {t("trips.crew.youBadge")}
                    </span>
                  )}
                </div>
                {positionLabel && (
                  <div className="text-xs text-emerald-700 font-medium">{positionLabel}</div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRemove(seat.participantId)}
              disabled={pending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>🗑️</span>
              <span>{t("trips.crew.removeStaffSeat")}</span>
            </button>
          </div>
        );
      })}

      {/* Empty slots */}
      {emptySlots.map((idx) => {
        const isPickerOpen = pickerOpenIdx === idx;
        return (
          <div
            key={`empty-${idx}`}
            className="px-4 py-3 rounded-xl border border-dashed border-navy-300 space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full border border-dashed border-navy-300 flex items-center justify-center text-navy-300">
                  +
                </div>
                <div>
                  <div className="text-sm font-semibold text-navy-700">
                    {t("trips.crew.staffSeatEmpty")}
                  </div>
                  <div className="text-xs text-navy-400">
                    {t("trips.crew.staffSeatEmptyDesc")}
                  </div>
                </div>
              </div>
              {!isPickerOpen && (
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  {!selfAlreadyAssigned && idx === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setPickerOpenIdx(idx);
                        setPickerPositionId(crewPositions[0]?.id ?? null);
                        setPickerCustomLabel("");
                      }}
                      disabled={pending}
                      className="px-3 py-1.5 rounded-lg bg-trevu-500 hover:bg-trevu-600 text-white text-sm font-semibold transition-colors disabled:opacity-40"
                    >
                      {t("trips.crew.assignSelf")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAddModalOpenIdx(idx)}
                    disabled={pending}
                    className="px-3 py-1.5 rounded-lg border border-trevu-500 text-trevu-700 hover:bg-trevu-50 text-sm font-semibold transition-colors disabled:opacity-40"
                  >
                    {t("trips.crew.addStaffOther")}
                  </button>
                </div>
              )}
            </div>

            {isPickerOpen && (
              <div className="pt-2 border-t border-navy-100 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-navy-500">
                  {t("trips.crew.positionSection")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {crewPositions.map((p) => {
                    const active = pickerPositionId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPickerPositionId(p.id);
                          setPickerCustomLabel("");
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
                    onClick={() => setPickerPositionId(null)}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                      pickerPositionId === null
                        ? "bg-trevu-500 text-white"
                        : "bg-navy-50 text-navy-700 hover:bg-navy-100"
                    }`}
                  >
                    {t("trips.crew.positionNone")}
                  </button>
                </div>
                {pickerPositionId === null && (
                  <input
                    type="text"
                    value={pickerCustomLabel}
                    onChange={(e) => setPickerCustomLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSelfAssign();
                      }
                      if (e.key === "Escape") {
                        setPickerOpenIdx(null);
                      }
                    }}
                    placeholder={t("trips.crew.staffRolePlaceholder")}
                    maxLength={100}
                    className="w-full px-3 py-2 rounded-lg border border-navy-200 text-sm text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
                    autoFocus
                  />
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPickerOpenIdx(null);
                      setPickerPositionId(null);
                      setPickerCustomLabel("");
                    }}
                    className="px-3 py-2 rounded-lg text-navy-500 text-sm font-medium hover:bg-navy-50 transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSelfAssign}
                    disabled={pending}
                    className="px-3 py-2 rounded-lg bg-trevu-500 hover:bg-trevu-600 text-white text-sm font-semibold transition-colors disabled:opacity-40"
                  >
                    {t("trips.crew.confirmAssign")}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      {addModalOpenIdx !== null && (
        <AddStaffMemberModal
          tripId={tripId}
          crewPositions={crewPositions}
          onClose={() => setAddModalOpenIdx(null)}
          onAssigned={async () => {
            setAddModalOpenIdx(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}
