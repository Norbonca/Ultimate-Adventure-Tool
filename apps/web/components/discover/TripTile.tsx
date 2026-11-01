/**
 * TripTile — csempe (rács) túrakártya, a Discover nyitónézete.
 *
 * Design: design/D02_Trip_Management.pen#KjUcp (Component/TripCard/Tile, Night),
 * képernyőn: #GRID1440 és #GRID390 (lásd DESIGN_INDEX).
 * Felül 200 px-es borítókép, rajta bal oldalt kategória-chip, jobb oldalt szabad helyek;
 * alatta cím (H4), hely, dátum, szervező; elválasztó után nehézség és ár / fő.
 * Az egész csempe egy link; emelés árnyék nélkül, a keret világosodik.
 *
 * M024 sorozat-változat (design/D09_Search_Discover.pen#X5GF9, spec K-5…K-7): a chip az időpontok
 * számát mutatja, a törzsben legfeljebb 3 időpontsor (mindegyik a saját túrájára visz) és „+N további”.
 * Ilyenkor a csempe nem egyetlen <a> (beágyazott link nem lehet): a cím linkje feszül ki a kártyára,
 * a sorok fölötte, saját linkként.
 */

import Link from "next/link";
import { CoverImage } from "@/components/ui/CoverImage";
import type { LucideIcon } from "@/lib/icons";
import { Calendar, CalendarDays, ChevronRight, MapPin, UserCircle, Users } from "@/lib/icons";
import { CATEGORY_TEXT, type CategoryToken } from "./TripBand";

export interface TripTileProps {
  href: string;
  title: string;
  imageUrl: string | null;
  place: string;
  dates: string;
  spots: string;
  host?: string | null;
  difficulty?: string | null;
  category?: { label: string; token: CategoryToken; icon: LucideIcon } | null;
  price: string;
  priceCaption: string;
  /** M024: a sorozat időpontjai (csak sorozatkártyán). */
  series?: TripTileSeries | null;
}

export interface TripTileSeriesRow {
  key: string;
  href: string;
  /** Dátumtartomány. */
  label: string;
  /** „5 hely” vagy „Betelt”. */
  status: string;
  full: boolean;
}

export interface TripTileSeries {
  title: string;
  rows: TripTileSeriesRow[];
  more?: { href: string; label: string } | null;
}

/** M024 időpontsorok — csempén és sávon közös (D09 X5GF9 / a9sRR1). */
export function SeriesRows({ series, testId }: { series: TripTileSeries; testId: string }) {
  return (
    <div className="relative z-10 flex flex-col gap-1.5" data-testid={testId}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{series.title}</p>
      <ul className="flex flex-col gap-1">
        {series.rows.map((row) => (
          <li key={row.key}>
            <Link
              href={row.href}
              data-testid="series-row"
              className="flex min-h-11 items-center justify-between gap-3 rounded-trevu bg-ghost px-3 text-sm hover:bg-line focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <span className={row.full ? "text-ink-muted line-through" : "font-semibold text-ink"}>{row.label}</span>
              <span className={row.full ? "text-xs font-semibold text-[var(--color-danger)]" : "text-xs font-medium text-ink-secondary"}>
                {row.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {series.more && (
        <Link
          href={series.more.href}
          data-testid="series-more"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          {series.more.label}
          <ChevronRight size={14} aria-hidden />
        </Link>
      )}
    </div>
  );
}

export function TripTile({ href, title, imageUrl, place, dates, spots, host, difficulty, category, price, priceCaption, series }: TripTileProps) {
  const CatIcon = category?.icon;
  const isSeries = !!series && series.rows.length + (series.more ? 1 : 0) > 0;
  const shell =
    "group flex h-full flex-col overflow-hidden rounded-trevu-2xl border border-line bg-surface transition duration-150 hover:-translate-y-px hover:border-line-strong";
  const SpotsIcon = isSeries ? CalendarDays : Users;
  const body = (
    <>
      <div className="relative h-[200px] shrink-0 bg-line">
        {imageUrl && (
          <CoverImage src={imageUrl} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
        )}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          {category && CatIcon ? (
            <span className={`inline-flex items-center gap-1.5 rounded-chip bg-glass px-2.5 py-1 text-xs font-semibold backdrop-blur ${CATEGORY_TEXT[category.token]}`}>
              <CatIcon size={14} aria-hidden />
              {category.label}
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-glass px-2.5 py-1 text-xs font-semibold text-ink backdrop-blur">
            <SpotsIcon size={12} aria-hidden />
            {spots}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 px-[18px] pb-[18px] pt-4">
        <h3 data-testid="trip-tile-title" className="line-clamp-2 text-lg font-semibold leading-tight text-ink">
          {isSeries ? (
            <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <MapPin size={14} aria-hidden className="shrink-0" />
          <span className="line-clamp-1">{place}</span>
        </p>
        {dates && !isSeries && (
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <Calendar size={14} aria-hidden className="shrink-0" />
            <span className="line-clamp-1">{dates}</span>
          </p>
        )}
        {host && (
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <UserCircle size={14} aria-hidden className="shrink-0" />
            <span className="line-clamp-1">{host}</span>
          </p>
        )}
        {isSeries && series && <SeriesRows series={series} testId="trip-tile-series" />}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-[18px] py-3.5">
        {difficulty ? (
          <span className="rounded-chip bg-ghost px-2.5 py-1 text-xs font-semibold text-ink-secondary">{difficulty}</span>
        ) : (
          <span />
        )}
        <span className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-lg font-bold text-ink">{price}</span>
          <span className="text-xs font-medium text-ink-secondary">{priceCaption}</span>
        </span>
      </div>
    </>
  );

  return isSeries ? (
    <article data-testid="trip-tile" data-series="true" className={`relative ${shell} focus-within:shadow-[var(--focus-ring)]`}>
      {body}
    </article>
  ) : (
    <Link href={href} data-testid="trip-tile" className={`${shell} focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]`}>
      {body}
    </Link>
  );
}
