/**
 * StateTemplate — the five system states, one component for every page.
 *
 * Design: design/D00_Core_Components.pen#v0Gvw (loading), #3VCtO (empty), #U49Jt (error),
 * #bDfWg (success), #pJn9Z (permission). 80 px tinted icon circle · title 18/700 ·
 * description 14 muted · actions row. No hooks: pass translated strings from the caller
 * (`t()` in Client Components, `getServerT()` in Server Components).
 */

import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";

export type StateVariant = "loading" | "empty" | "error" | "success" | "permission";

const VARIANT: Record<StateVariant, { icon: string; circle: string; iconColor: string }> = {
  loading: { icon: "loader-2", circle: "bg-trevu-50", iconColor: "text-trevu-600" },
  empty: { icon: "folder-open", circle: "bg-navy-100", iconColor: "text-navy-400" },
  error: { icon: "alert-triangle", circle: "bg-coral/10", iconColor: "text-coral" },
  success: { icon: "check", circle: "bg-trevu-50", iconColor: "text-trevu-600" },
  permission: { icon: "lock", circle: "bg-golden/15", iconColor: "text-amber-500" },
};

export interface StateTemplateProps {
  variant: StateVariant;
  title: ReactNode;
  description?: ReactNode;
  /** Icon Bank key overriding the variant default. */
  icon?: string;
  /** Action buttons (use <Button />). */
  actions?: ReactNode;
  className?: string;
}

export function StateTemplate({ variant, title, description, icon, actions, className }: StateTemplateProps) {
  const v = VARIANT[variant];
  const iconName = icon ?? v.icon;
  return (
    <section
      role={variant === "error" ? "alert" : "status"}
      aria-busy={variant === "loading" || undefined}
      className={[
        "flex w-full flex-col items-center justify-center gap-4 rounded-trevu-2xl bg-navy-50 px-10 py-14 text-center",
        className ?? "",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-20 w-20 items-center justify-center rounded-full",
          v.circle,
          v.iconColor,
          variant === "loading" ? "animate-pulse" : "",
        ].join(" ")}
      >
        <Icon name={iconName} size={40} className={variant === "loading" ? "animate-spin" : undefined} />
      </div>
      <h2 className="text-lg font-bold text-navy-900">{title}</h2>
      {description && <p className="max-w-[420px] text-sm text-navy-500">{description}</p>}
      {actions && <div className="mt-1 flex flex-wrap items-center justify-center gap-2.5">{actions}</div>}
    </section>
  );
}
