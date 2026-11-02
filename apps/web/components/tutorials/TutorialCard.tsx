/**
 * M211 — TutorialCard (D21 `FjJGJ`; mobilon a `t09vs` tömör sora: 120×68 bélyeg + szöveg).
 * Hook nélküli: szerver- és kliensoldalon is használható; a feliratokat a hívó adja.
 */

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { loc, posterUrl, tutorialHref, type Tutorial } from "@/lib/tutorials";

interface TutorialCardProps {
  tutorial: Tutorial;
  locale: string;
  roleLabel: string;
  /** Bal felső címke (felirat vagy képes bemutató). */
  badge: { icon: string; label: string };
  /** Jobb alsó címke (videó hossza vagy lépések száma). */
  lengthLabel: string;
  /** Címkék feliratai (D21 jegyzet `MsQJJ`). */
  tags?: string[];
}

export function TutorialCard({ tutorial, locale, roleLabel, badge, lengthLabel, tags = [] }: TutorialCardProps) {
  return (
    <Link
      href={tutorialHref(tutorial.slug)}
      className="group flex gap-3 rounded-trevu-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:flex-col sm:gap-3"
      data-testid={`tutorial-card-${tutorial.slug}`}
    >
      <span className="relative block h-[68px] w-[120px] shrink-0 overflow-hidden rounded-[8px] border border-line sm:aspect-video sm:h-auto sm:w-full sm:rounded-trevu-xl">
        <Image src={posterUrl(tutorial.slug)} alt="" fill sizes="(min-width: 1024px) 336px, (min-width: 640px) 50vw, 120px" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0)_40%,rgba(15,23,42,0.7)_100%)]" />
        <span className="absolute bottom-1 right-1 inline-flex items-center gap-1 rounded-[4px] bg-[rgba(15,23,42,0.8)] px-1.5 py-0.5 text-[11px] font-semibold text-white sm:bottom-2 sm:right-2 sm:text-xs">
          {lengthLabel}
        </span>
        <span className="absolute left-2 top-2 hidden items-center gap-1 rounded-chip bg-[rgba(15,23,42,0.8)] px-1.5 py-0.5 text-xs font-semibold text-white sm:inline-flex">
          <Icon name={badge.icon} size={13} aria-hidden />
          {badge.label}
        </span>
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-accent sm:text-[11px]">
          {roleLabel} · {loc(tutorial.topic, locale)}
        </span>
        <span className="text-[15px] font-semibold leading-snug text-ink group-hover:text-accent sm:text-lg">{loc(tutorial.title, locale)}</span>
        <span className="hidden text-sm leading-relaxed text-ink-secondary sm:line-clamp-2">{loc(tutorial.summary, locale)}</span>
        {tags.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1.5" data-testid={`tutorial-tags-${tutorial.slug}`}>
            {tags.map((tag) => (
              <span key={tag} className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-ink-secondary">
                {tag}
              </span>
            ))}
          </span>
        )}
      </span>
    </Link>
  );
}
