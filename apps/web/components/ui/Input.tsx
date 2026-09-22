/**
 * Input — labelled text field with optional leading icon and error text.
 *
 * Design: design/D00_Core_Components.pen#QJK58 (label 14/600 · field 48 px · icon 18)
 * Overhaul: square field, one-pixel line and orange focus treatment.
 * No hooks. Pass `autoComplete` for every credential/identity field (UX-002).
 */

import type { InputHTMLAttributes, ReactNode } from "react";
import { Icon } from "@/components/Icon";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: ReactNode;
  /** Icon Bank key shown at the start of the field. */
  icon?: string;
  error?: ReactNode;
  hint?: ReactNode;
  wrapperClassName?: string;
}

export function Input({
  id,
  label,
  icon,
  error,
  hint,
  className,
  wrapperClassName,
  ...rest
}: InputProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={["flex flex-col gap-1.5", wrapperClassName ?? ""].join(" ")}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-muted">
            <Icon name={icon} size={18} />
          </span>
        )}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={[
            "w-full min-h-[48px] rounded-none border bg-surface px-4 py-3 text-[15px] text-ink",
            "placeholder:text-ink-muted outline-none transition-colors duration-150",
            error
              ? "border-coral focus:border-coral focus:ring-[3px] focus:ring-coral/15"
              : "border-line focus:border-accent focus:ring-[3px] focus:ring-accent/15",
            icon ? "pl-11" : "",
            className ?? "",
          ].join(" ")}
          {...rest}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-coral" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
