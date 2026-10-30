/**
 * M23 Calendar V1.1 — megjelenítő komponensek (szerver- és kliensoldalon is használhatók, hook nélkül).
 * Design: D00 `P9i1aP` — Component/Calendar/Badge/{Season,Possible,Holiday,LongWeekend} (`UT90X` `jxQiI`
 * `bINJz` `qFj7z`), Component/Calendar/AlertBlock (`E7Kfe`) 6 variánssal, Component/Calendar/DualTime
 * (`vT85p`, napváltás `T0BKw`). Színek a brand szemantikus tokenjeivel (warning/info/danger/success/frost).
 */

import { Icon } from "@/components/Icon";
import type { AlertSeverity, BadgeKind } from "@/lib/calendar/alerts";

const BADGE_STYLE: Record<BadgeKind, { icon: string; className: string }> = {
  season: { icon: "calendar-days", className: "bg-amber-50 text-amber-800" },
  possible: { icon: "calendar-range", className: "border border-amber-700 text-amber-800" },
  holiday: { icon: "flag", className: "bg-blue-50 text-blue-600" },
  long_weekend: { icon: "sun", className: "bg-emerald-50 text-emerald-700" },
};

export function CalendarBadge({ kind, label }: { kind: BadgeKind; label: string }) {
  const s = BADGE_STYLE[kind];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1 text-xs font-medium ${s.className}`}
      data-testid={`calendar-badge-${kind}`}
    >
      <Icon name={s.icon} size={14} aria-hidden />
      {label}
    </span>
  );
}

const ALERT_STYLE: Record<AlertSeverity, { box: string; icon: string }> = {
  warning: { box: "bg-amber-50", icon: "text-amber-800" },
  info: { box: "bg-blue-50", icon: "text-blue-600" },
  danger: { box: "bg-red-50", icon: "text-red-500" },
  neutral: { box: "bg-navy-50", icon: "text-navy-500" },
};

export interface CalendarAlertItem {
  id: string;
  severity: AlertSeverity;
  icon: string;
  title: string;
  dates: string;
  impact: string;
}

/** Figyelmeztetés-blokk (S11). A „Tudomásul vettem” gomb a V1.1 második lépése (`trip_calendar_alert_acks`). */
export function CalendarAlerts({ items, className = "" }: { items: CalendarAlertItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={`space-y-3 ${className}`} data-testid="calendar-alerts">
      {items.map((a) => {
        const s = ALERT_STYLE[a.severity];
        return (
          <li key={a.id} className={`flex items-start gap-3 rounded-xl p-3.5 ${s.box}`} data-testid={`calendar-alert-${a.id.split(":")[0]}`}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ${s.icon}`}>
              <Icon name={a.icon} size={18} aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-semibold text-navy-900">{a.title}</p>
              <p className="text-xs text-navy-400">{a.dates}</p>
              <p className="text-[13px] leading-relaxed text-navy-700">{a.impact}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Kettős időpont (S10, FR-M23-012): a túra helyi ideje, alatta a néző ideje, ha eltér. */
export function DualTime({
  primary,
  secondary,
  dayShift,
  viewerLabel,
  dayShiftLabel,
}: {
  primary: string;
  secondary?: string;
  dayShift?: number;
  /** „Nálad:” */
  viewerLabel: string;
  /** napváltásnál, pl. „(+1 nap)” — a hívó fordítja */
  dayShiftLabel?: string;
}) {
  const shifted = dayShift !== undefined && dayShift !== 0;
  return (
    <span className="block" data-testid="dual-time">
      <span className="block font-semibold text-navy-900">{primary}</span>
      {secondary && (
        <span className={`mt-0.5 flex items-center gap-1 text-xs ${shifted ? "font-medium text-blue-600" : "text-navy-400"}`}>
          {shifted && <Icon name="globe" size={12} aria-hidden />}
          {viewerLabel} {secondary}
          {shifted && dayShiftLabel ? ` ${dayShiftLabel}` : ""}
        </span>
      )}
    </span>
  );
}
