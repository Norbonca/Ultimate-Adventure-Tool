import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchTripBySlug, fetchCategoryParametersForDisplay } from "../actions";
import { CATEGORY_DISPLAY, DIFFICULTY_LEVELS } from "@/lib/categories";

interface TripDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const { slug } = await params;
  const trip = await fetchTripBySlug(slug);

  if (!trip) {
    notFound();
  }

  // Check if current user is the organizer
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOrganizer = user?.id === trip.organizer_id;

  // Fetch parameter definitions for category detail display
  const paramDefs = await fetchCategoryParametersForDisplay(
    trip.category_id,
    trip.sub_discipline_id
  );

  const catRaw = trip.categories;
  const category = (Array.isArray(catRaw) ? catRaw[0] : catRaw) as {
    id: string;
    name: string;
    name_localized: Record<string, string>;
    icon_name: string;
    color_hex: string;
  } | null;

  const orgRaw = trip.profiles;
  const organizer = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    slug: string | null;
    subscription_tier: string | null;
  } | null;

  const subRaw = trip.sub_disciplines;
  const subDisc = (Array.isArray(subRaw) ? subRaw[0] : subRaw) as {
    id: string;
    name: string;
    name_localized: Record<string, string>;
  } | null;

  const catDisplay = category ? CATEGORY_DISPLAY[category.name] : null;
  const diffLabel = DIFFICULTY_LEVELS.find((l) => l.value === trip.difficulty);
  const categoryDetails = (trip.category_details || {}) as Record<string, unknown>;

  // Format dates
  const startDate = trip.start_date
    ? new Date(trip.start_date).toLocaleDateString("hu-HU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const endDate = trip.end_date
    ? new Date(trip.end_date).toLocaleDateString("hu-HU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  // Calculate days
  const dayCount =
    trip.start_date && trip.end_date
      ? Math.ceil(
          (new Date(trip.end_date).getTime() -
            new Date(trip.start_date).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      : null;

  const spotsLeft = trip.max_participants - (trip.current_participants || 0);

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
            <Link
              href="/trips"
              className="text-sm text-navy-500 hover:text-trevu-600 transition-colors"
            >
              Túráim
            </Link>
            <span className="text-navy-300 mx-1">/</span>
            <span className="text-sm font-medium text-navy-700 truncate max-w-[200px]">
              {trip.title}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isOrganizer && (
              <span className="text-xs bg-trevu-50 text-trevu-700 px-2.5 py-1 rounded-full font-medium">
                Szervező
              </span>
            )}
            {/* Status badge */}
            <TripStatusBadge status={trip.status} />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div
        className="h-64 sm:h-80 relative"
        style={{
          background: trip.cover_image_url
            ? `url(${trip.cover_image_url}) center/cover`
            : `linear-gradient(135deg, ${catDisplay?.colorHex || "#0D9488"}22, ${catDisplay?.colorHex || "#0D9488"}44)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 max-w-6xl mx-auto">
          <div className="flex items-end gap-4">
            {catDisplay && (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl bg-white/90 backdrop-blur-sm shadow-lg"
              >
                {catDisplay.emoji}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {category && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: category.color_hex }}
                  >
                    {(category.name_localized as Record<string, string>)?.hu ||
                      category.name}
                  </span>
                )}
                {subDisc && (
                  <span className="text-xs font-medium text-white/80">
                    /{" "}
                    {(subDisc.name_localized as Record<string, string>)?.hu ||
                      subDisc.name}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white drop-shadow-md">
                {trip.title}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Main Content (2 cols) ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Info Bar */}
            <div className="flex flex-wrap gap-3 text-sm">
              {startDate && (
                <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-navy-200">
                  <span className="text-navy-400">📅</span>
                  <span className="font-medium text-navy-700">
                    {startDate}
                    {endDate && startDate !== endDate ? ` → ${endDate}` : ""}
                  </span>
                  {dayCount && (
                    <span className="text-navy-400">({dayCount} nap)</span>
                  )}
                </span>
              )}
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-navy-200">
                <span className="text-navy-400">📍</span>
                <span className="font-medium text-navy-700">
                  {[trip.location_city, trip.location_region, trip.location_country]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </span>
              {diffLabel && (
                <span
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border"
                  style={{
                    borderColor: diffLabel.color,
                    color: diffLabel.color,
                    backgroundColor: `${diffLabel.color}10`,
                  }}
                >
                  <span className="font-bold">{diffLabel.label}</span>
                  <span className="opacity-60">({trip.difficulty}/5)</span>
                </span>
              )}
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-navy-200">
                <span className="text-navy-400">👥</span>
                <span className="font-medium text-navy-700">
                  {trip.current_participants || 0}/{trip.max_participants} fő
                </span>
              </span>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl border border-navy-200 p-6">
              <h2 className="text-lg font-bold text-navy-900 mb-3">
                Leírás
              </h2>
              {trip.short_description && (
                <p className="text-trevu-700 font-medium mb-3">
                  {trip.short_description}
                </p>
              )}
              <div className="text-navy-600 leading-relaxed whitespace-pre-wrap">
                {trip.description}
              </div>
            </div>

            {/* Category-Specific Details */}
            {paramDefs.length > 0 &&
              Object.keys(categoryDetails).length > 0 && (
                <div className="bg-white rounded-2xl border border-navy-200 p-6">
                  <h2 className="text-lg font-bold text-navy-900 mb-4">
                    {catDisplay?.nameHu || "Kategória"} részletek
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {paramDefs.map((param) => {
                      const val = categoryDetails[param.parameter_key];
                      if (val === null || val === undefined || val === "")
                        return null;

                      const labelHu =
                        (param.label_localized as Record<string, string>)?.hu ||
                        param.label;

                      return (
                        <div
                          key={param.parameter_key}
                          className="bg-navy-50 rounded-xl p-3"
                        >
                          <span className="text-xs text-navy-400 block mb-0.5">
                            {labelHu}
                          </span>
                          <span className="text-sm font-semibold text-navy-800">
                            <DetailValue
                              value={val}
                              fieldType={param.field_type}
                              unit={param.unit}
                            />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Tags */}
            {trip.tags && trip.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {trip.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full bg-navy-100 text-navy-600 text-xs font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Sidebar (1 col) ── */}
          <div className="space-y-4">
            {/* CTA Card */}
            <div className="bg-white rounded-2xl border border-navy-200 p-6 space-y-4">
              {trip.price_amount ? (
                <div className="text-center">
                  <span className="text-3xl font-extrabold text-navy-900">
                    {trip.price_currency} {Number(trip.price_amount).toFixed(0)}
                  </span>
                  <span className="text-navy-400 text-sm"> / fő</span>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-xl font-bold text-trevu-600">
                    Ingyenes
                  </span>
                  {trip.is_cost_sharing && (
                    <span className="block text-xs text-navy-400 mt-1">
                      Költségmegosztással
                    </span>
                  )}
                </div>
              )}

              <div className="text-center text-sm text-navy-500">
                <span
                  className={`font-bold ${spotsLeft > 0 ? "text-trevu-600" : "text-red-500"}`}
                >
                  {spotsLeft > 0 ? `${spotsLeft} szabad hely` : "Betelt"}
                </span>
                <span className="text-navy-300"> / {trip.max_participants}</span>
              </div>

              {!isOrganizer && spotsLeft > 0 && (
                <button className="w-full py-3 bg-trevu-600 text-white font-bold rounded-xl hover:bg-trevu-700 transition-colors shadow-lg shadow-trevu-600/20">
                  Jelentkezem
                </button>
              )}

              {isOrganizer && (
                <Link
                  href={`/trips/new?edit=${trip.id}`}
                  className="block w-full py-3 text-center bg-navy-100 text-navy-700 font-bold rounded-xl hover:bg-navy-200 transition-colors"
                >
                  Szerkesztés
                </Link>
              )}
            </div>

            {/* Organizer Card */}
            {organizer && (
              <div className="bg-white rounded-2xl border border-navy-200 p-5">
                <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wider mb-3">
                  Szervező
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-trevu-600 text-white flex items-center justify-center font-bold text-sm">
                    {(organizer.display_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-navy-900">
                      {organizer.display_name || "Felhasználó"}
                    </span>
                    {organizer.subscription_tier &&
                      organizer.subscription_tier !== "free" && (
                        <span className="ml-1.5 text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-medium">
                          {organizer.subscription_tier}
                        </span>
                      )}
                    {organizer.slug && (
                      <span className="block text-xs text-navy-400">
                        @{organizer.slug}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Trip Meta */}
            <div className="bg-white rounded-2xl border border-navy-200 p-5 space-y-3 text-sm">
              <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wider">
                Részletek
              </h3>
              <div className="flex justify-between">
                <span className="text-navy-500">Láthatóság</span>
                <span className="font-medium text-navy-700 capitalize">
                  {trip.visibility === "public"
                    ? "🌍 Nyilvános"
                    : trip.visibility === "followers_only"
                      ? "👥 Követők"
                      : "🔒 Privát"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Jóváhagyás</span>
                <span className="font-medium text-navy-700">
                  {trip.require_approval ? "Szükséges" : "Automatikus"}
                </span>
              </div>
              {trip.registration_deadline && (
                <div className="flex justify-between">
                  <span className="text-navy-500">Jelentkezési határidő</span>
                  <span className="font-medium text-navy-700">
                    {new Date(trip.registration_deadline).toLocaleDateString(
                      "hu-HU"
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-navy-500">Nyelv</span>
                <span className="font-medium text-navy-700">
                  {trip.language === "hu" ? "🇭🇺 Magyar" : trip.language}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Helper Components ──

function TripStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    draft: { label: "Piszkozat", bg: "bg-navy-100", text: "text-navy-600" },
    published: { label: "Publikált", bg: "bg-trevu-50", text: "text-trevu-700" },
    registration_open: {
      label: "Jelentkezés nyitva",
      bg: "bg-green-50",
      text: "text-green-700",
    },
    active: { label: "Aktív", bg: "bg-blue-50", text: "text-blue-700" },
    completed: { label: "Befejezett", bg: "bg-navy-100", text: "text-navy-600" },
    cancelled: { label: "Lemondva", bg: "bg-red-50", text: "text-red-600" },
    archived: { label: "Archivált", bg: "bg-navy-50", text: "text-navy-400" },
  };
  const c = config[status] || config.draft;
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function DetailValue({
  value,
  fieldType,
  unit,
}: {
  value: unknown;
  fieldType: string;
  unit: string | null;
}) {
  if (typeof value === "boolean") {
    return <>{value ? "✅ Igen" : "❌ Nem"}</>;
  }
  if (Array.isArray(value)) {
    return <>{value.join(", ")}</>;
  }
  if (typeof value === "number") {
    return (
      <>
        {value}
        {unit ? ` ${unit}` : ""}
      </>
    );
  }
  return (
    <>
      {String(value)}
      {unit ? ` ${unit}` : ""}
    </>
  );
}
