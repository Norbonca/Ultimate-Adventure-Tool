import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchMyTrips } from "./actions";
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
  const trips = await fetchMyTrips();
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
    <main className="min-h-screen bg-slate-50">
      <AppHeader
        user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ── Fejsor: cím + kereső + Új túra ── */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <h1 className="text-2xl font-extrabold text-navy-900 mr-auto">
            {t("trips.myTripsTitle")}
          </h1>
          <form method="GET" className="relative">
            {tab !== "active" && <input type="hidden" name="tab" value={tab} />}
            <Icon
              name="search"
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400"
            />
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder={t("trips.searchPlaceholder")}
              className="input-trevu w-64 pl-9 pr-3 py-2 text-sm"
            />
          </form>
          <Button href="/trips/new" icon="plus">
            {t("trips.createTrip")}
          </Button>
        </div>

        {/* ── Fülek ── */}
        <nav className="flex gap-1 border-b border-navy-200 mb-6">
          {tabs.map((item) => (
            <Link
              key={item.key}
              href={
                item.key === "active" ? "/trips" : `/trips?tab=${item.key}`
              }
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                tab === item.key
                  ? "border-trevu-600 text-trevu-600"
                  : "border-transparent text-navy-500 hover:text-navy-800"
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
                <p className="text-sm text-navy-500 bg-white border border-navy-200 rounded-xl px-4 py-8 text-center">
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
                    ? `${new Date(trip.start_date).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })} – ${new Date(trip.end_date).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" })}`
                    : null;
                const location = [trip.location_city || trip.location_region, trip.location_country]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <Link
                    key={trip.id}
                    href={`/trips/${trip.slug}`}
                    className="group flex items-center gap-4 bg-white border border-navy-200 rounded-2xl px-5 py-4 hover:border-trevu-400 hover:shadow-lg transition-all"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${catDisplay?.colorHex || "#0D9488"}1f`,
                      }}
                    >
                      <Icon
                        name={catDisplay?.icon || "compass"}
                        size={20}
                        className="text-navy-700"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-bold text-navy-900 truncate group-hover:text-trevu-600 transition-colors">
                          {trip.title}
                        </h3>
                        <StatusBadge status={trip.status} t={t} />
                      </div>
                      <p className="text-xs text-navy-500 mt-1 truncate">
                        {[dates, location, t("trips.participantsOf", { current, max })]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <div className="mt-2.5 h-1.5 rounded-full bg-navy-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-trevu-500"
                          style={{ width: `${fill}%` }}
                        />
                      </div>
                    </div>

                    <Icon
                      name="chevron-right"
                      size={18}
                      className="text-navy-300 group-hover:text-trevu-500 shrink-0 transition-colors"
                    />
                  </Link>
                );
              })
            )}
          </div>

          {/* ── Jobb sáv ── */}
          <aside className="w-full lg:w-[320px] shrink-0 space-y-6">
            <section className="bg-white border border-navy-200 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-navy-900 mb-3">
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
                        <p className="text-navy-800">
                          {t("trips.newApplication", {
                            name: profile?.display_name ?? "—",
                          })}
                        </p>
                        <p className="text-xs text-navy-400 truncate">
                          {trip?.title}
                          {app.applied_at &&
                            ` · ${new Date(app.applied_at).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}`}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-navy-400">{t("trips.noActivity")}</p>
              )}
            </section>

            <section className="bg-white border border-navy-200 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-navy-900 mb-3">
                {t("trips.listStats.title")}
              </h2>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xl font-extrabold text-navy-900">
                    {realTrips.length}
                  </p>
                  <p className="text-xs text-navy-400">{t("trips.listStats.trips")}</p>
                </div>
                <div>
                  <p className="text-xl font-extrabold text-navy-900">
                    {Math.round(totalDays)}
                  </p>
                  <p className="text-xs text-navy-400">{t("trips.listStats.days")}</p>
                </div>
                <div>
                  <p className="text-xl font-extrabold text-navy-900">{countries}</p>
                  <p className="text-xs text-navy-400">
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
    draft: "bg-navy-100 text-navy-600",
    published: "bg-trevu-50 text-trevu-700",
    registration_open: "bg-green-50 text-green-700",
    active: "bg-blue-50 text-blue-700",
    completed: "bg-navy-100 text-navy-500",
    cancelled: "bg-red-50 text-red-600",
    archived: "bg-navy-100 text-navy-400",
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
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${styles[status] || styles.draft}`}
    >
      {t(statusKeyMap[status] || "trips.status.draft")}
    </span>
  );
}
