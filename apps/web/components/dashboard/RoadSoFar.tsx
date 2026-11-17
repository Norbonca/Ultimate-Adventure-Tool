/**
 * Az utad eddig — a /trips oldalon ma is kiszámolódik, csak eldugva mutatja.
 * Design: design/claude/D25_Nyitooldal#Ures.
 */

import { getServerT } from "@/lib/i18n/server";

export async function RoadSoFar({ stats }: { stats: { trips: number; days: number; countries: number } }) {
  const { t } = await getServerT();
  const tetelek = [
    { szam: stats.trips, cimke: t("dashboard.statTrips") },
    { szam: stats.days, cimke: t("dashboard.statDays") },
    { szam: stats.countries, cimke: t("dashboard.statCountries") },
  ];

  return (
    <section data-surface="night" data-testid="dash-stats" className="bg-canvas text-ink">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-7 md:gap-6 md:px-[120px] md:py-12">
        <h2 className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-accent">{t("dashboard.statsTitle")}</h2>
        <ul className="grid grid-cols-3 gap-5 md:gap-8">
          {tetelek.map((tetel) => (
            <li key={tetel.cimke} className="flex flex-col gap-1">
              <span className="font-mono text-[34px] font-semibold leading-none md:text-[52px]">{tetel.szam}</span>
              <span className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-ink-muted">{tetel.cimke}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
