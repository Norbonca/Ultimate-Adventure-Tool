/**
 * M151 — állapotcímke (Rendben / Figyelmeztetés / Hiba / Ellenőrzés…). Terv: design/D15_Admin.pen#BuaVg
 * A Day admin felület tokenjei; a figyelmeztetés és a hiba szövege a kontraszt miatt sötétebb árnyalat.
 */
import { Icon } from "@/components/Icon";
import type { DisplayState } from "./format";

export const STATE_STYLE: Record<DisplayState, { chip: string; icon: string; dot: string; soft: string; iconColor: string }> = {
  ok: {
    chip: "bg-[var(--color-success-subtle)] text-[var(--color-success-text)]",
    icon: "check-circle-2",
    dot: "bg-[var(--color-success)]",
    soft: "bg-[var(--color-success-subtle)]",
    iconColor: "text-[var(--color-success-text)]",
  },
  warn: {
    chip: "bg-[var(--color-warning-subtle)] text-amber-800",
    icon: "alert-triangle",
    dot: "bg-[var(--color-warning)]",
    soft: "bg-[var(--color-warning-subtle)]",
    iconColor: "text-amber-700",
  },
  down: {
    chip: "bg-[var(--color-danger-subtle)] text-red-700",
    icon: "x-circle",
    dot: "bg-[var(--color-danger)]",
    soft: "bg-[var(--color-danger-subtle)]",
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
