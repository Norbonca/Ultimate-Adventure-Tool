/**
 * Toggle — labelled on/off switch.
 *
 * Design: design/D01_User_Auth_Profile.pen#4H1ET (track 44×24 · radius 12 · knob 20 · teal on)
 * Brand: Trevu_Brand_Guide.docx §3 — teal accent for active state.
 * No hooks — controlled via `checked` + `onChange`. Renders a switch-role button,
 * so it works inside forms without submitting them.
 */

import type { ReactNode } from "react";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  /** Places the switch after the label block (default: before). */
  trailing?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  trailing = false,
  disabled,
  className,
  "aria-label": ariaLabel,
}: ToggleProps) {
  const track = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-trevu-600/30 disabled:opacity-50 disabled:pointer-events-none ${
        checked ? "bg-trevu-600" : "bg-navy-200"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );

  if (!label) return track;

  const text = (
    <span className="min-w-0">
      <span className="text-sm font-medium text-navy-700">{label}</span>
      {description && <span className="block text-xs text-navy-400">{description}</span>}
    </span>
  );

  return (
    <span className={["flex items-center gap-3", className ?? ""].join(" ")}>
      {trailing ? (
        <>
          {text}
          {track}
        </>
      ) : (
        <>
          {track}
          {text}
        </>
      )}
    </span>
  );
}
