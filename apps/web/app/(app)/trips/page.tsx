import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchMyTrips } from "./actions";
import { CATEGORY_DISPLAY, DIFFICULTY_LEVELS } from "@/lib/categories";
import { getServerT, getServerLocale } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";

export default async function MyTripsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const trips = await fetchMyTrips();
  const { t } = await getServerT();
  const locale = await getServerLocale();

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader
       
        user={{ email: user.email ?? "", displayName: user.user_metadata?.full_name }}
      />

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-navy-900 mb-6">
          {t('trips.myTripsTitle')}
          <span className="text-navy-300 font-normal text-lg ml-2">
            ({trips.length})
          </span>
        </h2>

        {trips.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏔️</div>
            <h3 className="text-xl font-bold text-navy-900 mb-2">
              {t('trips.emptyTitle')}
            </h3>
            <p className="text-navy-500 mb-6 max-w-md mx-auto">
              {t('trips.emptyDescription')}
            </p>
            <Link
              href="/trips/new"
              className="inline-flex px-6 py-3 text-sm font-bold text-white bg-trevu-600 rounded-xl hover:bg-trevu-700 transition-colors shadow-lg shadow-trevu-600/20"
            >
              {t('trips.createFirst')}
            </Link>
          </div>
        ) : (
          /* Trip Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {trips.map((trip) => {
              const catRaw = trip.categories;
              const cat = (Array.isArray(catRaw) ? catRaw[0] : catRaw) as {
                name: string;
                name_localized: Record<string, string>;
                icon_name: string;
                color_hex: string;
              } | null;
              const catDisplay = cat ? CATEGORY_DISPLAY[cat.name] : null;
              const diffLevel = DIFFICULTY_LEVELS.find(
                (l) => l.value === trip.difficulty
              );
              const diffLabel = diffLevel
                ? (locale === 'en' ? diffLevel.labelEn : diffLevel.label)
                : null;
              const spotsLeft =
                trip.max_participants - (trip.current_participants || 0);

              return (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.slug}`}
                  className="group bg-white rounded-2xl border border-navy-200 overflow-hidden hover:border-trevu-400 hover:shadow-lg transition-all"
                >
                  {/* Card Header / Cover */}
                  <div
                    className="h-36 relative"
                    style={{
                      background: (trip.card_image_url || trip.cover_image_url)
                        ? `url(${trip.card_image_url || trip.cover_image_url}) center/cover`
                        : `linear-gradient(135deg, ${catDisplay?.colorHex || "#0D9488"}20, ${catDisplay?.colorHex || "#0D9488"}40)`,
                    }}
                  >
                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <StatusBadge status={trip.status} t={t} />
                    </div>
                    {/* Category Emoji */}
                    {catDisplay && (
                      <div className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center text-lg shadow-sm">
                        {catDisplay.emoji}
                      </div>
                    )}
                    {/* Own Photo Badge */}
                    {(trip.card_image_url ? trip.card_image_source : trip.cover_image_source) === "user_upload" && (
                      <span className="absolute bottom-2 right-2 text-[10px] font-semibold text-white bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-tl-lg">
                        ✨ {t("imagePicker.ownPhoto")}
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4">
                    <h3 className="font-bold text-navy-900 group-hover:text-trevu-600 transition-colors truncate">
                      {trip.title}
                    </h3>

                    {trip.short_description && (
                      <p className="text-xs text-navy-500 mt-1 line-clamp-2">
                        {trip.short_description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 mt-3">
                      {/* Date */}
                      {trip.start_date && (
                        <span className="text-xs text-navy-500 flex items-center gap-1">
                          📅{" "}
                          {new Date(trip.start_date).toLocaleDateString(
                            locale === 'en' ? 'en-US' : 'hu-HU',
                            { month: "short", day: "numeric" }
                          )}
                        </span>
                      )}
                      {/* Location */}
                      {(trip.location_city || trip.location_region) && (
                        <span className="text-xs text-navy-500 flex items-center gap-1">
                          📍{" "}
                          {trip.location_city ||
                            trip.location_region ||
                            trip.location_country}
                        </span>
                      )}
                      {/* Difficulty */}
                      {diffLabel && diffLevel && (
                        <span
                          className="text-xs font-bold px-1.5 py-0.5 rounded"
                          style={{
                            color: diffLevel.color,
                            backgroundColor: `${diffLevel.color}15`,
                          }}
                        >
                          {diffLabel}
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-navy-100">
                      <span className="text-xs text-navy-400">
                        👥 {trip.current_participants || 0}/
                        {trip.max_participants}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          spotsLeft > 0
                            ? "text-trevu-600"
                            : "text-red-500"
                        }`}
                      >
                        {spotsLeft > 0
                          ? t('common.spotsLeft', { count: spotsLeft })
                          : t('common.full')}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status, t }: { status: string; t: (key: any, params?: Record<string, string | number>) => string }) {
  const styles: Record<string, string> = {
    draft: "bg-navy-800/70 text-white",
    published: "bg-trevu-600/90 text-white",
    registration_open: "bg-green-600/90 text-white",
    active: "bg-blue-600/90 text-white",
    completed: "bg-navy-600/70 text-white",
    cancelled: "bg-red-600/90 text-white",
    archived: "bg-navy-400/70 text-white",
  };

  const statusKeyMap: Record<string, string> = {
    draft: 'trips.status.draft',
    published: 'trips.status.published',
    registration_open: 'trips.status.registrationOpen',
    active: 'trips.status.active',
    completed: 'trips.status.completed',
    cancelled: 'trips.status.cancelled',
    archived: 'trips.status.archived',
  };

  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${styles[status] || styles.draft}`}
    >
      {statusKeyMap[status] ? t(statusKeyMap[status]) : status}
    </span>
  );
}
