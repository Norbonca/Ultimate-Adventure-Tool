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
import { getServerT, getServerLocale } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";

interface ParticipantPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ParticipantDashboardPage({ params }: ParticipantPageProps) {
  const { slug } = await params;
  const trip = await fetchTripBySlug(slug);
  if (!trip) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { t } = await getServerT();
  const locale = await getServerLocale();
  const dateLocale = locale === "en" ? "en-US" : "hu-HU";

  const [participants, crewPositions, itinerary] = await Promise.all([
    fetchTripParticipants(trip.id),
    fetchCrewPositions(trip.id),
    fetchTripItinerary(trip.id),
  ]);

  // Find current user's participation
  const myParticipation = participants.find((p) => p.user_id === user.id);
  const isOrganizer = user.id === trip.organizer_id;

  // If not a participant and not organizer, redirect to trip detail
  if (!myParticipation && !isOrganizer) {
    redirect(`/trips/${slug}`);
  }

  const catRaw = trip.categories;
  const category = (Array.isArray(catRaw) ? catRaw[0] : catRaw) as {
    name: string; name_localized: Record<string, string>; color_hex: string;
  } | null;
  const catDisplay = category ? CATEGORY_DISPLAY[category.name] : null;
  const categoryName = category
    ? (category.name_localized as Record<string, string>)?.[locale] || category.name
    : "";

  const orgRaw = trip.profiles;
  const organizer = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as {
    display_name: string | null; avatar_url: string | null;
  } | null;

  const approvedParticipants = participants.filter(
    (p) => ["approved", "approved_pending_payment", "participant"].includes(p.status)
  );

  // Status config for participant's own status
  const myStatus = myParticipation?.status || (isOrganizer ? "organizer" : "none");
  const statusLabels: Record<string, { label: string; bg: string; text: string }> = {
    pending: { label: t("trips.participantStatus.pending"), bg: "bg-amber-50", text: "text-amber-700" },
    approved: { label: t("trips.participantStatus.approved"), bg: "bg-green-50", text: "text-green-700" },
    approved_pending_payment: { label: t("trips.participant.awaitingPayment"), bg: "bg-blue-50", text: "text-blue-700" },
    participant: { label: t("trips.participantStatus.participant"), bg: "bg-trevu-50", text: "text-trevu-700" },
    rejected: { label: t("trips.participantStatus.rejected"), bg: "bg-red-50", text: "text-red-600" },
    waitlisted: { label: t("trips.participantStatus.waitlisted"), bg: "bg-navy-50", text: "text-navy-500" },
    organizer: { label: t("trips.detail.organizer"), bg: "bg-trevu-50", text: "text-trevu-700" },
    none: { label: "—", bg: "bg-navy-50", text: "text-navy-400" },
  };
  const mySc = statusLabels[myStatus] || statusLabels.none;

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader
       
        user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }}
      />

      {/* Trip Banner */}
      <div className="bg-white border-b border-navy-200 px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-navy-400 mb-2">
            <Link href="/trips" className="hover:text-trevu-600">← {t("trips.myTripsTitle")}</Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-navy-900">{trip.title}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-navy-500">
                {catDisplay && (
                  <span className="flex items-center gap-1 bg-navy-50 px-2 py-0.5 rounded-lg text-xs font-medium">
                    {catDisplay.emoji} {categoryName}
                  </span>
                )}
                {trip.start_date && (
                  <span>
                    {new Date(trip.start_date).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}
                    {trip.end_date && ` – ${new Date(trip.end_date).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" })}`}
                  </span>
                )}
                <span>{[trip.location_city, trip.location_country].filter(Boolean).join(", ")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left Column ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Action Items */}
            {myParticipation && (
              <div className="bg-white rounded-2xl border border-navy-200 p-6">
                <h2 className="text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
                  {t("trips.participant.actionItems")}
                  {myParticipation.status === "approved_pending_payment" && (
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">1</span>
                  )}
                </h2>
                <div className="space-y-3">
                  {/* Payment action */}
                  {myParticipation.status === "approved_pending_payment" && (
                    <div className="flex items-center justify-between bg-amber-50 rounded-xl p-4">
                      <div>
                        <span className="text-sm font-semibold text-navy-800">
                          {t("trips.participant.payBalance")}
                        </span>
                        <p className="text-xs text-navy-500 mt-0.5">
                          {trip.price_currency} {Number(trip.price_amount || 0).toLocaleString(dateLocale)}
                        </p>
                      </div>
                      <button className="px-4 py-2 text-sm font-semibold text-white bg-trevu-600 rounded-lg hover:bg-trevu-700">
                        {t("trips.participant.payNow")}
                      </button>
                    </div>
                  )}

                  {/* Experience form action */}
                  <div className="flex items-center justify-between bg-navy-50 rounded-xl p-4">
                    <div>
                      <span className="text-sm font-semibold text-navy-800">
                        {t("trips.participant.submitExperienceForm")}
                      </span>
                      <p className="text-xs text-navy-500 mt-0.5">
                        {t("trips.participant.submitExperienceFormDesc")}
                      </p>
                    </div>
                    <button className="px-4 py-2 text-sm font-semibold text-trevu-600 bg-white border border-trevu-200 rounded-lg hover:bg-trevu-50">
                      {t("trips.participant.fillForm")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Trip Timeline / Itinerary */}
            <div className="bg-white rounded-2xl border border-navy-200 p-6">
              <h2 className="text-lg font-bold text-navy-900 mb-4">{t("trips.manage.timeline")}</h2>
              {itinerary.length > 0 ? (
                <div className="space-y-4">
                  {itinerary.map((day) => (
                    <div key={day.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-trevu-100 text-trevu-700 flex items-center justify-center text-xs font-bold">
                          {day.day_number}
                        </div>
                        {day.day_number < itinerary.length && (
                          <div className="w-0.5 flex-1 bg-navy-100 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <h3 className="text-sm font-semibold text-navy-900">
                          {day.title || `${t("trips.manage.day")} ${day.day_number}`}
                        </h3>
                        {day.description && (
                          <p className="text-sm text-navy-500 mt-1">{day.description}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-navy-400">
                          {day.distance_km && <span>📏 {day.distance_km} km</span>}
                          {day.elevation_gain_m && <span>⛰️ +{day.elevation_gain_m} m</span>}
                          {day.estimated_hours && <span>⏱️ {day.estimated_hours}h</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-navy-400">{t("trips.participant.noItinerary")}</p>
              )}
            </div>
          </div>

          {/* ── Right Sidebar ── */}
          <div className="space-y-4">
            {/* Trip Details Card */}
            <div className="bg-white rounded-2xl border border-navy-200 p-5 space-y-3">
              <h3 className="text-sm font-bold text-navy-900">{t("trips.detail.details")}</h3>
              <div className="flex justify-between text-sm">
                <span className="text-navy-500">{t("trips.participant.yourCost")}</span>
                <span className="font-bold text-navy-900">
                  {trip.price_amount
                    ? `€${Number(trip.price_amount).toLocaleString(dateLocale)}`
                    : t("trips.detail.free")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-navy-500">{t("trips.participant.paid")}</span>
                <span className="font-medium text-navy-700">
                  {myParticipation?.paid_at
                    ? `€${Number(trip.price_amount || 0).toLocaleString(dateLocale)}`
                    : "€0"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-navy-500">{t("trips.participant.remaining")}</span>
                <span className={`font-bold ${
                  myParticipation?.paid_at ? "text-green-600" : "text-red-500"
                }`}>
                  {myParticipation?.paid_at
                    ? "€0"
                    : `-€${Number(trip.price_amount || 0).toLocaleString(dateLocale)}`}
                </span>
              </div>
            </div>

            {/* Crew Card */}
            <div className="bg-white rounded-2xl border border-navy-200 p-5 space-y-3">
              <h3 className="text-sm font-bold text-navy-900">
                {t("trips.manage.crewMembers")} ({approvedParticipants.length}/{trip.max_participants})
              </h3>
              <div className="space-y-2">
                {/* Organizer */}
                {organizer && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-trevu-600 text-white flex items-center justify-center text-xs font-bold">
                      {(organizer.display_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-navy-800">{organizer.display_name}</span>
                    <span className="text-xs text-navy-400">{t("trips.detail.organizer")}</span>
                  </div>
                )}

                {/* Participants */}
                {approvedParticipants.slice(0, 6).map((p) => {
                  const profile = (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) as {
                    display_name: string | null;
                  } | null;
                  const crew = (Array.isArray(p.trip_crew_positions) ? p.trip_crew_positions[0] : p.trip_crew_positions) as {
                    role_name: string;
                  } | null;
                  const isMe = p.user_id === user.id;

                  return (
                    <div key={p.id} className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full ${isMe ? "bg-trevu-500" : "bg-navy-300"} text-white flex items-center justify-center text-xs font-bold`}>
                        {(profile?.display_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className={`text-sm ${isMe ? "font-semibold text-trevu-700" : "text-navy-600"}`}>
                        {isMe ? t("trips.participant.you") : profile?.display_name || "—"}
                      </span>
                      {crew && <span className="text-xs text-navy-400">{crew.role_name}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
