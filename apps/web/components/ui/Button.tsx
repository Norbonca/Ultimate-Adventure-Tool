/**
 * Button — Trevu UI primitive.
 *
 * Design: design/D00_Core_Components.pen#uxEji (Primary), #UzuFj (Outline), #n85yk (Social)
 * Brand: Trevu_Brand_Guide.docx §3 — radius 10, padding 14×28, DM Sans 600, primary shadow.
 * Tokens only (tailwind theme: trevu-*, navy-*, coral, rounded-trevu, shadow-trevu).
 * No hooks — usable in Server and Client Components. Renders <a> (next/link) when `href` is set.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";

export type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "social";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-trevu-600 text-white shadow-trevu hover:bg-trevu-700 focus-visible:ring-trevu-600/30",
  outline:
    "bg-white text-navy-900 border border-navy-200 hover:border-trevu-600 hover:text-trevu-700 focus-visible:ring-trevu-600/20",
  ghost:
    "bg-navy-100 text-navy-900 hover:bg-navy-200 focus-visible:ring-navy-300",
  danger:
    "bg-coral text-white hover:bg-coral/90 focus-visible:ring-coral/30",
  social:
    "bg-white text-navy-900 border border-navy-200 hover:bg-navy-50 focus-visible:ring-trevu-600/20 font-medium",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "min-h-[40px] px-4 py-2 text-sm gap-1.5",
  md: "min-h-[44px] px-6 py-3 text-[15px] gap-2",
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
    "inline-flex items-center justify-center rounded-trevu font-semibold",
    "transition-all duration-200 select-none",
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
