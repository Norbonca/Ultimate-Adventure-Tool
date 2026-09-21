/**
 * Button — Trevu UI primitive.
 *
 * Design: design/D00_Core_Components.pen#uxEji (Primary), #UzuFj (Outline), #n85yk (Social)
 * Overhaul: square geometry, Sofia Sans 600, signal-orange primary, no elevation.
 * Tokens only (semantic canvas/surface/ink/line/accent aliases).
 * No hooks — usable in Server and Client Components. Renders <a> (next/link) when `href` is set.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";

export type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "social";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-on hover:bg-accent-hover focus-visible:ring-accent/30",
  outline:
    "bg-surface text-ink border border-line-strong hover:bg-ghost hover:text-accent focus-visible:ring-accent/20",
  ghost:
    "bg-ghost text-ink hover:bg-line focus-visible:ring-line-strong",
  danger:
    "bg-coral text-white hover:bg-coral/90 focus-visible:ring-coral/30",
  social:
    "bg-surface text-ink border border-line hover:border-line-strong focus-visible:ring-accent/20 font-medium",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "min-h-[40px] px-4 py-2 text-sm gap-1.5",
  md: "min-h-[48px] px-7 py-3.5 text-[15px] gap-2",
  lg: "min-h-[48px] px-7 py-3.5 text-[15px] gap-2",
};

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon Bank key (kebab-case lucide), rendered before the label. */
  icon?: string;
  /** Icon Bank key rendered after the label. */
  iconRight?: string;
  href?: string;
  fullWidth?: boolean;
  loading?: boolean;
  children: ReactNode;
}

function classes(
  variant: ButtonVariant,
  size: ButtonSize,
  fullWidth: boolean,
  extra: string | undefined,
) {
  return [
    "inline-flex items-center justify-center rounded-none font-semibold",
    "transition-colors duration-150 select-none",
    "focus:outline-none focus-visible:ring-[3px]",
    "disabled:opacity-50 disabled:pointer-events-none",
    VARIANT[variant],
    SIZE[size],
    fullWidth ? "w-full" : "",
    extra ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  href,
  fullWidth = false,
  loading = false,
  className,
  children,
  type = "button",
  disabled,
  ...rest
}: ButtonProps) {
  const iconSize = size === "sm" ? 16 : 18;
  const content = (
    <>
      {icon && <Icon name={icon} size={iconSize} />}
      <span>{children}</span>
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </>
  );
  const cls = classes(variant, size, fullWidth, className);

  if (href) {
    return (
      <Link href={href} className={cls} aria-disabled={disabled || loading}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
}
