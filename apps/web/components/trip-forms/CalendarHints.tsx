"use client";

/**
 * CalendarHints — a varázsló naptári segítsávja (M23 V1.1, S9 + S11).
 * Design: D02 Step 2 `T87a5` (helyi idő sáv) + `QTCYQ` (local_holiday), Step 4 `d2I6Tq` (deadline_on_holiday).
 * A 2. lépés a helyszín országához és a dátumokhoz, a 4. lépés a határidőhöz és az időzónához ad visszajelzést.
 * Nem blokkol semmit (BR-M23-015); hálózati hibánál csendben nem jelenik meg.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Icon } from "@/components/Icon";
import { previewTripCalendar, type TripCalendarPreview } from "@/app/(app)/trips/calendar-actions";
import { alertText } from "@/lib/calendar/alert-text";
import { CalendarAlerts } from "@/components/calendar/CalendarUi";
import type { AlertKey } from "@/lib/calendar/alerts";

interface CalendarHintsProps {
  step: 2 | 4;
  location_country: string;
  start_date: string;
  end_date: string;
  registration_deadline?: string;
  timezone?: string;
  /** S9 sáv „Módosítás” linkje — a 4. lépés időzóna-választójára visz */
  onChangeTimezone?: () => void;
}

const STEP_KEYS: Record<2 | 4, AlertKey[]> = {
  2: ["local_holiday", "no_calendar_data", "dst_change"],
  4: ["deadline_on_holiday", "timezone_difference"],
};

export function CalendarHints({ step, location_country, start_date, end_date, registration_deadline, timezone, onChangeTimezone }: CalendarHintsProps) {
  const { t, locale } = useTranslation();
  const [data, setData] = useState<TripCalendarPreview | null>(null);

  useEffect(() => {
    if (!location_country || !start_date) {
      setData(null);
      return;
    }
    let alive = true;
    const handle = setTimeout(() => {
      previewTripCalendar({ location_country, start_date, end_date: end_date || start_date, registration_deadline: registration_deadline || "", timezone: timezone || "", locale })
        .then((res) => {
          if (alive) setData(res.ok ? res : null);
        })
        .catch(() => alive && setData(null));
    }, 400);
    return () => {
      alive = false;
      clearTimeout(handle);
    };
  }, [location_country, start_date, end_date, registration_deadline, timezone, locale]);

  if (!data) return null;
  const items = data.alerts
    .filter((a) => STEP_KEYS[step].includes(a.key))
    .map((a) => ({ id: a.id, severity: a.severity, icon: a.icon, ...alertText(a, t as (k: string, p?: Record<string, string | number>) => string, locale) }));

  return (
    <div className="space-y-3" data-testid={`calendar-hints-step${step}`}>
      {step === 2 && data.localTime && (
        <div className="flex items-center gap-3 rounded-xl bg-navy-50 px-3.5 py-2.5">
          <Icon name="clock" size={16} className="shrink-0 text-trevu-700" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-navy-900">
              {t("calendar.localTime.title", { timezone: data.localTime.timezone, offset: data.localTime.offset })}
            </p>
            <p className="text-xs text-navy-400">
              {t(`calendar.localTime.source.${data.localTime.source}`)}
              {data.localTime.multiZone ? ` · ${t("calendar.localTime.multiZone")}` : ""}
              {" · "}
              {t("calendar.localTime.hint")}
            </p>
          </div>
          {onChangeTimezone && (
            <button type="button" onClick={onChangeTimezone} className="shrink-0 text-[13px] font-semibold text-trevu-700 underline">
              {t("calendar.localTime.change")}
            </button>
          )}
        </div>
      )}
      <CalendarAlerts items={items} />
    </div>
  );
}
