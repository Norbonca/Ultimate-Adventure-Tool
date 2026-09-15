"use client";

/**
 * A szervezés időzónája (M23 Calendar, FR-M23-011; Norbert döntése, 2026-09-15: a szervező
 * állítja be, alapértelmezés UTC). A jelentkezési határidő ennek a zónának a napja szerint zár.
 *
 * DESIGN-FIRST kivétel: hibajavításhoz felvett mező, Pencil-terv még nincs — a D02 `Gvgnj`
 * (Wizard Step 4) és a Trip Edit Settings szekció terve utólag vezetendő át.
 */

import { useMemo } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { DEFAULT_TRIP_TIMEZONE, formatUtcOffset, listTimeZones } from "@/lib/timezone";

interface TimezoneSelectProps {
  id: string;
  value: string;
  onChange: (timezone: string) => void;
  className?: string;
}

export function TimezoneSelect({ id, value, onChange, className }: TimezoneSelectProps) {
  const { t } = useTranslation();
  const zones = useMemo(() => {
    const list = listTimeZones();
    return value && !list.includes(value) ? [value, ...list] : list;
  }, [value]);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-navy-700 mb-1.5">
        {t("trips.wizard.timezone")}
      </label>
      <select
        id={id}
        value={value || DEFAULT_TRIP_TIMEZONE}
        onChange={(e) => onChange(e.target.value)}
        className={
          className ??
          "w-full min-h-[48px] px-4 py-3 rounded-trevu border-[1.5px] border-navy-300 text-[15px] text-navy-900 bg-white focus:ring-[3px] focus:ring-trevu-600/10 focus:border-trevu-600 outline-none transition-all duration-200"
        }
      >
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone === DEFAULT_TRIP_TIMEZONE ? "UTC" : `${zone} (${formatUtcOffset(zone)})`}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-xs text-navy-500">{t("trips.wizard.timezoneHint")}</p>
    </div>
  );
}
