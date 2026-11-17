/**
 * Ami még érdekelhet — ajánlott túrák és egy szervezőre váró ötlet.
 *
 * Design: design/claude/D25_Nyitooldal#Teli, #Ures, #Uj. Teli napon is ott van a teendők alatt,
 * üres napon előrelép. A kártya a Felfedezés formanyelvét követi: 3:2 kép, kategória-chip,
 * cím, helyszín, időpont, ár és szöveges „Részletek →”.
 */

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getServerT } from "@/lib/i18n/server";
import type { Suggestion } from "@/app/(app)/dashboard/queries";

interface DemandIdea {
  slug: string;
  title: string;
  members: string;
  window: string;
}

export async function SuggestionGrid({ trips, idea }: { trips: Suggestion[]; idea: DemandIdea | null }) {
  const { t } = await getServerT();
  if (trips.length === 0 && !idea) return null;

  return (
    <section data-testid="dash-discover" className="bg-canvas text-ink">
      <div className="mx-auto flex max-w-7xl flex-col gap-3.5 px-4 py-8 md:gap-5 md:px-[120px] md:py-14">
        <div className="flex flex-wrap items-baseline justify-between gap-2 gap-x-6">
          <h2 className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-accent">{t("dashboard.discoverTitle")}</h2>
          <Link href="/" className="inline-flex items-center gap-1.5 text-[15px] font-bold text-accent focus-visible:outline-hidden focus-visible:shadow-(--focus-ring)">
            {t("dashboard.discoverAll")}
            <Icon name="arrow-right" size={15} aria-hidden />
          </Link>
        </div>
        <p className="max-w-[680px] text-[15px] text-ink-body md:text-[17px]">{t("dashboard.discoverLead")}</p>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trips.map((s) => (
            <li key={s.id} className="flex flex-col border border-line bg-surface">
              <Link href={`/trips/${s.slug}`} className="flex flex-1 flex-col focus-visible:outline-hidden focus-visible:shadow-(--focus-ring)">
                <div className="relative aspect-3/2 overflow-hidden bg-ghost">
                  {s.image && <Image src={s.image} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />}
                  {s.categoryName && (
                    <span
                      className="absolute left-0 top-0 px-2.5 py-1 font-mono text-[12px] font-medium uppercase tracking-[0.06em] text-accent-on"
                      style={s.categoryColor ? { backgroundColor: s.categoryColor } : undefined}
                    >
                      {s.categoryName}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 px-4 pb-4 pt-3.5">
                  <h3 className="text-lg font-bold leading-tight">{s.title}</h3>
                  {s.place && (
                    <p className="flex items-center gap-1.5 text-sm text-ink-muted">
                      <Icon name="map-pin" size={14} aria-hidden />
                      {s.place}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 text-sm text-ink-muted">
                    <Icon name="calendar" size={14} aria-hidden />
                    {s.dates}
                  </p>
                  <p className="mt-auto flex items-baseline justify-between gap-2.5 pt-2.5">
                    <span className="font-mono text-base font-semibold">{s.price}</span>
                    <span className="inline-flex items-center gap-1.5 text-[15px] font-bold text-accent">
                      {t("nav.details")}
                      <Icon name="arrow-right" size={15} aria-hidden />
                    </span>
                  </p>
                </div>
              </Link>
            </li>
          ))}

          {idea && (
            <li className="flex flex-col gap-2.5 border border-ink bg-ghost p-4" data-testid="dash-demand-idea">
              <span className="flex items-center gap-2">
                <Icon name="lightbulb" size={20} className="text-accent" aria-hidden />
                <span className="font-mono text-[12px] font-medium uppercase tracking-[0.06em] text-accent">{t("dashboard.demandLabel")}</span>
              </span>
              <h3 className="text-lg font-bold leading-tight">{idea.title}</h3>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <Icon name="users" size={14} aria-hidden />
                  {idea.members}
                </span>
                {idea.window && <span>{idea.window}</span>}
              </p>
              <Link
                href={`/ideas/${idea.slug}`}
                className="mt-auto inline-flex h-12 items-center justify-center gap-2 border border-ink bg-canvas px-4 text-[15px] font-bold text-ink transition-colors hover:bg-hover focus-visible:outline-hidden focus-visible:shadow-(--focus-ring)"
              >
                {t("dashboard.demandCta")}
                <Icon name="arrow-right" size={16} aria-hidden />
              </Link>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
