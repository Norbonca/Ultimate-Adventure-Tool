/**
 * Checkbox — 20 px box with label.
 *
 * Design: design/D00_Core_Components.pen#eWFbE (20 px · radius 4 · 1.5 px border · label 14)
 * Touch target: the whole label row is ≥ 44 px on touch devices.
 */

import type { InputHTMLAttributes, ReactNode } from "react";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  id: string;
  label: ReactNode;
}

export function Checkbox({ id, label, className, ...rest }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={[
        "inline-flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm text-ink-secondary sm:min-h-0",
        className ?? "",
      ].join(" ")}
    >
      <input
        id={id}
        type="checkbox"
        className="h-5 w-5 rounded-none border border-line-strong bg-surface text-accent focus:ring-accent/20"
        {...rest}
      />
      <span>{label}</span>
    </label>
  );
}
