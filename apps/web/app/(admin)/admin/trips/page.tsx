import { getServerT } from "@/lib/i18n/server";
import { getAdminTrips } from "../actions";
import { AdminTripsClient } from "./trips-client";

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}

export default async function AdminTripsPage({ searchParams }: PageProps) {
  const { t, locale } = await getServerT();
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const search = params.search ?? "";
  const status = params.status ?? "all";

  const { trips, total, stats } = await getAdminTrips({ page, search, status });

  const totalPages = Math.ceil(total / 25);

  const tabLabels = [
    { key: "all", label: t("admin.trips.allTrips"), count: total },
    { key: "draft", label: t("admin.trips.pendingReview"), count: stats.draft ?? 0 },
    { key: "flagged", label: t("admin.trips.flagged"), count: stats.flagged ?? 0 },
    { key: "published", label: t("admin.trips.activeNow"), count: stats.published ?? 0 },
  ];

  const statCards = [
    { label: t("admin.trips.active"), value: stats.published ?? 0, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
    { label: t("admin.trips.available"), value: (stats.published ?? 0) + (stats.draft ?? 0), color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
    { label: t("admin.trips.completed"), value: stats.completed ?? 0, color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
    { label: t("admin.trips.cancelled"), value: stats.cancelled ?? 0, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  ];

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t("admin.trips.title")}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {t("admin.trips.subtitle")}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.bg}`}>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      <AdminTripsClient
        trips={trips}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        status={status}
        locale={locale}
        tabLabels={tabLabels}
        t_search_placeholder={t("admin.trips.searchPlaceholder")}
        t_col_trip={t("admin.trips.colTrip")}
        t_col_organizer={t("admin.trips.colOrganizer")}
        t_col_category={t("admin.trips.colCategory")}
        t_col_difficulty={t("admin.trips.colDifficulty")}
        t_col_status={t("admin.trips.colStatus")}
        t_col_dates={t("admin.trips.colDates")}
        t_col_participants={t("admin.trips.colParticipants")}
        t_view_trip={t("admin.trips.viewTrip")}
        t_approve={t("admin.trips.approveTrip")}
        t_flag={t("admin.trips.flagTrip")}
        t_cancel={t("admin.trips.cancelTrip")}
        t_status_active={t("admin.trips.statusActive")}
        t_status_draft={t("admin.trips.statusDraft")}
        t_status_published={t("admin.trips.statusPublished")}
        t_status_cancelled={t("admin.trips.statusCancelled")}
        t_status_completed={t("admin.trips.statusCompleted")}
        t_showing_of={t("admin.trips.showingOf")}
        t_no_results={t("admin.noResults")}
      />
    </div>
  );
}
