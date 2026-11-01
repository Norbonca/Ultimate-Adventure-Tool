"use client";

/**
 * M024 — „Időpontok” szakasz a túraoldalon (BR-M024-007) és a szervező időpont-kezelése (BR-M024-006/008).
 *
 * Terv: design/D02_Trip_Management.pen#Np8RX (`cUwtJ`, 1440), #dxA73 (`YBqkH`, 390), szervezői nézet #vcfZO.
 * Látogató: a sorozat nyilvános, jövőbeli időpontjai, a megnyitott „Ezt nézed” jelöléssel; minden sor a saját
 * túrájára visz. Szervező: minden időpont (piszkozat is) jelentkezőszámmal, „Új időpont” és „Leválasztás”.
 * Mobilon az első 3 sor látszik, a többi „N időpont” gombbal nyílik.
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { detachFromSeries } from "@/app/(app)/trips/series-actions";
import { AddSeriesDateDialog } from "./AddSeriesDateDialog";

export interface SeriesDateRow {
  id: string;
  slug: string;
  dateLabel: string;
  priceLabel: string;
  spotsLeft: number;
  /** Jelentkezési határidő lejárt vagy a túra nem fogad jelentkezést. */
  closed: boolean;
  isDraft: boolean;
  /** Szervezői nézet: aktív jelentkezők száma. */
  applicants?: number;
}

interface SeriesDatesSectionProps {
  rows: SeriesDateRow[];
  currentTripId: string;
  isOrganizer: boolean;
  /** Szervező: a túra címe és alapértékek az „Új időpont” űrlaphoz. */
  organizer?: {
    tripId: string;
    title: string;
    currency: string;
    defaultMaxParticipants: number;
    defaultPrice: number | null;
    durationDays: number | null;
    canDetach: boolean;
  } | null;
}

const MOBILE_ROWS = 3;

export function SeriesDatesSection({ rows, currentTripId, isOrganizer, organizer }: SeriesDatesSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [detachId, setDetachId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const confirmDetach = () => {
    if (!detachId) return;
    setError(null);
    startTransition(async () => {
      const res = await detachFromSeries(detachId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDetachId(null);
      router.refresh();
    });
  };

  const status = (row: SeriesDateRow) => {
    if (isOrganizer) {
      const base = t("series.orgRowStatus", { applicants: row.applicants ?? 0, spots: row.spotsLeft });
      return row.isDraft ? `${t("series.draft")} · ${base}` : base;
    }
    if (row.closed) return t("series.closed");
    return row.spotsLeft > 0 ? t("series.spots", { count: row.spotsLeft }) : t("series.full");
  };

  return (
    <section id="idopontok" className="scroll-mt-24 bg-white rounded-2xl border border-navy-200 p-6" data-testid="trip-series-dates">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
            <Icon name="calendar-days" size={20} className="text-trevu-700" />
            {t("series.datesTitle")}
          </h2>
          <p className="mt-1 text-sm text-navy-500">{isOrganizer ? t("series.orgSubtitle") : t("series.datesSubtitle")}</p>
        </div>
        {isOrganizer && organizer && (
          <Button variant="outline" icon="calendar-plus" onClick={() => setAddOpen(true)} data-testid="series-add-date">
            {t("series.addDate")}
          </Button>
        )}
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {rows.map((row, index) => {
          const current = row.id === currentTripId;
          const full = !isOrganizer && row.spotsLeft <= 0;
          const muted = !isOrganizer && (row.closed || full);
          return (
            <li key={row.id} className={!showAll && index >= MOBILE_ROWS ? "hidden md:block" : undefined}>
              <div
                className={[
                  "flex min-h-14 items-center gap-3 rounded-xl border px-4 py-2",
                  current ? "border-trevu-300 bg-trevu-50" : "border-navy-200 bg-white",
                ].join(" ")}
                data-testid="series-date-row"
                data-current={current ? "true" : undefined}
              >
                <Link
                  href={`/trips/${row.slug}`}
                  aria-current={current ? "page" : undefined}
                  className="flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-lg sm:flex-row sm:items-center sm:justify-start sm:gap-4 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <span className={`text-[15px] font-bold ${muted ? "text-navy-400 line-through" : "text-navy-900"}`}>{row.dateLabel}</span>
                  <span className={`text-sm ${full && !row.closed ? "font-semibold text-[var(--color-danger)]" : "text-navy-500"}`}>{status(row)}</span>
                </Link>
                {current && (
                  <span className="shrink-0 rounded-chip bg-trevu-600 px-2.5 py-1 text-xs font-semibold text-white">{t("series.viewing")}</span>
                )}
                <span className="hidden shrink-0 text-sm font-semibold text-navy-700 sm:inline">{row.priceLabel}</span>
                {isOrganizer && organizer?.canDetach && (
                  <button
                    type="button"
                    onClick={() => setDetachId(row.id)}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm text-navy-500 hover:bg-navy-50 hover:text-navy-800"
                    data-testid="series-detach"
                  >
                    <Icon name="unlink" size={16} />
                    <span className="hidden sm:inline">{t("series.detach")}</span>
                    <span className="sr-only sm:hidden">{`${t("series.detach")} — ${row.dateLabel}`}</span>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {rows.length > MOBILE_ROWS && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-trevu-700 md:hidden"
        >
          {t("series.dateCount", { count: rows.length })}
          <Icon name="chevron-right" size={14} />
        </button>
      )}

      {error && <p role="alert" className="mt-3 text-sm text-[var(--color-danger)]">{error}</p>}

      {isOrganizer && organizer && (
        <AddSeriesDateDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          tripId={organizer.tripId}
          title={organizer.title}
          currency={organizer.currency}
          defaultMaxParticipants={organizer.defaultMaxParticipants}
          defaultPrice={organizer.defaultPrice}
          durationDays={organizer.durationDays}
        />
      )}

      <Dialog
        open={detachId !== null}
        onClose={() => setDetachId(null)}
        busy={isPending}
        icon="unlink"
        tone="warning"
        title={t("series.detach")}
        description={t("series.detachConfirm")}
        actions={
          <>
            <Button variant="primary" icon="unlink" loading={isPending} onClick={confirmDetach} data-testid="series-detach-confirm">
              {t("series.detach")}
            </Button>
            <Button variant="outline" onClick={() => setDetachId(null)} disabled={isPending}>
              {t("common.cancel")}
            </Button>
          </>
        }
      />
    </section>
  );
}
