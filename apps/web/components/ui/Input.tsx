/**
 * Input — labelled text field with optional leading icon and error text.
 *
 * Design: design/D00_Core_Components.pen#QJK58 (label 14/600 · field 48 px · radius 10 · icon 18)
 * Brand: Trevu_Brand_Guide.docx §3 — 1.5 px navy-300 border, teal focus ring.
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
      <label htmlFor={id} className="text-sm font-semibold text-navy-900">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-navy-500">
            <Icon name={icon} size={18} />
          </span>
        )}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={[
            "w-full min-h-[48px] rounded-trevu border-[1.5px] bg-white px-4 py-3 text-[15px] text-navy-900",
            "placeholder:text-navy-500 outline-none transition-all duration-200",
            error
              ? "border-coral focus:border-coral focus:ring-[3px] focus:ring-coral/15"
              : "border-navy-300 focus:border-trevu-600 focus:ring-[3px] focus:ring-trevu-600/10",
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
        <p id={`${id}-hint`} className="text-sm text-navy-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
