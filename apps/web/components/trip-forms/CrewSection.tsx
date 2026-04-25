"use client";

import { useState, type ReactNode } from "react";
import type { WizardFormData } from "@/app/(app)/trips/types";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface CrewSectionProps {
  data: WizardFormData;
  onChange: (updates: Partial<WizardFormData>) => void;
  /** Edit oldalon átadható: aktív csapattagok / pending applications megjelenítéséhez */
  membersSlot?: ReactNode;
  applicationsSlot?: ReactNode;
  /** Edit oldalon: szervezői helyek manager komponens */
  staffSeatsSlot?: ReactNode;
}

export function CrewSection({ data, onChange, membersSlot, applicationsSlot, staffSeatsSlot }: CrewSectionProps) {
  const { t } = useTranslation();
  const [newPosition, setNewPosition] = useState("");

  const addPosition = () => {
    const trimmed = newPosition.trim();
    if (!trimmed) return;
    if (data.crew_positions.includes(trimmed)) {
      setNewPosition("");
      return;
    }
    onChange({ crew_positions: [...data.crew_positions, trimmed] });
    setNewPosition("");
  };

  const removePosition = (pos: string) => {
    onChange({ crew_positions: data.crew_positions.filter((p) => p !== pos) });
  };

  return (
    <div className="space-y-6">
      {/* STAFF SEATS section (edit mode only — szervezői helyek) */}
      {staffSeatsSlot && (
        <div>
          <SectionHeader label={t("trips.crew.staffSeatsHeader").replace("{filled}", "").replace("{total}", String(data.staff_seats || 0))} />
          <p className="text-sm text-navy-500 mt-2">
            {t("trips.crew.staffSeatsHelp")}
          </p>
          <div className="mt-3">{staffSeatsSlot}</div>
        </div>
      )}

      {/* POSITIONS section */}
      <div>
        <SectionHeader label={t("trips.crew.positionsHeader")} />

        {data.crew_positions.length === 0 && (
          <p className="text-sm text-navy-400 py-3 text-center">
            {t("trips.crew.noPositions")}
          </p>
        )}

        <div className="space-y-2 mt-3">
          {data.crew_positions.map((pos) => (
            <div
              key={pos}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-navy-50 border border-navy-200"
            >
              <span className="text-sm font-medium text-navy-800">{pos}</span>
              <button
                type="button"
                onClick={() => removePosition(pos)}
                className="text-xs text-navy-400 hover:text-red-500 transition-colors"
                aria-label={t("trips.crew.removePosition")}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Add row */}
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={newPosition}
            onChange={(e) => setNewPosition(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPosition();
              }
            }}
            placeholder={t("trips.wizard.crewPositionPlaceholder")}
            className="flex-1 px-4 py-2.5 rounded-xl border border-navy-200 text-sm text-navy-900 focus:ring-2 focus:ring-trevu-500 focus:border-trevu-500 outline-none transition-colors"
          />
          <button
            type="button"
            onClick={addPosition}
            disabled={!newPosition.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-trevu-700 border border-trevu-500 hover:bg-trevu-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + {t("trips.wizard.addPosition")}
          </button>
        </div>
      </div>

      {/* Pending applications (csak edit oldalon van — ha kapunk slot-ot) */}
      {applicationsSlot && (
        <div>
          <SectionHeader
            label={t("trips.crew.applicationsHeader")}
            tone="amber"
          />
          <div className="mt-3 space-y-2">{applicationsSlot}</div>
        </div>
      )}

      {/* Active members (csak edit oldalon — slot-on át) */}
      {membersSlot && (
        <div>
          <SectionHeader label={t("trips.crew.membersHeader")} />
          <div className="mt-3">{membersSlot}</div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label, tone = "muted" }: { label: string; tone?: "muted" | "amber" }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="h-px flex-1 bg-navy-100" />
      <span
        className={`text-xs font-bold tracking-widest ${
          tone === "amber" ? "text-amber-600" : "text-navy-500"
        }`}
      >
        {label}
      </span>
      <div className="h-px flex-1 bg-navy-100" />
    </div>
  );
}
