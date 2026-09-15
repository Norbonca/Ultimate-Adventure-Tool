import { getServerT } from "@/lib/i18n/server";
import { getCalendarAdminOverview } from "./actions";
import { CalendarAdminClient } from "./calendar-admin-client";

/** M23 S5 + S8 — naptár ország és év szerint; címkekatalógus (`?tab=tags`). */
export default async function CalendarAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; year?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const { t } = await getServerT();
  const overview = await getCalendarAdminOverview({
    scope: params.country,
    year: params.year ? Number(params.year) : undefined,
  });

  return (
    <div className="p-8">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t("admin.calendar.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("admin.calendar.subtitle")}</p>
        </div>
        <CalendarAdminClient overview={overview} initialTab={params.tab === "tags" ? "tags" : "periods"} />
      </div>
    </div>
  );
}
