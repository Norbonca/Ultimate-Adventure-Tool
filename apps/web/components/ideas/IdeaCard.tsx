/**
 * M22 — IdeaCard/Tile.
 *
 * Design: design/claude/D22b_Turaotletek#Lista (1440), #Lista_390 (390);
 * archív: design/D22_Trip_Ideas.pen#p1baQq (Component/IdeaCard/Tile, „Éjszakai túra”).
 * Hook nélkül; a szövegeket a hívó fordítja (szerver- és kliensoldalon is használható).
 * Szerkezet a TripTile-lal azonos, a 2026-11-14-i tömör arányokkal (140 px-es kép, 14 px belső
 * tér, 16 px-es cím): kép + kategória-chip + csatlakozók; cím; célterület; időablak; ötletgazda;
 * lábléc: állapot/szándék-chip · avatárok · „Részletek →”.
 * B „Terep”: minden szín szemantikus tokenből — az állapotchip és az avatárok is (a korábbi
 * `--color-info` kék és a beégetett avatár-hexek a B palettáján kívül voltak).
 */

import Link from "next/link";
import { CoverImage } from "@/components/ui/CoverImage";
import { Icon } from "@/components/Icon";
import { CATEGORY_TEXT, type CategoryToken } from "@/components/discover/TripBand";

export interface IdeaCardProps {
  href: string;
  title: string;
  imageUrl: string | null;
  category: { label: string; token: CategoryToken; icon: string } | null;
  members: string; // „8 csatlakozó”
  destinations: string; // „Balti-tenger vagy Finn-öböl · FI, EE, SE”
  window: string; // „2027. júl.–aug. · legalább 10 nap”
  owner: string | null; // „Viktor K. ötlete”
  statusLabel: string; // „Szervezőt keres” / „Szervező jelentkezett” / „Túra lett belőle” / „Lejárt”
  statusTone?: "neutral" | "rating" | "success" | "muted";
  avatarCount: number;
  detailsLabel: string;
}

const STATUS_CLASS: Record<NonNullable<IdeaCardProps["statusTone"]>, string> = {
  neutral: "bg-ghost text-ink-secondary",
  rating: "bg-[color-mix(in_srgb,var(--color-rating)_18%,transparent)] text-(--color-rating)",
  success: "bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-(--color-success)",
  muted: "bg-ghost text-ink-muted",
};

/** Az avatárfoltok a B szerepszíneiből; a kártyán legfeljebb négy látszik. */
const AVATAR_FILL = ["bg-accent", "bg-(--color-rating)", "bg-(--color-success)", "bg-line-strong"];

export function IdeaCard(p: IdeaCardProps) {
  return (
    <Link
      href={p.href}
      data-testid="idea-card"
      className="group flex h-full flex-col overflow-hidden rounded-trevu-2xl border border-line bg-surface transition duration-150 hover:-translate-y-px hover:border-line-strong focus-visible:outline-hidden focus-visible:shadow-(--focus-ring)"
    >
      <div className="relative h-[140px] shrink-0 bg-line">
        {p.imageUrl && <CoverImage src={p.imageUrl} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />}
        <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-2">
          {p.category ? (
            <span className={`inline-flex items-center gap-1.5 rounded-chip bg-glass px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${CATEGORY_TEXT[p.category.token]}`}>
              <Icon name={p.category.icon} size={14} aria-hidden />
              {p.category.label}
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-glass px-2.5 py-1 text-xs font-semibold text-ink backdrop-blur-sm">
            <Icon name="users" size={12} aria-hidden />
            {p.members}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-3.5 pb-3 pt-3">
        <h3 data-testid="idea-card-title" className="line-clamp-2 text-base font-semibold leading-tight text-ink">{p.title}</h3>
        <p className="flex items-center gap-2 text-sm text-ink-muted"><Icon name="map-pin" size={14} aria-hidden className="shrink-0" /><span className="line-clamp-1">{p.destinations}</span></p>
        <p className="flex items-center gap-2 text-sm text-ink-muted"><Icon name="calendar-range" size={14} aria-hidden className="shrink-0" /><span className="line-clamp-1">{p.window}</span></p>
        {p.owner && <p className="flex items-center gap-2 text-sm text-ink-muted"><Icon name="lightbulb" size={14} aria-hidden className="shrink-0" /><span className="line-clamp-1">{p.owner}</span></p>}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line px-3.5 py-2.5">
        <span className={`rounded-chip px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[p.statusTone ?? "neutral"]}`}>{p.statusLabel}</span>
        <span className="flex items-center gap-2.5">
          <span className="flex -space-x-1.5" aria-hidden>
            {Array.from({ length: Math.min(4, Math.max(0, p.avatarCount)) }).map((_, i) => (
              <span key={i} className={`h-[22px] w-[22px] rounded-full border-2 border-surface ${AVATAR_FILL[i % AVATAR_FILL.length]}`} />
            ))}
          </span>
          <span className="text-sm font-semibold text-accent">{p.detailsLabel}</span>
        </span>
      </div>
    </Link>
  );
}
