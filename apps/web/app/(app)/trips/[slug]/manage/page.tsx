import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  fetchTripBySlug,
  fetchTripParticipants,
  fetchCrewPositions,
  fetchTripItinerary,
} from "../../actions";
import { CATEGORY_DISPLAY } from "@/lib/categories";
// TranslationKey removed — timeline is now dynamic
import { getServerT, getServerLocale } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { BackButton } from "@/components/BackButton";
import { TripTimelineClient } from "@/components/TripTimelineClient";

interface ManagePageProps {
  params: Promise<{ slug: string }>;
}

export default async function TripManagePage({ params }: ManagePageProps) {
  const { slug } = await params;
  const trip = await fetchTripBySlug(slug);
  if (!trip) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== trip.organizer_id) redirect(`/trips/${slug}`);

  const { t } = await getServerT();
  const locale = await getServerLocale();
  const dateLocale = locale === "en" ? "en-US" : "hu-HU";

  const [participants, crewPositions, itinerary] = await Promise.all([
    fetchTripParticipants(trip.id),
    fetchCrewPositions(trip.id),
    fetchTripItinerary(trip.id),
  ]);

  const catRaw = trip.categories;
  const category = (Array.isArray(catRaw) ? catRaw[0] : catRaw) as {
    name: string; name_localized: Record<string, string>; color_hex: string;
  } | null;
  const catDisplay = category ? CATEGORY_DISPLAY[category.name] : null;

  const approvedCount = participants.filter(
    (p) => ["approved", "approved_pending_payment", "participant"].includes(p.status)
  ).length;
  const pendingCount = participants.filter((p) => p.status === "pending").length;
  const openSpots = trip.max_participants - approvedCount;

  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    draft: { label: t("trips.status.draft"), bg: "bg-navy-100", text: "text-navy-600" },
    published: { label: t("trips.status.published"), bg: "bg-blue-50", text: "text-blue-700" },
    registration_open: { label: t("trips.status.registrationOpen"), bg: "bg-green-50", text: "text-green-700" },
    active: { label: t("trips.status.active"), bg: "bg-trevu-50", text: "text-trevu-700" },
    completed: { label: t("trips.status.completed"), bg: "bg-navy-100", text: "text-navy-500" },
    cancelled: { label: t("trips.status.cancelled"), bg: "bg-red-50", text: "text-red-600" },
  };
  const sc = statusConfig[trip.status] || statusConfig.draft;

  const revenue = trip.price_amount ? approvedCount * Number(trip.price_amount) : 0;
  // TODO: M03 Expense integration — for now expenses are 0
  const expenses = 0;
  const netProfit = revenue - expenses;

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <AppHeader
       
        user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }}
      />

      <BackButton fallback={`/trips/${slug}`} label={t('common.back')} />

      <div className="max-w-7xl mx-auto flex">
        {/* ── Sidebar ── */}
        <aside className="w-72 border-r border-navy-200 bg-white min-h-[calc(100vh-64px)] p-5 space-y-6">
          {/* Status Badge */}
          <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
            {sc.label}
          </span>

          {/* Trip Name + Meta */}
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-navy-900 leading-tight">
              {trip.title}
            </h2>
            <div className="text-sm text-navy-500 space-y-1">
              {trip.start_date && (
                <p>
                  {new Date(trip.start_date).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}
                  {trip.end_date && ` – ${new Date(trip.end_date).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" })}`}
                </p>
              )}
              <p>{[trip.location_city, trip.location_country].filter(Boolean).join(", ")}</p>
            </div>
          </div>

          {/* Crew Progress */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-navy-700">{t("trips.manage.crewProgress")}</h3>
            <div className="w-full h-2.5 rounded-full bg-navy-100">
              <div
                className="h-2.5 rounded-full bg-trevu-500 transition-all"
                style={{ width: `${Math.min(100, (approvedCount / trip.max_participants) * 100)}%` }}
              />
            </div>
            <p className="text-sm text-navy-500">
              {openSpots}/{trip.max_participants} {t("trips.manage.openSpots")}
            </p>
            {pendingCount > 0 && (
              <p className="text-xs text-amber-600 font-medium">
                {pendingCount} {t("trips.manage.pendingApproval")}
              </p>
            )}
          </div>

          {/* Crew Members */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-navy-700">{t("trips.manage.crewMembers")}</h3>
            <div className="space-y-2.5">
              {participants
                .filter((p) => ["approved", "participant"].includes(p.status))
                .slice(0, 8)
                .map((p) => {
                  const profile = (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) as {
                    display_name: string | null; avatar_url: string | null;
                  } | null;
                  const crew = (Array.isArray(p.trip_crew_positions) ? p.trip_crew_positions[0] : p.trip_crew_positions) as {
                    role_name: string;
                  } | null;
                  const isOrganizer = p.user_id === trip.organizer_id;

                  return (
                    <div key={p.id} className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-trevu-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {(profile?.display_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-navy-800 truncate block">
                          {profile?.display_name || "—"}
                        </span>
                        <span className="text-xs text-navy-400">
                          {isOrganizer
                            ? t("trips.detail.organizer")
                            : crew?.role_name || t("trips.participantStatus.participant")}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-2 pt-2 border-t border-navy-100">
            <Link
              href={`/trips/${slug}/edit`}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-white bg-trevu-600 rounded-xl hover:bg-trevu-700 transition-colors"
            >
              ✏️ {t("trips.manage.editTrip")}
            </Link>
            <button
              onClick={undefined}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-navy-600 bg-white border border-navy-200 rounded-xl hover:bg-navy-50 transition-colors"
            >
              🔗 {t("trips.manage.shareLink")}
            </button>
            <Link
              href={`/trips/${slug}`}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-navy-600 bg-white border border-navy-200 rounded-xl hover:bg-navy-50 transition-colors"
            >
              👁️ {t("trips.manage.viewPublic")}
            </Link>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <div className="flex-1 p-8 space-y-8">
          {/* ── M021 Trip Timeline ── */}
          <TripTimelineClient tripId={trip.id} isOrganizer={true} />

          {/* Crew Positions */}
          {crewPositions.length > 0 && (
            <div className="bg-white rounded-2xl border border-navy-200 p-6">
              <h2 className="text-lg font-bold text-navy-900 mb-4">{t("trips.manage.crewPositions")}</h2>
              <div className="space-y-3">
                {crewPositions.map((pos) => (
                  <div key={pos.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-navy-800 bg-trevu-50 px-3 py-1 rounded-lg">
                        {pos.role_name}
                      </span>
                      <span className="text-xs text-navy-400 capitalize">
                        {pos.required_skill_level}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-navy-100">
                        <div
                          className="h-2 rounded-full bg-trevu-500"
                          style={{ width: `${Math.min(100, ((pos.filled_spots || 0) / pos.spots) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-navy-500">
                        {pos.filled_spots || 0}/{pos.spots}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-navy-200 p-6">
            <h2 className="text-lg font-bold text-navy-900 mb-4">{t("trips.manage.quickActions")}</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={`/trips/${slug}/edit`}
                className="flex items-center gap-3 p-4 rounded-xl border border-navy-200 hover:border-trevu-300 hover:bg-trevu-50/50 transition-all"
              >
                <span className="text-lg">✏️</span>
                <span className="text-sm font-medium text-navy-700">{t("trips.manage.editTrip")}</span>
              </Link>
              <Link
                href={`/trips/${slug}`}
                className="flex items-center gap-3 p-4 rounded-xl border border-navy-200 hover:border-trevu-300 hover:bg-trevu-50/50 transition-all"
              >
                <span className="text-lg">👁️</span>
                <span className="text-sm font-medium text-navy-700">{t("trips.manage.viewPublic")}</span>
              </Link>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white rounded-2xl border border-navy-200 p-6">
            <h2 className="text-lg font-bold text-navy-900 mb-4">{t("trips.manage.financialSummary")}</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-navy-50 rounded-xl p-4">
                <span className="text-xs text-navy-400 block mb-1">{t("trips.manage.totalRevenue")}</span>
                <span className="text-xl font-bold text-navy-900">
                  €{revenue.toLocaleString(dateLocale)}
                </span>
              </div>
              <div className="bg-navy-50 rounded-xl p-4">
                <span className="text-xs text-navy-400 block mb-1">{t("trips.manage.expenses")}</span>
                <span className="text-xl font-bold text-navy-900">
                  €{expenses.toLocaleString(dateLocale)}
                </span>
              </div>
              <div className="bg-navy-50 rounded-xl p-4">
                <span className="text-xs text-navy-400 block mb-1">{t("trips.manage.netProfit")}</span>
                <span className="text-xl font-bold text-green-600">
                  €{netProfit.toLocaleString(dateLocale)}
                </span>
              </div>
            </div>
          </div>

          {/* Pending Applications */}
          {pendingCount > 0 && (
            <div className="bg-white rounded-2xl border border-amber-200 p-6">
              <h2 className="text-lg font-bold text-navy-900 mb-4">
                {t("trips.manage.pendingApplications")} ({pendingCount})
              </h2>
              <div className="space-y-3">
                {participants
                  .filter((p) => p.status === "pending")
                  .map((p) => {
                    const profile = (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) as {
                      display_name: string | null;
                    } | null;
                    const hasMessage = !!p.application_text;
                    return (
                      <div key={p.id} className="flex items-start justify-between bg-amber-50 rounded-xl p-4 gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-navy-800">
                              {profile?.display_name || "—"}
                            </span>
                            {hasMessage && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-trevu-700 bg-trevu-100 px-1.5 py-0.5 rounded-full"
                                title={t("trips.manage.hasApplicationMessage")}
                              >
                                💬 {t("trips.manage.hasMessageBadge")}
                              </span>
                            )}
                          </div>
                          {hasMessage && (
                            <p className="text-xs text-navy-600 mt-2 bg-white/60 rounded-lg px-2.5 py-2 whitespace-pre-wrap leading-relaxed">
                              {p.application_text}
                            </p>
                          )}
                          <span className="text-xs text-navy-400 block mt-1">
                            {p.applied_at && new Date(p.applied_at).toLocaleDateString(dateLocale)}
                          </span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button className="px-3 py-1.5 text-xs font-semibold text-white bg-trevu-600 rounded-lg hover:bg-trevu-700">
                            {t("trips.manage.approve")}
                          </button>
                          <button className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                            {t("trips.manage.reject")}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
