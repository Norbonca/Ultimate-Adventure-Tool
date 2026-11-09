/**
 * M151 — állapotcímke (Rendben / Figyelmeztetés / Hiba / Ellenőrzés…). Terv: design/D15_Admin.pen#BuaVg
 * A Day admin felület tokenjei; a figyelmeztetés és a hiba szövege a kontraszt miatt sötétebb árnyalat.
 */
import { Icon } from "@/components/Icon";
import type { DisplayState } from "./format";

export const STATE_STYLE: Record<DisplayState, { chip: string; icon: string; dot: string; soft: string; iconColor: string }> = {
  ok: {
    chip: "bg-(--color-success-subtle) text-(--color-success-text)",
    icon: "check-circle-2",
    dot: "bg-(--color-success)",
    soft: "bg-(--color-success-subtle)",
    iconColor: "text-(--color-success-text)",
  },
  warn: {
    chip: "bg-(--color-warning-subtle) text-amber-800",
    icon: "alert-triangle",
    dot: "bg-(--color-warning)",
    soft: "bg-(--color-warning-subtle)",
    iconColor: "text-amber-700",
  },
  down: {
    chip: "bg-(--color-danger-subtle) text-red-700",
    icon: "x-circle",
    dot: "bg-(--color-danger)",
    soft: "bg-(--color-danger-subtle)",
    iconColor: "text-red-700",
  },
  wait: {
    chip: "bg-canvas text-ink-muted",
    icon: "loader-2",
    dot: "bg-line",
    soft: "bg-canvas",
    iconColor: "text-ink-muted",
  },
};

export function StatusChip({ state, label }: { state: DisplayState; label: string }) {
  const s = STATE_STYLE[state];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${s.chip}`}>
      <Icon name={s.icon} size={14} className={state === "wait" ? "motion-safe:animate-spin" : undefined} />
      {label}
    </span>
  );
}
