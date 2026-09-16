/**
 * TripBand — „borítós sáv” túrakártya (Brand Guide v2 §6, TripCard `band`).
 *
 * Design: design/D00_Core_Components.pen#gSqMV (asztali), design/D02_Trip_Management.pen#xFwYP
 * (mobil), képernyőn: #H1rRQE (1440), #l87Il (390).
 * Asztali: bal oldalt 3:2 kép (220 px), cím (H3) → hely · dátum · szabad helyek → kategória-chip,
 * jobb szélen „ár / fő”, ár (H4), „Részletek →”. Mobil: 112 px kép, cím, meta, alul ár + CTA.
 * Az egész sáv egy link; emelés árnyék nélkül, a keret és a háttér világosodik.
 */

import Link from "next/link";
import type { LucideIcon } from "@/lib/icons";
import { ArrowRight, MapPin } from "@/lib/icons";

/** A --cat-* token kulcsa. A teljes osztálynevek itt állnak, hogy a Tailwind lássa őket. */
export type CategoryToken =
  | "hiking"
  | "climbing"
  | "water"
  | "cycling"
  | "running"
  | "winter"
  | "expedition"
  | "motorsport";

/** Kategória-chip osztályai (szöveg + árnyalt háttér) — a sávon és a hero-ban. */
export const CATEGORY_CHIP: Record<CategoryToken, string> = {
  hiking: "text-cat-token-hiking bg-[color-mix(in_srgb,var(--cat-hiking)_var(--chip-tint),transparent)]",
  climbing: "text-cat-token-climbing bg-[color-mix(in_srgb,var(--cat-climbing)_var(--chip-tint),transparent)]",
  water: "text-cat-token-water bg-[color-mix(in_srgb,var(--cat-water)_var(--chip-tint),transparent)]",
  cycling: "text-cat-token-cycling bg-[color-mix(in_srgb,var(--cat-cycling)_var(--chip-tint),transparent)]",
  running: "text-cat-token-running bg-[color-mix(in_srgb,var(--cat-running)_var(--chip-tint),transparent)]",
  winter: "text-cat-token-winter bg-[color-mix(in_srgb,var(--cat-winter)_var(--chip-tint),transparent)]",
  expedition: "text-cat-token-expedition bg-[color-mix(in_srgb,var(--cat-expedition)_var(--chip-tint),transparent)]",
  motorsport: "text-cat-token-motorsport bg-[color-mix(in_srgb,var(--cat-motorsport)_var(--chip-tint),transparent)]",
};

/** Kategória-szín osztálya ikonhoz (pl. a kategória-pirulákon). */
export const CATEGORY_TEXT: Record<CategoryToken, string> = {
  hiking: "text-cat-token-hiking",
  climbing: "text-cat-token-climbing",
  water: "text-cat-token-water",
  cycling: "text-cat-token-cycling",
  running: "text-cat-token-running",
  winter: "text-cat-token-winter",
  expedition: "text-cat-token-expedition",
  motorsport: "text-cat-token-motorsport",
};

export interface TripBandProps {
  href: string;
  title: string;
  imageUrl: string | null;
  /** Hely (város/régió, ország). */
  place: string;
  /** Dátum és szabad helyek — a hely után, „·” elválasztóval. */
  details: string[];
  category?: { label: string; token: CategoryToken; icon: LucideIcon } | null;
  price: string;
  priceCaption: string;
  ctaLabel: string;
}

export function TripBand({ href, title, imageUrl, place, details, category, price, priceCaption, ctaLabel }: TripBandProps) {
  const CatIcon = category?.icon;
  const meta = [place, ...details].filter(Boolean).join(" · ");

  return (
    <Link
      href={href}
      data-testid="trip-band"
      className="group flex min-h-[120px] overflow-hidden rounded-trevu-2xl border border-line bg-surface transition duration-150 hover:-translate-y-px hover:border-line-strong focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] md:min-h-[147px]"
    >
      <div className="relative w-28 shrink-0 bg-line md:w-[220px]">
        {imageUrl && (
          // A borítóképek külső tárhelyről jönnek (Supabase Storage, Unsplash) — a meglévő kártyákkal egyezően <img>.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 px-3.5 py-3 md:justify-center md:gap-2 md:px-6 md:py-5">
        <h3 data-testid="trip-band-title" className="line-clamp-2 text-base font-semibold text-ink md:text-[22px] md:leading-tight">
          {title}
        </h3>
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <MapPin size={16} aria-hidden className="hidden shrink-0 md:block" />
          <span className="line-clamp-1">{meta}</span>
        </p>
        {category && CatIcon && (
          <span className={`hidden w-fit items-center gap-1.5 rounded-chip px-2.5 py-1 text-xs font-medium md:inline-flex ${CATEGORY_CHIP[category.token]}`}>
            <CatIcon size={14} aria-hidden />
            {category.label}
          </span>
        )}
        {/* mobil lábléc: ár + CTA */}
        <div className="flex items-center justify-between md:hidden">
          <span className="whitespace-nowrap text-sm font-semibold text-ink">{price}</span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
            {ctaLabel}
            <ArrowRight size={14} aria-hidden />
          </span>
        </div>
      </div>

      <div className="hidden shrink-0 flex-col items-end justify-center gap-1.5 px-7 py-5 md:flex">
        <span className="text-xs font-medium text-ink-secondary">{priceCaption}</span>
        <span className="whitespace-nowrap text-lg font-semibold text-ink">{price}</span>
        <span className="inline-flex items-center gap-1.5 pt-1.5 text-sm font-semibold text-accent">
          {ctaLabel}
          <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
