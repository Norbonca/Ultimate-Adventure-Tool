/**
 * A következő túrád — kiemelt szén sáv valódi borítóképpel.
 *
 * Design: design/claude/D25_Nyitooldal#Teli, #Ures. A teendők UTÁN áll, nem előttük:
 * a lap első kérdése az, hogy mit kell most csinálni, és ez nem viheti el róla a figyelmet.
 */

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getServerT, getServerLocale } from "@/lib/i18n/server";
import type { NextTrip } from "@/app/(app)/dashboard/queries";

export async function NextTripBand({ trip }: { trip: NextTrip }) {
  const { t } = await getServerT();
  const locale = await getServerLocale();
  const datumLocale = locale === "en" ? "en-US" : "hu-HU";
  const fmt = new Intl.DateTimeFormat(datumLocale, { year: "numeric", month: "long", day: "numeric" });
  const idoszak = `${fmt.format(new Date(trip.startDate))} – ${fmt.format(new Date(trip.endDate))}`;
  const meta = [idoszak, trip.place].filter(Boolean).join(" · ");
  const szerep = trip.role === "organizer" ? t("dashboard.nextTripOrganizer") : t("dashboard.nextTripParticipant");

  return (
    <section data-surface="night" data-testid="dash-next-trip" className="bg-canvas text-ink">
      <div className="grid md:min-h-[320px] md:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <div className="order-1 flex flex-col justify-center gap-3 px-4 py-7 md:gap-4 md:py-12 md:pl-[max(120px,calc((100vw-1280px)/2+120px))] md:pr-12">
          <p className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-ink-muted">
            {t("dashboard.nextTrip")} · {szerep}
          </p>
          <h2 className="text-[34px] uppercase leading-[0.95] text-ink md:text-[56px]">{trip.title}</h2>
          <p className="text-[15px] text-ink-body md:text-[17px]">{meta}</p>
          <p className="flex items-baseline gap-2.5">
            {trip.days > 0 ? (
              <>
                <span className="font-mono text-[44px] font-semibold leading-none text-accent md:text-[64px]">{trip.days}</span>
                <span className="font-mono text-sm font-medium uppercase tracking-[0.06em] text-ink-muted md:text-base">
                  {t("dashboard.nextTripDays")}
                </span>
              </>
            ) : (
              <span className="font-mono text-2xl font-semibold uppercase tracking-[0.06em] text-accent md:text-[32px]">
                {trip.days === 0 ? t("dashboard.nextTripToday") : t("dashboard.nextTripRunning")}
              </span>
            )}
          </p>
          <Link
            href={trip.role === "organizer" ? `/trips/${trip.slug}/manage` : `/trips/${trip.slug}/participant`}
            data-testid="dash-next-trip-open"
            className="mt-1 inline-flex h-13 w-full items-center justify-center gap-2 bg-accent px-6 text-base font-bold text-accent-on transition-colors hover:bg-accent-hover focus-visible:outline-hidden focus-visible:shadow-(--focus-ring) md:w-fit"
          >
            {t("dashboard.nextTripOpen")}
            <Icon name="arrow-right" size={18} aria-hidden />
          </Link>
        </div>
        <div className="relative order-2 h-[180px] md:h-auto">
          {trip.cover ? (
            <Image src={trip.cover} alt="" fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" />
          ) : (
            <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-surface-raised">
              <Icon name="compass" size={64} className="opacity-30" />
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
