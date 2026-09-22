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
import { Icon } from "@/components/Icon";

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

  const [participants, _crewPositions, itinerary] = await Promise.all([
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

  return (
    <main className="min-h-[100dvh] bg-canvas text-ink">
      <AppHeader
       
        user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }}
      />

      {/* Trip Banner */}
      <div className="border-b border-line bg-surface px-5 py-6 sm:px-8 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-2 flex items-center gap-2 text-sm text-ink-muted">
            <Link href="/trips" className="inline-flex items-center gap-2 hover:text-accent"><Icon name="arrow-left" size={14} /> {t("trips.myTripsTitle")}</Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-4xl font-extrabold leading-none text-ink">{trip.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-ink-muted">
                {catDisplay && (
                  <span className="flex items-center gap-1 border border-line bg-canvas px-2 py-1 text-xs font-medium">
                    <Icon name={catDisplay.icon} size={13} /> {categoryName}
                  </span>
                )}
                {trip.start_date && (
                  <span>
                    {new Date(trip.start_date).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}
                    {trip.end_date && ` - ${new Date(trip.end_date).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" })}`}
                  </span>
                )}
                <span>{[trip.location_city, trip.location_country].filter(Boolean).join(", ")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left Column ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Action Items */}
            {myParticipation && (
              <div className="border border-line bg-surface p-6">
                <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-extrabold text-ink">
                  {t("trips.participant.actionItems")}
                  {myParticipation.status === "approved_pending_payment" && (
                    <span className="flex h-5 w-5 items-center justify-center bg-[var(--color-danger)] text-xs font-bold text-surface">1</span>
                  )}
                </h2>
                <div className="space-y-3">
                  {/* Payment action */}
                  {myParticipation.status === "approved_pending_payment" && (
                    <div className="flex items-center justify-between bg-[var(--color-warning-subtle)] p-4">
                      <div>
                        <span className="text-sm font-semibold text-ink">
                          {t("trips.participant.payBalance")}
                        </span>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {trip.price_currency} {Number(trip.price_amount || 0).toLocaleString(dateLocale)}
                        </p>
                      </div>
                      <button className="bg-accent px-4 py-2 text-sm font-bold text-accent-on hover:bg-accent-hover">
                        {t("trips.participant.payNow")}
                      </button>
                    </div>
                  )}

                  {/* Experience form action */}
                  <div className="flex items-center justify-between bg-canvas p-4">
                    <div>
                      <span className="text-sm font-semibold text-ink">
                        {t("trips.participant.submitExperienceForm")}
                      </span>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {t("trips.participant.submitExperienceFormDesc")}
                      </p>
                    </div>
                    <button className="border border-line-strong bg-surface px-4 py-2 text-sm font-bold text-ink hover:border-accent hover:text-accent">
                      {t("trips.participant.fillForm")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Trip Timeline / Itinerary */}
            <div className="border border-line bg-surface p-6">
              <h2 className="mb-4 font-display text-2xl font-extrabold text-ink">{t("trips.manage.timeline")}</h2>
              {itinerary.length > 0 ? (
                <div className="space-y-4">
                  {itinerary.map((day) => (
                    <div key={day.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center bg-[var(--color-primary-subtle)] text-xs font-bold text-accent">
                          {day.day_number}
                        </div>
                        {day.day_number < itinerary.length && (
                          <div className="mt-1 w-0.5 flex-1 bg-line" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <h3 className="text-sm font-semibold text-ink">
                          {day.title || `${t("trips.manage.day")} ${day.day_number}`}
                        </h3>
                        {day.description && (
                          <p className="mt-1 text-sm text-ink-muted">{day.description}</p>
                        )}
                        <div className="mt-2 flex gap-4 text-xs text-ink-muted">
                          {day.distance_km && <span className="inline-flex items-center gap-1"><Icon name="ruler" size={12} /> {day.distance_km} km</span>}
                          {day.elevation_gain_m && <span className="inline-flex items-center gap-1"><Icon name="mountain-snow" size={12} /> +{day.elevation_gain_m} m</span>}
                          {day.estimated_hours && <span className="inline-flex items-center gap-1"><Icon name="clock" size={12} /> {day.estimated_hours}h</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-muted">{t("trips.participant.noItinerary")}</p>
              )}
            </div>
          </div>

          {/* ── Right Sidebar ── */}
          <div className="space-y-4">
            {/* Trip Details Card */}
            <div className="space-y-3 border border-line bg-surface p-5">
              <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-ink">{t("trips.detail.details")}</h3>
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">{t("trips.participant.yourCost")}</span>
                <span className="font-bold text-ink">
                  {trip.price_amount
                    ? `€${Number(trip.price_amount).toLocaleString(dateLocale)}`
                    : t("trips.detail.free")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">{t("trips.participant.paid")}</span>
                <span className="font-medium text-ink">
                  {myParticipation?.paid_at
                    ? `€${Number(trip.price_amount || 0).toLocaleString(dateLocale)}`
                    : "€0"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">{t("trips.participant.remaining")}</span>
                <span className={`font-bold ${
                  myParticipation?.paid_at ? "text-[var(--color-success-text)]" : "text-[var(--color-danger)]"
                }`}>
                  {myParticipation?.paid_at
                    ? "€0"
                    : `-€${Number(trip.price_amount || 0).toLocaleString(dateLocale)}`}
                </span>
              </div>
            </div>

            {/* Crew Card */}
            <div className="space-y-3 border border-line bg-surface p-5">
              <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-ink">
                {t("trips.manage.crewMembers")} ({approvedParticipants.length}/{trip.max_participants})
              </h3>
              <div className="space-y-2">
                {/* Organizer */}
                {organizer && (
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-on">
                      {(organizer.display_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-ink">{organizer.display_name}</span>
                    <span className="text-xs text-ink-muted">{t("trips.detail.organizer")}</span>
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
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full ${isMe ? "bg-accent" : "bg-line-strong"} text-xs font-bold text-surface`}>
                        {(profile?.display_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className={`text-sm ${isMe ? "font-semibold text-accent" : "text-ink-muted"}`}>
                        {isMe ? t("trips.participant.you") : profile?.display_name || "-"}
                      </span>
                      {crew && <span className="text-xs text-ink-muted">{crew.role_name}</span>}
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
