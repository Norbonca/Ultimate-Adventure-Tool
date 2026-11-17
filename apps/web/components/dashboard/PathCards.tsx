/**
 * Merre indulj? — két út egymás mellett: résztvevőként vagy szervezőként.
 *
 * Design: design/claude/D25_Nyitooldal#Ures, #Uj. Üres napon ez lép a teendő-sávok helyére,
 * új felhasználónál ez a lap törzse. A bal blokk Night (szén), a jobb Day (csont) — ugyanaz
 * a szerep-elválasztás, mint a teendő-sávoknál.
 */

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getServerT } from "@/lib/i18n/server";
import type { TranslationKey } from "@uat/i18n";

interface UtProps {
  labelKey: TranslationKey;
  titleKey: TranslationKey;
  leadKey: TranslationKey;
  pontok: { icon: string; key: TranslationKey }[];
  ctaKey: TranslationKey;
  href: string;
  ikon: string;
  night: boolean;
  testId: string;
}

async function Ut({ labelKey, titleKey, leadKey, pontok, ctaKey, href, ikon, night, testId }: UtProps) {
  const { t } = await getServerT();
  return (
    <div
      {...(night ? { "data-surface": "night" } : {})}
      data-testid={testId}
      className="flex flex-1 flex-col gap-3.5 bg-canvas px-4 py-7 text-ink md:basis-[440px] md:px-10 md:py-9"
    >
      <span className="flex items-center gap-2.5">
        <Icon name={ikon} size={22} className="text-accent" aria-hidden />
        <span className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-accent">{t(labelKey)}</span>
      </span>
      <h3 className="text-[30px] uppercase leading-[0.98] md:text-[40px]">{t(titleKey)}</h3>
      <p className="text-[15px] leading-snug text-ink-body md:text-[17px]">{t(leadKey)}</p>
      <ul className="mt-1">
        {pontok.map((p) => (
          <li key={p.key} className="flex items-start gap-2.5 border-t border-line py-2.5">
            <span className="mt-[2px]">
              <Icon name={p.icon} size={18} className="text-ink-muted" aria-hidden />
            </span>
            <span className="text-[15px] leading-snug md:text-base">{t(p.key)}</span>
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className="mt-auto inline-flex h-13 items-center justify-center gap-2 bg-accent px-6 text-base font-bold text-accent-on transition-colors hover:bg-accent-hover focus-visible:outline-hidden focus-visible:shadow-(--focus-ring)"
      >
        {t(ctaKey)}
        <Icon name="arrow-right" size={18} aria-hidden />
      </Link>
    </div>
  );
}

export async function PathCards({ titleKey }: { titleKey: TranslationKey }) {
  const { t } = await getServerT();
  return (
    <section data-testid="dash-paths" className="flex flex-col gap-3.5 pt-7 md:gap-5 md:pt-11">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-[120px]">
        <h2 className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-accent">{t(titleKey)}</h2>
      </div>
      <div className="flex flex-col border-t border-ink md:flex-row md:flex-wrap">
        <Ut
          night
          testId="dash-path-participant"
          ikon="compass"
          labelKey="dashboard.pathParticipantLabel"
          titleKey="dashboard.pathParticipantTitle"
          leadKey="dashboard.pathParticipantLead"
          pontok={[
            { icon: "search", key: "dashboard.pathParticipantPoint1" },
            { icon: "map-pin", key: "dashboard.pathParticipantPoint2" },
            { icon: "users", key: "dashboard.pathParticipantPoint3" },
          ]}
          ctaKey="dashboard.pathParticipantCta"
          href="/"
        />
        <Ut
          night={false}
          testId="dash-path-organizer"
          ikon="plus"
          labelKey="dashboard.pathOrganizerLabel"
          titleKey="dashboard.pathOrganizerTitle"
          leadKey="dashboard.pathOrganizerLead"
          pontok={[
            { icon: "lightbulb", key: "dashboard.pathOrganizerPoint1" },
            { icon: "clipboard-list", key: "dashboard.pathOrganizerPoint2" },
            { icon: "file-pen", key: "dashboard.pathOrganizerPoint3" },
          ]}
          ctaKey="dashboard.pathOrganizerCta"
          href="/trips/new"
        />
      </div>
    </section>
  );
}
