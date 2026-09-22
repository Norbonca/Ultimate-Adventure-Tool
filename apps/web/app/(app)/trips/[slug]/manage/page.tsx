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
import { Icon } from "@/components/Icon";
import { ApplicationsManager, type ParticipantRow } from "@/components/trip-forms/ApplicationsManager";

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

  const [participants, crewPositions, _itinerary] = await Promise.all([
    fetchTripParticipants(trip.id),
    fetchCrewPositions(trip.id),
    fetchTripItinerary(trip.id),
  ]);

  const catRaw = trip.categories;
  const category = (Array.isArray(catRaw) ? catRaw[0] : catRaw) as {
    name: string; name_localized: Record<string, string>; color_hex: string;
  } | null;
  const _catDisplay = category ? CATEGORY_DISPLAY[category.name] : null;

  const approvedCount = participants.filter(
    (p) => ["approved", "approved_pending_payment", "participant"].includes(p.status)
  ).length;
  const pendingCount = participants.filter((p) => p.status === "pending").length;
  const openSpots = trip.max_participants - approvedCount;

  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    draft: { label: t("trips.status.draft"), bg: "bg-line", text: "text-ink-muted" },
    published: { label: t("trips.status.published"), bg: "bg-blue-50", text: "text-blue-700" },
    registration_open: { label: t("trips.status.registrationOpen"), bg: "bg-green-50", text: "text-green-700" },
    active: { label: t("trips.status.active"), bg: "bg-[var(--color-primary-subtle)]", text: "text-accent" },
    completed: { label: t("trips.status.completed"), bg: "bg-line", text: "text-ink-muted" },
    cancelled: { label: t("trips.status.cancelled"), bg: "bg-red-50", text: "text-red-600" },
  };
  const sc = statusConfig[trip.status] || statusConfig.draft;

  const revenue = trip.price_amount ? approvedCount * Number(trip.price_amount) : 0;
  // TODO: M03 Expense integration — for now expenses are 0
  const expenses = 0;
  const netProfit = revenue - expenses;

  return (
    <main className="min-h-[100dvh] bg-canvas text-ink">
      <AppHeader
       
        user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }}
      />

      <BackButton fallback={`/trips/${slug}`} label={t('common.back')} />

      <div className="mx-auto flex max-w-[1440px] flex-col lg:flex-row">
        {/* ── Sidebar ── */}
        <aside className="w-full space-y-6 border-b border-line bg-surface p-5 lg:min-h-[calc(100vh-64px)] lg:w-72 lg:border-b-0 lg:border-r">
          {/* Status Badge */}
          <span className={`inline-block px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${sc.bg} ${sc.text}`}>
            {sc.label}
          </span>

          {/* Trip Name + Meta */}
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-extrabold leading-tight text-ink">
              {trip.title}
            </h2>
            <div className="space-y-1 text-sm text-ink-muted">
              {trip.start_date && (
                <p>
                  {new Date(trip.start_date).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}
                  {trip.end_date && ` - ${new Date(trip.end_date).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" })}`}
                </p>
              )}
              <p>{[trip.location_city, trip.location_country].filter(Boolean).join(", ")}</p>
            </div>
          </div>

          {/* Crew Progress */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-ink">{t("trips.manage.crewProgress")}</h3>
            <div className="h-1 w-full bg-line">
              <div
                className="h-1 bg-accent transition-all"
                style={{ width: `${Math.min(100, (approvedCount / trip.max_participants) * 100)}%` }}
              />
            </div>
            <p className="text-sm text-ink-muted">
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
            <h3 className="text-sm font-semibold text-ink">{t("trips.manage.crewMembers")}</h3>
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
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-on">
                        {(profile?.display_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">
                          {profile?.display_name || "-"}
                        </span>
                        <span className="text-xs text-ink-muted">
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
          <div className="space-y-2 border-t border-line pt-2">
            <Link
              href={`/trips/${slug}/edit`}
              className="flex w-full items-center justify-center gap-2 bg-accent px-4 py-2.5 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover"
            >
              <Icon name="pencil" size={15} /> {t("trips.manage.editTrip")}
            </Link>
            <button
              onClick={undefined}
              className="flex w-full items-center justify-center gap-2 border border-line-strong bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
            >
              <Icon name="share-2" size={15} /> {t("trips.manage.shareLink")}
            </button>
            <Link
              href={`/trips/${slug}`}
              className="flex w-full items-center justify-center gap-2 border border-line-strong bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
            >
              <Icon name="eye" size={15} /> {t("trips.manage.viewPublic")}
            </Link>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <div className="flex-1 p-8 space-y-8">
          {/* ── M021 Trip Timeline ── */}
          <TripTimelineClient tripId={trip.id} isOrganizer={true} />

          {/* Crew Positions */}
          {crewPositions.length > 0 && (
            <div className="border border-line bg-surface p-6">
              <h2 className="mb-4 font-display text-2xl font-extrabold text-ink">{t("trips.manage.crewPositions")}</h2>
              <div className="space-y-3">
                {crewPositions.map((pos) => (
                  <div key={pos.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="bg-[var(--color-primary-subtle)] px-3 py-1 text-sm font-semibold text-ink">
                        {pos.role_name}
                      </span>
                      <span className="text-xs capitalize text-ink-muted">
                        {pos.required_skill_level}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-24 bg-line">
                        <div
                          className="h-1 bg-accent"
                          style={{ width: `${Math.min(100, ((pos.filled_spots || 0) / pos.spots) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-ink-muted">
                        {pos.filled_spots || 0}/{pos.spots}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="border border-line bg-surface p-6">
            <h2 className="mb-4 font-display text-2xl font-extrabold text-ink">{t("trips.manage.quickActions")}</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={`/trips/${slug}/edit`}
                className="flex items-center gap-3 border border-line p-4 transition-colors hover:border-accent"
              >
                <Icon name="pencil" size={18} className="text-ink-muted" />
                <span className="text-sm font-medium text-ink">{t("trips.manage.editTrip")}</span>
              </Link>
              <Link
                href={`/trips/${slug}`}
                className="flex items-center gap-3 border border-line p-4 transition-colors hover:border-accent"
              >
                <Icon name="eye" size={18} className="text-ink-muted" />
                <span className="text-sm font-medium text-ink">{t("trips.manage.viewPublic")}</span>
              </Link>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="border border-line bg-surface p-6">
            <h2 className="mb-4 font-display text-2xl font-extrabold text-ink">{t("trips.manage.financialSummary")}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="border border-line bg-canvas p-4">
                <span className="mb-1 block text-xs text-ink-muted">{t("trips.manage.totalRevenue")}</span>
                <span className="font-display text-2xl font-extrabold text-ink">
                  €{revenue.toLocaleString(dateLocale)}
                </span>
              </div>
              <div className="border border-line bg-canvas p-4">
                <span className="mb-1 block text-xs text-ink-muted">{t("trips.manage.expenses")}</span>
                <span className="font-display text-2xl font-extrabold text-ink">
                  €{expenses.toLocaleString(dateLocale)}
                </span>
              </div>
              <div className="border border-line bg-canvas p-4">
                <span className="mb-1 block text-xs text-ink-muted">{t("trips.manage.netProfit")}</span>
                <span className="font-display text-2xl font-extrabold text-[var(--color-success-text)]">
                  €{netProfit.toLocaleString(dateLocale)}
                </span>
              </div>
            </div>
          </div>

          {/* Pending Applications */}
          {pendingCount > 0 && (
            <div className="border border-[var(--color-warning)] bg-surface p-6">
              <h2 className="mb-4 font-display text-2xl font-extrabold text-ink">
                {t("trips.manage.pendingApplications")} ({pendingCount})
              </h2>
              <ApplicationsManager tripId={trip.id} initial={participants as ParticipantRow[]} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
