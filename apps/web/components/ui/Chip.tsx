/**
 * Chip — category and status badges.
 *
 * Brand: Trevu_Brand_Guide.docx §3 — category: 10 % category colour background + full colour
 * text, radius 6 (`rounded-chip`), padding 4×10, DM Sans 500 12 px. Status: Active = Trail Sage,
 * Upcoming = Golden Hour, Closed = Cloud / Slate.
 * Design: design/D02_Trip_Management.pen#RNDGS (pills), #NCfEW (card category chip).
 * Category keys follow modules/00_Reference_Data/03_Icon_Bank.md §12 (`cat.*`).
 */

import type { HTMLAttributes, ReactNode } from "react";
import { Icon } from "@/components/Icon";

export type CategoryKey =
  | "hiking" | "climbing" | "water" | "cycling" | "running" | "winter" | "expedition" | "motorsport";
export type StatusKey = "active" | "upcoming" | "closed";

const CATEGORY: Record<CategoryKey, string> = {
  hiking: "bg-cat-hiking/10 text-cat-hiking",
  climbing: "bg-cat-climbing/10 text-cat-climbing",
  water: "bg-cat-water/10 text-cat-water",
  cycling: "bg-cat-cycling/10 text-cat-cycling",
  running: "bg-cat-running/10 text-cat-running",
  winter: "bg-cat-winter/10 text-cat-winter",
  expedition: "bg-cat-expedition/10 text-cat-expedition",
  motorsport: "bg-cat-motorsport/10 text-cat-motorsport",
};

const STATUS: Record<StatusKey, string> = {
  active: "bg-sage/25 text-trevu-800",
  upcoming: "bg-golden/25 text-amber-800",
  closed: "bg-navy-200 text-navy-500",
};

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  category?: CategoryKey;
  status?: StatusKey;
  /** Icon Bank key; for categories use the `cat.*` lucide name (footprints, mountain, …). */
  icon?: string;
  /** Solid variant for use over images (card image overlay). */
  solid?: boolean;
  children: ReactNode;
}

export function Chip({ category, status, icon, solid, className, children, ...rest }: ChipProps) {
  const tone = category
    ? solid
      ? "bg-trevu-600 text-white"
      : CATEGORY[category]
    : status
      ? STATUS[status]
      : "bg-navy-100 text-navy-700";
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-chip px-2.5 py-1 text-xs font-medium leading-4 whitespace-nowrap",
        tone,
        className ?? "",
      ].join(" ")}
      {...rest}
    >
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}
