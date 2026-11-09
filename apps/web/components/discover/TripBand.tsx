/**
 * TripBand — „borítós sáv” túrakártya (Brand Guide v2 §6, TripCard `band`).
 *
 * Design: design/D00_Core_Components.pen#gSqMV (asztali), design/D02_Trip_Management.pen#xFwYP
 * (mobil), képernyőn: #H1rRQE (1440), #l87Il (390).
 * Asztali: bal oldalt 3:2 kép (220 px), cím (H3) → hely · dátum · szabad helyek → kategória-chip,
 * jobb szélen „ár / fő”, ár (H4), „Részletek →”. Mobil: 112 px kép, cím, meta, alul ár + CTA.
 * Az egész sáv egy link; emelés árnyék nélkül, a keret és a háttér világosodik.
 *
 * M024 sorozat-változat (design/D09_Search_Discover.pen#a9sRR1 asztali, #f6q9UL mobil): asztalin
 * dátum-chipek sora (mindegyik a saját túrájára visz) + „+N további”, mobilon „Legközelebb: …” sor.
 * Ilyenkor a cím linkje feszül ki a sávra (beágyazott link nem lehet), a chipek fölötte.
 */

import Link from "next/link";
import { CoverImage } from "@/components/ui/CoverImage";
import type { LucideIcon } from "@/lib/icons";
import { ArrowRight, CalendarDays, MapPin } from "@/lib/icons";

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

const CHIP: Record<CategoryToken, string> = {
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
  /** M024: a sorozat időpontjai (csak sorozatkártyán). */
  series?: TripBandSeries | null;
}

export interface TripBandSeries {
  chips: { key: string; href: string; label: string; full: boolean; title: string }[];
  more?: { href: string; label: string } | null;
  /** Mobil: „Legközelebb: máj. 10–17. · 5 hely”. */
  nextLabel: string;
}

export function TripBand({ href, title, imageUrl, place, details, category, price, priceCaption, ctaLabel, series }: TripBandProps) {
  const CatIcon = category?.icon;
  const isSeries = !!series && series.chips.length + (series.more ? 1 : 0) > 0;
  const meta = [place, ...(isSeries ? [] : details)].filter(Boolean).join(" · ");
  const shell =
    "group flex min-h-[120px] overflow-hidden rounded-trevu-2xl border border-line bg-surface transition duration-150 hover:-translate-y-px hover:border-line-strong md:min-h-[147px]";

  const body = (
    <>
      <div className="relative w-28 shrink-0 bg-line md:w-[220px]">
        {imageUrl && (
          <CoverImage src={imageUrl} sizes="(min-width: 768px) 220px, 112px" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 px-3.5 py-3 md:justify-center md:gap-2 md:px-6 md:py-5">
        <h3 data-testid="trip-band-title" className="line-clamp-2 text-base font-semibold text-ink md:text-[22px] md:leading-tight">
          {isSeries ? (
            <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-hidden">
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <MapPin size={16} aria-hidden className="hidden shrink-0 md:block" />
          <span className="line-clamp-1">{meta}</span>
        </p>
        {isSeries && series && (
          <>
            <p className="flex items-center gap-1.5 text-sm font-medium text-ink md:hidden" data-testid="trip-band-series-next">
              <CalendarDays size={14} aria-hidden className="shrink-0 text-accent" />
              <span className="line-clamp-1">{series.nextLabel}</span>
            </p>
            <div className="relative z-10 hidden flex-wrap items-center gap-2 md:flex" data-testid="trip-band-series">
              {series.chips.map((chip) => (
                <Link
                  key={chip.key}
                  href={chip.href}
                  title={chip.title}
                  data-testid="series-chip"
                  className={`inline-flex min-h-9 items-center rounded-chip px-3 text-xs font-semibold focus-visible:outline-hidden focus-visible:shadow-(--focus-ring) ${
                    chip.full ? "bg-ghost text-ink-muted line-through" : "bg-ghost text-ink hover:bg-line"
                  }`}
                >
                  {chip.label}
                </Link>
              ))}
              {series.more && (
                <Link href={series.more.href} data-testid="series-more" className="inline-flex min-h-9 items-center text-xs font-semibold text-accent hover:underline">
                  {series.more.label}
                </Link>
              )}
            </div>
          </>
        )}
        {category && CatIcon && (
          <span className={`hidden w-fit items-center gap-1.5 rounded-chip px-2.5 py-1 text-xs font-medium md:inline-flex ${CHIP[category.token]}`}>
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
    </>
  );

  return isSeries ? (
    <article data-testid="trip-band" data-series="true" className={`relative ${shell} focus-within:shadow-(--focus-ring)`}>
      {body}
    </article>
  ) : (
    <Link href={href} data-testid="trip-band" className={`${shell} focus-visible:outline-hidden focus-visible:shadow-(--focus-ring)`}>
      {body}
    </Link>
  );
}
