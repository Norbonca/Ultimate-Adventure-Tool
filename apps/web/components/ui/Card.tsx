/**
 * Card — surface container + 3:2 image slot for trip / content cards.
 *
 * Brand: Trevu_Brand_Guide.docx §3 — white, 1 px Cloud border, radius 16 (`rounded-trevu-2xl`),
 * shadow 0 1px 2px, hover lift + 0 8px 24px; image 3:2.
 * Design: design/D02_Trip_Management.pen#NCfEW (Trip Card), design/D00_Core_Components.pen#5YqJY
 * (CategoryCard). No hooks; `href` renders the whole card as a link.
 */

import type { HTMLAttributes, ReactNode } from "react";
import Link from "next/link";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  href?: string;
  /** Adds hover lift + shadow (default true when `href` is set). */
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  children: ReactNode;
}

const PAD = { none: "", sm: "p-4", md: "p-5", lg: "p-6" } as const;

export function Card({ href, interactive, padding = "none", className, children, ...rest }: CardProps) {
  const hover = interactive ?? Boolean(href);
  const cls = [
    "block overflow-hidden rounded-trevu-2xl border border-navy-200 bg-white shadow-trevu-sm",
    "transition-all duration-300",
    hover ? "hover:-translate-y-0.5 hover:shadow-trevu-lg" : "",
    PAD[padding],
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export interface CardImageProps {
  src?: string | null;
  alt: string;
  /** Overlay content (chips, badges) positioned in the corners. */
  children?: ReactNode;
  className?: string;
}

/** 3:2 image area with an optional gradient fallback and overlay slot. */
export function CardImage({ src, alt, children, className }: CardImageProps) {
  return (
    <div className={["relative aspect-[3/2] w-full overflow-hidden bg-navy-100", className ?? ""].join(" ")}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote Supabase/Unsplash URLs; next/image migration is a separate DESIGN-FIRST decision
        <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div aria-hidden className="h-full w-full [background-image:var(--gradient-trevu)]" />
      )}
      {children && <div className="absolute inset-0 p-3">{children}</div>}
    </div>
  );
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={["flex flex-col gap-1.5 px-4 py-3.5", className ?? ""].join(" ")} {...rest}>
      {children}
    </div>
  );
}
