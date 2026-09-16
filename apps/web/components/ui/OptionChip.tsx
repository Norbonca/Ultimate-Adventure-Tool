"use client";

/**
 * OptionChip — választható pirula (szűrőopció, kategória-pirula, nézetváltó eleme).
 *
 * Design: design/D02_Trip_Management.pen#rzyEG (Component/FilterContent „Opt …”),
 * #H1rRQE „Category Pills” és „View Toggle”. 40 px magas (érintési cél a sorban
 * ≥ 40, a sheetben a gombsor 48), radius 10, kiválasztva --color-primary kitöltés
 * --color-on-primary szöveggel, egyébként --color-ghost + keret.
 */

import type { ReactNode } from "react";

export interface OptionChipProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  /** Ikon a felirat előtt (dekoratív). */
  icon?: ReactNode;
  /** `pressed` = kapcsoló (aria-pressed), `radio` = csoportban egy választható. */
  mode?: "pressed" | "radio";
  className?: string;
  testId?: string;
  title?: string;
  ariaLabel?: string;
}

export function OptionChip({
  selected,
  onClick,
  children,
  icon,
  mode = "pressed",
  className,
  testId,
  title,
  ariaLabel,
}: OptionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      title={title}
      aria-label={ariaLabel}
      role={mode === "radio" ? "radio" : undefined}
      aria-checked={mode === "radio" ? selected : undefined}
      aria-pressed={mode === "pressed" ? selected : undefined}
      className={[
        "inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-trevu px-3.5 text-sm font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
        selected
          ? "bg-accent text-accent-on"
          : "border border-line bg-ghost text-ink hover:border-line-strong",
        className ?? "",
      ].join(" ")}
    >
      {icon}
      {children}
    </button>
  );
}
