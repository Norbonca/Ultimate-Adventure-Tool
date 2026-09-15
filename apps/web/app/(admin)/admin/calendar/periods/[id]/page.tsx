import Link from "next/link";
import { getServerT } from "@/lib/i18n/server";
import { getCalendarPeriodDetail, getCalendarReferenceData } from "../../actions";
import { PeriodEditorClient } from "../../period-editor-client";

/** M23 S6 + S7 — időszak-definíció szerkesztése és előfordulásai (`new` = új definíció). */
export default async function CalendarPeriodPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ country?: string }>;
}) {
  const { id } = await params;
  const { country } = await searchParams;
  const { t } = await getServerT();
  const isNew = id === "new";
  const [reference, detail] = await Promise.all([getCalendarReferenceData(), isNew ? Promise.resolve(null) : getCalendarPeriodDetail(id)]);

  return (
    <div className="p-8">
      <div className="flex flex-col gap-6 max-w-5xl">
        <div>
          <Link href="/admin/calendar" className="text-sm text-slate-500 hover:text-emerald-600">
            ← {t("admin.calendar.actions.back")}
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 mt-2">
            {isNew ? t("admin.calendar.editor.titleNew") : t("admin.calendar.editor.titleEdit")}
          </h1>
        </div>
        {!isNew && !detail ? (
          <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-6">{t("admin.calendar.editor.notFound")}</p>
        ) : (
          <PeriodEditorClient
            countries={reference.countries}
            tags={reference.tags}
            period={detail?.period ?? null}
            occurrences={detail?.occurrences ?? []}
            defaultCountry={country && /^[A-Z]{2}$/.test(country) ? country : "HU"}
          />
        )}
      </div>
    </div>
  );
}
