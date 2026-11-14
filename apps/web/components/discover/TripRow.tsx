/**
 * TripRow — tömör túrasor a Discover listanézetéhez (B „Terep”, terv: design/claude/B_Komponensek
 * ZHO_B_Nyitooldal / ZHO_B_Mobil „02 / Indulások” sorai; design system: TripRow).
 *
 * Egy sor = egy túra: kis borítókép, cím, egy sor meta (hely · dátum · kategória · nehézség · helyek),
 * jobbra az ár / fő és a nyíl. A teljes sor egy link. Sorozatnál a meta az időpontok számát és a
 * következő időpontot mutatja; az egyes időpontok a túraoldalon választhatók.
 * Felület: vonal választja el a sorokat, árnyék és lekerekítés nincs; hover: háttérváltás, a nyíl lép.
 */

import Link from "next/link";
import { CoverImage } from "@/components/ui/CoverImage";
import type { LucideIcon } from "@/lib/icons";
import { ArrowRight } from "@/lib/icons";
import { CATEGORY_TEXT, type CategoryToken } from "./TripBand";

export interface TripRowProps {
  href: string;
  title: string;
  imageUrl: string | null;
  /** A meta sor elemei, sorrendben (üresek kimaradnak). */
  meta: Array<string | null | undefined>;
  category?: { label: string; token: CategoryToken; icon: LucideIcon } | null;
  price: string;
  priceCaption: string;
}

export function TripRow({ href, title, imageUrl, meta, category, price, priceCaption }: TripRowProps) {
  const CategoryIcon = category?.icon;
  return (
    <Link
      href={href}
      data-testid="trip-row"
      className="group grid grid-cols-[72px_minmax(0,1fr)] items-center gap-x-4 gap-y-1 border-b border-line py-3 transition-colors hover:bg-ghost focus-visible:outline-hidden focus-visible:shadow-(--focus-ring) md:grid-cols-[112px_minmax(0,1fr)_auto_24px] md:gap-x-6 md:px-3"
    >
      <div className="relative row-span-2 h-[72px] w-[72px] overflow-hidden bg-ghost md:row-span-1 md:w-[112px]">
        {imageUrl && <CoverImage src={imageUrl} alt="" sizes="112px" className="object-cover" />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-bold text-ink md:text-lg" data-testid="trip-row-title">{title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
          {category && CategoryIcon && (
            <span className={`inline-flex items-center gap-1 font-semibold ${CATEGORY_TEXT[category.token]}`}>
              <CategoryIcon size={14} aria-hidden />
              {category.label}
            </span>
          )}
          {meta.filter(Boolean).map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2">
              {(i > 0 || category) && <span aria-hidden className="text-ink-subtle">·</span>}
              {item}
            </span>
          ))}
        </p>
      </div>
      <p className="col-start-2 whitespace-nowrap text-left md:col-start-auto md:text-right">
        <span className="text-base font-bold text-ink md:text-lg">{price}</span>{" "}
        <span className="text-xs text-ink-muted">{priceCaption}</span>
      </p>
      <ArrowRight
        size={18}
        aria-hidden
        className="hidden text-ink-muted transition-transform group-hover:translate-x-1 group-hover:text-accent md:block"
      />
    </Link>
  );
}
