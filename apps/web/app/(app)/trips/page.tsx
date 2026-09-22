import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchMyTrips } from "./actions";
import { fetchMyDeletedTrips } from "./deletion-actions";
import { DeletedTripsList } from "@/components/trip-forms/DeletedTripsList";
import { CATEGORY_DISPLAY } from "@/lib/categories";
import { getServerT, getServerLocale } from "@/lib/i18n/server";
import type { TranslationKey } from "@uat/i18n";
import { AppHeader } from "@/components/AppHeader";
import { Icon } from "@/components/Icon";
import { Button, StateTemplate } from "@/components/ui";

// My Trips Dashboard — a Túratervező otthona. Design: design/D02_Trip_Management.pen#eQdvE

type TabKey = "active" | "past" | "drafts";

export default async function MyTripsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { tab: tabParam, q } = await searchParams;
  const [trips, deletedTrips] = await Promise.all([fetchMyTrips(), fetchMyDeletedTrips()]);
  const { t } = await getServerT();
  const locale = await getServerLocale();
  const dateLocale = locale === "en" ? "en-US" : "hu-HU";

  // ── Fülekre bontás ──
  const today = new Date().toISOString().slice(0, 10);
  const buckets: Record<TabKey, typeof trips> = { active: [], past: [], drafts: [] };
  for (const trip of trips) {
    if (trip.status === "draft") buckets.drafts.push(trip);
    else if (trip.end_date && trip.end_date < today) buckets.past.push(trip);
    else buckets.active.push(trip);
  }
  const tab: TabKey =
    tabParam === "past" || tabParam === "drafts" ? tabParam : "active";
  const query = (q ?? "").trim().toLowerCase();
  const visible = buckets[tab].filter(
    (trip) => !query || trip.title.toLowerCase().includes(query)
  );

  // ── Statisztikák (nem-piszkozat túrákból) ──
  const realTrips = trips.filter((trip) => trip.status !== "draft");
  const totalDays = realTrips.reduce((sum, trip) => {
    if (!trip.start_date || !trip.end_date) return sum;
    const days =
      (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) /
        86400000 +
      1;
    return sum + Math.max(days, 1);
  }, 0);
  const countries = new Set(
    realTrips.map((trip) => trip.location_country).filter(Boolean)
  ).size;

  // ── Legutóbbi jelentkezések a túráimra ──
  const tripIds = trips.map((trip) => trip.id);
  const { data: recentApplications } = tripIds.length
    ? await supabase
        .from("trip_participants")
        .select(
          "id, applied_at, trips!inner(title), profiles!trip_participants_user_id_fkey(display_name)"
        )
        .in("trip_id", tripIds)
        .order("applied_at", { ascending: false })
        .limit(3)
    : { data: [] };

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "active", label: t("trips.listTabs.active"), count: buckets.active.length },
    { key: "past", label: t("trips.listTabs.past"), count: buckets.past.length },
    { key: "drafts", label: t("trips.listTabs.drafts"), count: buckets.drafts.length },
  ];

  return (
    <main className="min-h-[100dvh] bg-canvas text-ink">
      <AppHeader
        user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }}
      />

      <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        {/* ── Fejsor: cím + kereső + Új túra ── */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <h1 className="mr-auto font-display text-4xl font-extrabold leading-none tracking-tight text-ink sm:text-5xl">
            {t("trips.myTripsTitle")}
          </h1>
          <form method="GET" className="relative">
            {tab !== "active" && <input type="hidden" name="tab" value={tab} />}
            <Icon
              name="search"
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder={t("trips.searchPlaceholder")}
              className="h-12 w-64 border border-line-strong bg-surface py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-accent"
            />
          </form>
          <Button href="/trips/new" icon="plus">
            {t("trips.createTrip")}
          </Button>
        </div>

        {/* ── Fülek ── */}
        <nav className="mb-8 flex gap-1 border-b border-line">
          {tabs.map((item) => (
            <Link
              key={item.key}
              href={
                item.key === "active" ? "/trips" : `/trips?tab=${item.key}`
              }
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                tab === item.key
                  ? "border-accent text-accent"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {item.label} ({item.count})
            </Link>
          ))}
        </nav>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ── Túra sorok ── */}
          <div className="flex-1 min-w-0 w-full space-y-3">
            {visible.length === 0 ? (
              trips.length === 0 ? (
                /* Üres fiók — design/D00_Core_Components.pen#3VCtO */
                <StateTemplate
                  variant="empty"
                  icon="inbox"
                  title={t("trips.emptyTitle")}
                  description={t("trips.emptyDescription")}
                  actions={
                    <Button href="/trips/new">{t("trips.createFirst")}</Button>
                  }
                />
              ) : (
                <p className="border border-line bg-surface px-4 py-8 text-center text-sm text-ink-muted">
                  {t("trips.noTripsInTab")}
                </p>
              )
            ) : (
              visible.map((trip) => {
                const catRaw = trip.categories;
                const cat = (Array.isArray(catRaw) ? catRaw[0] : catRaw) as {
                  name: string;
                } | null;
                const catDisplay = cat ? CATEGORY_DISPLAY[cat.name] : null;
                const current = trip.current_participants || 0;
                const max = trip.max_participants || 0;
                const fill = max > 0 ? Math.min((current / max) * 100, 100) : 0;
                const dates =
                  trip.start_date && trip.end_date
                    ? `${new Date(trip.start_date).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })} - ${new Date(trip.end_date).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" })}`
                    : null;
                const location = [trip.location_city || trip.location_region, trip.location_country]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <Link
                    key={trip.id}
                    href={`/trips/${trip.slug}`}
                    className="group flex items-center gap-4 border border-line bg-surface px-5 py-4 transition-colors hover:border-accent"
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center"
                      style={{
                        backgroundColor: `${catDisplay?.colorHex || "#0D9488"}1f`,
                      }}
                    >
                      <Icon
                        name={catDisplay?.icon || "compass"}
                        size={20}
                        className="text-ink"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="truncate font-bold text-ink transition-colors group-hover:text-accent">
                          {trip.title}
                        </h3>
                        <StatusBadge status={trip.status} t={t} />
                      </div>
                      <p className="mt-1 truncate text-xs text-ink-muted">
                        {[dates, location, t("trips.participantsOf", { current, max })]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <div className="mt-2.5 h-1 overflow-hidden bg-line">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${fill}%` }}
                        />
                      </div>
                    </div>

                    <Icon
                      name="chevron-right"
                      size={18}
                      className="shrink-0 text-ink-muted transition-colors group-hover:text-accent"
                    />
                  </Link>
                );
              })
            )}
            <DeletedTripsList trips={deletedTrips} />
          </div>

          {/* ── Jobb sáv ── */}
          <aside className="w-full lg:w-[320px] shrink-0 space-y-6">
            <section className="border border-line bg-surface p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-ink">
                {t("trips.recentActivity")}
              </h2>
              {recentApplications && recentApplications.length > 0 ? (
                <ul className="space-y-3">
                  {recentApplications.map((app) => {
                    const profile = app.profiles as unknown as {
                      display_name: string | null;
                    } | null;
                    const trip = app.trips as unknown as { title: string } | null;
                    return (
                      <li key={app.id} className="text-sm">
                        <p className="text-ink">
                          {t("trips.newApplication", {
                            name: profile?.display_name ?? "-",
                          })}
                        </p>
                        <p className="truncate text-xs text-ink-muted">
                          {trip?.title}
                          {app.applied_at &&
                            ` · ${new Date(app.applied_at).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}`}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-ink-muted">{t("trips.noActivity")}</p>
              )}
            </section>

            <section className="border border-line bg-surface p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-ink">
                {t("trips.listStats.title")}
              </h2>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="font-display text-2xl font-extrabold text-ink">
                    {realTrips.length}
                  </p>
                  <p className="text-xs text-ink-muted">{t("trips.listStats.trips")}</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-extrabold text-ink">
                    {Math.round(totalDays)}
                  </p>
                  <p className="text-xs text-ink-muted">{t("trips.listStats.days")}</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-extrabold text-ink">{countries}</p>
                  <p className="text-xs text-ink-muted">
                    {t("trips.listStats.countries")}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function StatusBadge({
  status,
  t,
}: {
  status: string;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}) {
  const styles: Record<string, string> = {
    draft: "bg-line text-ink-muted",
    published: "bg-[var(--color-primary-subtle)] text-accent",
    registration_open: "bg-green-50 text-green-700",
    active: "bg-blue-50 text-blue-700",
    completed: "bg-line text-ink-muted",
    cancelled: "bg-red-50 text-red-600",
    archived: "bg-line text-ink-muted",
  };

  const statusKeyMap: Record<string, TranslationKey> = {
    draft: "trips.status.draft",
    published: "trips.status.published",
    registration_open: "trips.status.registrationOpen",
    active: "trips.status.active",
    completed: "trips.status.completed",
    cancelled: "trips.status.cancelled",
    archived: "trips.status.archived",
  };

  return (
    <span
      className={`shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[status] || styles.draft}`}
    >
      {t(statusKeyMap[status] || "trips.status.draft")}
    </span>
  );
}
