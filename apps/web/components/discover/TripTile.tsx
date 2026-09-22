/**
 * TripTile — csempe (rács) túrakártya, a Discover nyitónézete.
 *
 * Design: design/D02_Trip_Management.pen#KjUcp (Component/TripCard/Tile, Night),
 * képernyőn: #GRID1440 és #GRID390 (lásd DESIGN_INDEX).
 * Felül 200 px-es borítókép, rajta bal oldalt kategória-chip, jobb oldalt szabad helyek;
 * alatta cím (H4), hely, dátum, szervező; elválasztó után nehézség és ár / fő.
 * Az egész csempe egy link; emelés árnyék nélkül, a keret világosodik.
 */

import Link from "next/link";
import type { LucideIcon } from "@/lib/icons";
import { Calendar, MapPin, UserCircle, Users } from "@/lib/icons";
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
}

export function TripTile({ href, title, imageUrl, place, dates, spots, host, difficulty, category, price, priceCaption }: TripTileProps) {
  const CatIcon = category?.icon;
  return (
    <Link
      href={href}
      data-testid="trip-tile"
      className="group flex h-full flex-col overflow-hidden border border-line bg-surface transition-colors duration-150 hover:border-accent focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <div className="relative h-[200px] shrink-0 bg-line">
        {imageUrl && (
          // A borítóképek külső tárhelyről jönnek (Supabase Storage, Unsplash) — a sávokkal egyezően <img>.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          {category && CatIcon ? (
            <span className={`inline-flex items-center gap-1.5 bg-glass px-2.5 py-1 text-xs font-semibold backdrop-blur ${CATEGORY_TEXT[category.token]}`}>
              <CatIcon size={14} aria-hidden />
              {category.label}
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1.5 bg-glass px-2.5 py-1 text-xs font-semibold text-ink backdrop-blur">
            <Users size={12} aria-hidden />
            {spots}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 px-[18px] pb-[18px] pt-4">
        <h3 data-testid="trip-tile-title" className="line-clamp-2 font-display text-2xl font-extrabold leading-none text-ink">
          {title}
        </h3>
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <MapPin size={14} aria-hidden className="shrink-0" />
          <span className="line-clamp-1">{place}</span>
        </p>
        {dates && (
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
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-[18px] py-3.5">
        {difficulty ? (
          <span className="bg-ghost px-2.5 py-1 text-xs font-semibold text-ink-secondary">{difficulty}</span>
        ) : (
          <span />
        )}
        <span className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-lg font-bold text-ink">{price}</span>
          <span className="text-xs font-medium text-ink-secondary">{priceCaption}</span>
        </span>
      </div>
    </Link>
  );
}
