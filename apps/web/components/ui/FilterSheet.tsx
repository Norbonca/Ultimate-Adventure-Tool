"use client";

/**
 * FilterSheet — szűrőlap: mobilon alsó lap háttérsötétítéssel, asztalin a
 * „Szűrők” gomb alatt lebegő panel.
 *
 * Design: design/D02_Trip_Management.pen#RTE9l (mobil 390), #W9Kgy (asztali
 * panel nyitva), tartalom: #rzyEG (Component/FilterContent).
 * A tartalmat (csoportok) a hívó adja; a lap a keretet, a fejlécet, a Törlés és
 * az Alkalmaz gombot, az Esc-bezárást és a fókuszkezelést adja.
 * A szülőnek `relative` pozíciójúnak kell lennie (asztali panel horgonya).
 */

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "@/lib/icons";

export interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  clearLabel: string;
  onClear: () => void;
  applyLabel: string;
  children: ReactNode;
  testId?: string;
}

export function FilterSheet({
  open,
  onClose,
  title,
  closeLabel,
  clearLabel,
  onClear,
  applyLabel,
  children,
  testId,
}: FilterSheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Háttér: mobilon sötétít, asztalin átlátszó kattintás-fogó. */}
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-40 bg-scrim md:bg-transparent"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid={testId}
        className={[
          "z-50 flex flex-col border-line bg-surface text-ink focus:outline-none",
          // mobil: alsó lap
          "fixed inset-x-0 bottom-0 max-h-[88dvh] rounded-none border-t",
          // asztali: lebegő panel a gomb alatt
          "md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-full md:mt-2 md:max-h-[70vh] md:w-[440px] md:rounded-none md:border md:border-line-strong",
        ].join(" ")}
      >
        <div className="flex justify-center pt-2.5 md:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-line-strong" />
        </div>
        <div className="flex items-center justify-between py-2 pl-4 pr-1 md:px-6 md:pt-5">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="flex h-11 w-11 items-center justify-center rounded-none text-ink hover:bg-ghost focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <X size={22} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 md:px-6">{children}</div>
        <div className="flex gap-3 border-t border-line px-4 pb-7 pt-3 md:px-6 md:pb-5">
          <button
            type="button"
            onClick={onClear}
            className="h-12 rounded-none border border-line-strong bg-surface px-5 text-base font-semibold text-ink hover:bg-ghost focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            {clearLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            data-testid={testId ? `${testId}-apply` : undefined}
            className="h-12 flex-1 rounded-none bg-accent px-5 text-base font-semibold text-accent-on hover:bg-accent-hover focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            {applyLabel}
          </button>
        </div>
      </div>
    </>
  );
}
