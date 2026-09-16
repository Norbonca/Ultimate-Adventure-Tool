"use client";

// Design: D02 `v54yy` — D „Túráim: törölt túra visszaállítása” (BR-M02-009, 30 napos visszaállítás).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Icon } from "@/components/Icon";
import { restoreTrip, type DeletedTrip } from "@/app/(app)/trips/deletion-actions";

export function DeletedTripsList({ trips }: { trips: DeletedTrip[] }) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (trips.length === 0) return null;
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "hu-HU", { year: "numeric", month: "short", day: "numeric" });

  const restore = async (id: string) => {
    setPending(id);
    setError(null);
    const res = await restoreTrip(id);
    setPending(null);
    if (!res.ok) setError(res.error ?? t("trips.deletion.restoreFailed"));
    else router.refresh();
  };

  return (
    <section className="bg-white border border-navy-200 rounded-2xl p-5 mt-6" aria-labelledby="deleted-trips-title">
      <h2 id="deleted-trips-title" className="text-base font-semibold text-navy-900 mb-3">
        {t("trips.deletion.deletedSectionTitle")}
      </h2>
      <ul className="space-y-2.5">
        {trips.map((trip) => (
          <li key={trip.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-navy-200 px-4 py-3.5">
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-navy-900 truncate">{trip.title}</p>
              <p className="text-[13px] text-navy-500 mt-0.5">
                {t("trips.deletion.deletedMeta", {
                  deleted: fmt.format(new Date(trip.deleted_at)),
                  until: fmt.format(new Date(trip.restorable_until)),
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => restore(trip.id)}
              disabled={pending !== null}
              className="inline-flex items-center justify-center gap-2 rounded-trevu border border-trevu-600 px-4 py-2.5 text-sm font-semibold text-trevu-700 hover:bg-trevu-50 transition-colors disabled:opacity-50"
            >
              <Icon name="refresh-cw" size={16} />
              <span>{t("trips.deletion.restore")}</span>
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="text-sm text-red-600 mt-3">{error}</p>}
    </section>
  );
}
