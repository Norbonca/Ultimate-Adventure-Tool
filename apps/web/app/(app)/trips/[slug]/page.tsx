import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchTripBySlug, fetchCategoryParametersForDisplay, fetchMyParticipation } from "../actions";
import { CATEGORY_DISPLAY, DIFFICULTY_LEVELS } from "@/lib/categories";
import { getServerT, getServerLocale } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { BackButton } from "@/components/BackButton";
import { ApplyButton } from "@/components/ApplyButton";

interface TripDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const { slug } = await params;
  const trip = await fetchTripBySlug(slug);

  if (!trip) {
    notFound();
  }

  const { t } = await getServerT();
  const locale = await getServerLocale();
  const dateLocale = locale === "en" ? "en-US" : "hu-HU";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOrganizer = user?.id === trip.organizer_id;

  const [paramDefs, myParticipation, staffCountResult] = await Promise.all([
    fetchCategoryParametersForDisplay(trip.category_id, trip.sub_discipline_id),
    fetchMyParticipation(trip.id),
    supabase
      .from("trip_participants")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", trip.id)
      .eq("is_staff_seat", true),
  ]);
  const filledStaff = staffCountResult.count ?? 0;
  const totalStaff = trip.staff_seats ?? 0;

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
  const diffLevel = DIFFICULTY_LEVELS.find((l) => l.value === trip.difficulty);
  const diffLabelText = diffLevel
    ? locale === "en" ? diffLevel.labelEn : diffLevel.label
    : "";
  const categoryDetails = (trip.category_details || {}) as Record<string, unknown>;

  // Localized category/sub-discipline names
  const categoryName = category
    ? (category.name_localized as Record<string, string>)?.[locale] || category.name
    : "";
  const subDiscName = subDisc
    ? (subDisc.name_localized as Record<string, string>)?.[locale] || subDisc.name
    : "";

  const startDate = trip.start_date
    ? new Date(trip.start_date).toLocaleDateString(dateLocale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const endDate = trip.end_date
    ? new Date(trip.end_date).toLocaleDateString(dateLocale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

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
    <main className="min-h-screen bg-slate-50">
      <AppHeader
        anchors={[
          { label: t('nav.description'), href: '#description' },
          { label: t('nav.details'), href: '#details' },
          { label: t('nav.location'), href: '#location' },
        ]}
        user={user ? { email: user.email ?? "", displayName: user.user_metadata?.full_name } : null}
      />

      <BackButton fallback="/" label={t('common.back')} />

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
        {trip.cover_image_source === "user_upload" && (
          <span className="absolute top-4 right-4 text-[11px] font-semibold text-white bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-tl-lg">
            ✨ {t("imagePicker.ownPhoto")}
          </span>
        )}
        <div className="absolute bottom-6 left-6 right-6 max-w-6xl mx-auto">
          <div className="flex items-end gap-4">
            {catDisplay && (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl bg-white/90 backdrop-blur-sm shadow-lg">
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
                    {categoryName}
                  </span>
                )}
                {subDisc && (
                  <span className="text-xs font-medium text-white/80">
                    / {subDiscName}
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
                    <span className="text-navy-400">
                      ({dayCount} {t("trips.detail.days")})
                    </span>
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
              {diffLevel && (
                <span
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border"
                  style={{
                    borderColor: diffLevel.color,
                    color: diffLevel.color,
                    backgroundColor: `${diffLevel.color}10`,
                  }}
                >
                  <span className="font-bold">{diffLabelText}</span>
                  <span className="opacity-60">({trip.difficulty}/5)</span>
                </span>
              )}
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-navy-200">
                <span className="text-navy-400">👥</span>
                <span className="font-medium text-navy-700">
                  {trip.current_participants || 0}/{trip.max_participants} {t("trips.detail.guestsLabel")}
                </span>
                {totalStaff > 0 && (
                  <>
                    <span className="text-navy-300 mx-1">·</span>
                    <span className="font-medium text-emerald-700">
                      {filledStaff}/{totalStaff} {t("trips.detail.staffLabel")}
                    </span>
                  </>
                )}
              </span>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl border border-navy-200 p-6">
              <h2 className="text-lg font-bold text-navy-900 mb-3">
                {t("trips.detail.description")}
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
                    {categoryName} {t("trips.detail.details")}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {paramDefs.map((param) => {
                      const val = categoryDetails[param.parameter_key];
                      if (val === null || val === undefined || val === "")
                        return null;

                      const paramLabel =
                        (param.label_localized as Record<string, string>)?.[locale] ||
                        param.label;

                      return (
                        <div
                          key={param.parameter_key}
                          className="bg-navy-50 rounded-xl p-3"
                        >
                          <span className="text-xs text-navy-400 block mb-0.5">
                            {paramLabel}
                          </span>
                          <span className="text-sm font-semibold text-navy-800">
                            <DetailValue
                              value={val}
                              fieldType={param.field_type}
                              unit={param.unit}
                              locale={locale}
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
                  <span className="text-navy-400 text-sm"> / {t("trips.detail.perPerson")}</span>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-xl font-bold text-trevu-600">
                    {t("trips.detail.free")}
                  </span>
                  {trip.is_cost_sharing && (
                    <span className="block text-xs text-navy-400 mt-1">
                      {t("trips.detail.withCostSharing")}
                    </span>
                  )}
                </div>
              )}

              <div className="text-center text-sm text-navy-500">
                <span
                  className={`font-bold ${spotsLeft > 0 ? "text-trevu-600" : "text-red-500"}`}
                >
                  {spotsLeft > 0
                    ? `${spotsLeft} ${t("trips.detail.spotsLeft")}`
                    : t("trips.detail.full")}
                </span>
                <span className="text-navy-300"> / {trip.max_participants}</span>
              </div>

              {!isOrganizer && (
                <ApplyButton
                  tripId={trip.id}
                  requireApproval={trip.require_approval}
                  spotsLeft={spotsLeft}
                  isAuthenticated={!!user}
                  participation={myParticipation as never}
                />
              )}

              {isOrganizer && (
                <Link
                  href={`/trips/${slug}/edit`}
                  className="block w-full py-3 text-center bg-navy-100 text-navy-700 font-bold rounded-xl hover:bg-navy-200 transition-colors"
                >
                  {t("trips.detail.edit")}
                </Link>
              )}
            </div>

            {/* Organizer Card */}
            {organizer && (
              <div className="bg-white rounded-2xl border border-navy-200 p-5">
                <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wider mb-3">
                  {t("trips.detail.organizer")}
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-trevu-600 text-white flex items-center justify-center font-bold text-sm">
                    {(organizer.display_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-navy-900">
                      {organizer.display_name || t("common.user")}
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
                {t("trips.detail.details")}
              </h3>
              <div className="flex justify-between">
                <span className="text-navy-500">{t("trips.wizard.visibility")}</span>
                <span className="font-medium text-navy-700">
                  {trip.visibility === "public"
                    ? `🌍 ${t("trips.wizard.visPublic")}`
                    : trip.visibility === "followers_only"
                      ? `👥 ${t("trips.wizard.visFollowers")}`
                      : `🔒 ${t("trips.wizard.visPrivate")}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">{t("trips.detail.approval")}</span>
                <span className="font-medium text-navy-700">
                  {trip.require_approval
                    ? t("trips.detail.required")
                    : t("trips.detail.automatic")}
                </span>
              </div>
              {trip.registration_deadline && (
                <div className="flex justify-between">
                  <span className="text-navy-500">{t("trips.wizard.registrationDeadline")}</span>
                  <span className="font-medium text-navy-700">
                    {new Date(trip.registration_deadline).toLocaleDateString(dateLocale)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Helper Components ──

function TripStatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const config: Record<string, { bg: string; text: string; key: string }> = {
    draft: { bg: "bg-navy-100", text: "text-navy-600", key: "trips.status.draft" },
    published: { bg: "bg-trevu-50", text: "text-trevu-700", key: "trips.status.published" },
    registration_open: { bg: "bg-green-50", text: "text-green-700", key: "trips.status.registrationOpen" },
    active: { bg: "bg-blue-50", text: "text-blue-700", key: "trips.status.active" },
    completed: { bg: "bg-navy-100", text: "text-navy-600", key: "trips.status.completed" },
    cancelled: { bg: "bg-red-50", text: "text-red-600", key: "trips.status.cancelled" },
    archived: { bg: "bg-navy-50", text: "text-navy-400", key: "trips.status.archived" },
  };
  const c = config[status] || config.draft;
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>
      {t(c.key)}
    </span>
  );
}

function DetailValue({
  value,
  fieldType,
  unit,
  locale,
}: {
  value: unknown;
  fieldType: string;
  unit: string | null;
  locale: string;
}) {
  if (typeof value === "boolean") {
    return <>{value ? "✅" : "❌"}</>;
  }
  if (Array.isArray(value)) {
    return <>{value.join(", ")}</>;
  }
  if (typeof value === "number") {
    return (
      <>
        {value.toLocaleString(locale === "en" ? "en-US" : "hu-HU")}
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
