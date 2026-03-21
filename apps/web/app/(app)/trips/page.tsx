import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchMyTrips } from "./actions";
import { CATEGORY_DISPLAY, DIFFICULTY_LEVELS } from "@/lib/categories";

export default async function MyTripsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const trips = await fetchMyTrips();

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white/95 border-b border-navy-200 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-trevu-600 text-white flex items-center justify-center font-bold text-sm shadow-trevu-sm">
                T
              </div>
              <span className="text-xl font-extrabold tracking-tight">
                <span className="text-trevu-600">Tre</span>
                <span className="text-navy-900">vu</span>
              </span>
            </Link>
            <span className="text-navy-300 mx-1">/</span>
            <span className="text-sm font-medium text-navy-700">Túráim</span>
          </div>
          <Link
            href="/trips/new"
            className="px-4 py-2 text-sm font-bold text-white bg-trevu-600 rounded-xl hover:bg-trevu-700 transition-colors shadow-sm"
          >
            + Új túra
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-navy-900 mb-6">
          Túráim
          <span className="text-navy-300 font-normal text-lg ml-2">
            ({trips.length})
          </span>
        </h2>

        {trips.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏔️</div>
            <h3 className="text-xl font-bold text-navy-900 mb-2">
              Még nincs túrád
            </h3>
            <p className="text-navy-500 mb-6 max-w-md mx-auto">
              Hozd létre az első kalandodat — válaszd ki a kategóriát, töltsd ki
              a részleteket, és oszd meg a közösséggel!
            </p>
            <Link
              href="/trips/new"
              className="inline-flex px-6 py-3 text-sm font-bold text-white bg-trevu-600 rounded-xl hover:bg-trevu-700 transition-colors shadow-lg shadow-trevu-600/20"
            >
              + Első túra létrehozása
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
              const diffLabel = DIFFICULTY_LEVELS.find(
                (l) => l.value === trip.difficulty
              );
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
                      background: trip.cover_image_url
                        ? `url(${trip.cover_image_url}) center/cover`
                        : `linear-gradient(135deg, ${catDisplay?.colorHex || "#0D9488"}20, ${catDisplay?.colorHex || "#0D9488"}40)`,
                    }}
                  >
                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <StatusBadge status={trip.status} />
                    </div>
                    {/* Category Emoji */}
                    {catDisplay && (
                      <div className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center text-lg shadow-sm">
                        {catDisplay.emoji}
                      </div>
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
                            "hu-HU",
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
                      {diffLabel && (
                        <span
                          className="text-xs font-bold px-1.5 py-0.5 rounded"
                          style={{
                            color: diffLabel.color,
                            backgroundColor: `${diffLabel.color}15`,
                          }}
                        >
                          {diffLabel.label}
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
                          ? `${spotsLeft} hely`
                          : "Betelt"}
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-navy-800/70 text-white",
    published: "bg-trevu-600/90 text-white",
    registration_open: "bg-green-600/90 text-white",
    active: "bg-blue-600/90 text-white",
    completed: "bg-navy-600/70 text-white",
    cancelled: "bg-red-600/90 text-white",
    archived: "bg-navy-400/70 text-white",
  };
  const labels: Record<string, string> = {
    draft: "Piszkozat",
    published: "Publikált",
    registration_open: "Nyitva",
    active: "Aktív",
    completed: "Befejezett",
    cancelled: "Lemondva",
    archived: "Archivált",
  };
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${styles[status] || styles.draft}`}
    >
      {labels[status] || status}
    </span>
  );
}
