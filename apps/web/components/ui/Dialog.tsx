"use client";

/**
 * Dialog — Trevu UI primitive (confirmation modal).
 *
 * Design: D02 `v54yy` / `m5cJrw`, D01 `RbzSn` / `kHbUE` — 520 px card with a 44 px tinted icon
 * circle, title + body; on phones (< 640 px) it becomes a bottom sheet with a grabber and
 * full-width stacked actions (primary on top).
 * Escape and the backdrop close it unless `busy`; focus moves into the dialog on open.
 */

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "@/components/Icon";

export type DialogTone = "danger" | "warning" | "primary";

const TONE: Record<DialogTone, string> = {
  danger: "bg-[var(--color-danger-subtle)] text-coral",
  warning: "bg-[var(--color-warning-subtle)] text-[var(--color-warning)]",
  primary: "bg-trevu-50 text-trevu-700",
};

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  icon: string;
  tone?: DialogTone;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Action buttons, primary first (rendered last on desktop, first on mobile). */
  actions: ReactNode;
  busy?: boolean;
}

export function Dialog({ open, onClose, icon, tone = "danger", title, description, children, actions, busy }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = panelRef.current?.querySelector<HTMLElement>("input, textarea, select, button");
    (focusable ?? panelRef.current)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-900/50"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full sm:max-w-[520px] bg-white rounded-t-[20px] sm:rounded-2xl shadow-2xl px-5 pt-3 pb-7 sm:p-8 max-h-[92vh] overflow-y-auto outline-none"
      >
        <div className="flex justify-center mb-3 sm:hidden" aria-hidden="true">
          <span className="w-10 h-1 rounded-full bg-navy-200" />
        </div>
        <div className="flex gap-3.5">
          <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${TONE[tone]}`}>
            <Icon name={icon} size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[22px] leading-tight font-semibold text-navy-900">
              {title}
            </h2>
            {description && <div className="mt-1.5 text-sm leading-relaxed text-navy-600">{description}</div>}
          </div>
        </div>
        {children && <div className="mt-5 space-y-5">{children}</div>}
        <div className="mt-5 flex flex-col sm:flex-row-reverse sm:justify-start gap-2.5 sm:gap-3">{actions}</div>
      </div>
    </div>
  );
}
