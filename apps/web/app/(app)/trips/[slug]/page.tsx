import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchTripBySlug, fetchCategoryParametersForDisplay, fetchMyParticipation, fetchCrewPositions } from "../actions";
import { CATEGORY_DISPLAY, DIFFICULTY_LEVELS } from "@/lib/categories";
import { getServerT, getServerLocale } from "@/lib/i18n/server";
import { AppHeader } from "@/components/AppHeader";
import { BackButtonNight } from "@/components/BackButton";
import { ApplyButton } from "@/components/ApplyButton";
import { TripCancelledBanner } from "@/components/trip-forms/TripCancelledBanner";
import { CANCELLATION_REASON_LABEL, type CancellationReason } from "@/lib/trip-deletion";
import { Icon } from "@/components/Icon";
import { formatParameterValue, type ParameterDisplayOption } from "@/lib/i18n/localized";
import { formatLocalDate } from "@/lib/timezone";
import { fetchTripBySlugForAdmin } from "@/lib/admin-auth";

interface TripDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TripDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const trip = (await fetchTripBySlug(slug)) ?? (await fetchTripBySlugForAdmin(slug));
  if (!trip) return {};

  const description =
    (trip.short_description as string | null) ||
    (typeof trip.description === "string" ? trip.description.slice(0, 200) : null) ||
    "Fedezd fel ezt a kalandot a Trevu-n.";

  const cover = (trip.cover_image_url as string | null) || null;

  return {
    title: trip.title as string,
    description,
    openGraph: {
      title: trip.title as string,
      description,
      type: "article",
      ...(cover ? { images: [{ url: cover, width: 1200, height: 630, alt: trip.title as string }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: trip.title as string,
      description,
      ...(cover ? { images: [cover] } : {}),
    },
  };
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const { slug } = await params;
  const trip = (await fetchTripBySlug(slug)) ?? (await fetchTripBySlugForAdmin(slug));

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

  const [paramDefs, myParticipation, staffCountResult, crewPositions] = await Promise.all([
    fetchCategoryParametersForDisplay(trip.category_id, trip.sub_discipline_id),
    fetchMyParticipation(trip.id),
    supabase
      .from("trip_participants")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", trip.id)
      .eq("is_staff_seat", true),
    fetchCrewPositions(trip.id),
  ]);
  const filledStaff = staffCountResult.count ?? 0;
  const totalStaff = trip.staff_seats ?? 0;
  const totalGuests = trip.max_participants ?? 0;
  const teamTotal = totalGuests + totalStaff;

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

  // BR-M02-009: a lemondott túra az okkal és a szervező üzenetével jelenik meg, jelentkezni nem lehet.
  const isCancelled = trip.status === "cancelled";
  const cancelledReason = trip.cancelled_reason as CancellationReason | null;
  const cancelledMeta = isCancelled
    ? [
        trip.cancelled_at
          ? t("trips.deletion.cancelledOn", {
              date: new Date(trip.cancelled_at).toLocaleDateString(dateLocale, { year: "numeric", month: "long", day: "numeric" }),
            })
          : null,
        cancelledReason && CANCELLATION_REASON_LABEL[cancelledReason]
          ? t("trips.deletion.cancelledReason", { reason: t(CANCELLATION_REASON_LABEL[cancelledReason]) })
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <main className="min-h-[100dvh] bg-canvas pb-20 text-ink lg:pb-0">
      <div data-surface="night" className="contents">
        <AppHeader
          user={user ? { email: user.email ?? "", displayName: user.user_metadata?.full_name } : null}
        />
      </div>

      {/* HERO — Brand Guide v2 §5, Night régió a túra saját borítóképével.
          Terv: design/D02_Trip_Management.pen#KpgDv (1440), #M0RLZp (390, StickyActionBar). */}
      <section data-surface="night" className="relative overflow-hidden bg-canvas text-ink" data-testid="trip-hero">
        {trip.cover_image_url ? (
          // A borítókép külső tárhelyről jön (Supabase Storage, Unsplash).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trip.cover_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div aria-hidden className="absolute inset-0 [background:radial-gradient(60%_80%_at_0%_0%,rgba(45,212,191,.12),transparent_70%)]" />
        )}
        <div aria-hidden className="absolute inset-0 bg-hero-scrim-mobile md:bg-hero-scrim" />
        {trip.cover_image_source === "user_upload" && (
          <span className="absolute right-4 top-16 z-10 bg-glass px-2.5 py-1 text-[11px] font-semibold text-ink backdrop-blur">
            <Icon name="camera" size={12} className="-mt-0.5 mr-1 inline" />{t("imagePicker.ownPhoto")}
          </span>
        )}
        <div className="relative mx-auto max-w-7xl px-5 pt-3 md:px-[120px]">
          <BackButtonNight fallback="/" label={t('common.back')} />
        </div>
        <div className="relative mx-auto flex min-h-[300px] max-w-7xl flex-col justify-end gap-6 px-5 pb-8 pt-6 md:min-h-[460px] md:flex-row md:items-end md:justify-between md:px-[120px] md:pb-12">
          <div className="flex max-w-[760px] flex-col gap-3.5">
            <div className="flex flex-wrap items-center gap-2">
              {category && (
                <span className="inline-flex w-fit items-center gap-1.5 bg-glass px-2.5 py-1 text-xs font-semibold text-ink backdrop-blur">
                  {catDisplay && <span style={{ color: catDisplay.colorHex }} className="inline-flex"><Icon name={catDisplay.icon} size={14} /></span>}
                  {categoryName}{subDisc ? ` · ${subDiscName}` : ""}
                </span>
              )}
              {isCancelled && (
                <span className="inline-flex items-center gap-1.5 bg-[var(--color-warning-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--color-warning-text)]">
                  <Icon name="calendar" size={12} />
                  {t("trips.status.cancelled")}
                </span>
              )}
            </div>
            <h1 className="font-display text-[42px] font-extrabold leading-[0.95] tracking-[-0.02em] text-ink [text-wrap:balance] md:text-hero-display">{trip.title}</h1>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm font-medium text-ink-body">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="map-pin" size={16} className="text-ink-secondary" />
                {[trip.location_city, trip.location_country].filter(Boolean).join(", ")}
              </span>
              {startDate && (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="calendar" size={16} className="text-ink-secondary" />
                  {startDate}{endDate && startDate !== endDate ? ` - ${endDate}` : ""}
                </span>
              )}
              {!isCancelled && (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="users" size={16} className="text-ink-secondary" />
                  {spotsLeft > 0 ? `${spotsLeft} ${t("trips.detail.spotsLeft")}` : t("trips.detail.full")}
                </span>
              )}
            </p>
          </div>
          <div className="hidden flex-col items-end gap-2.5 md:flex">
            <span className="text-2xl font-semibold text-ink">
              {trip.price_amount ? `${Number(trip.price_amount).toFixed(0)} ${trip.price_currency} / ${t("trips.detail.perPerson")}` : t("trips.detail.free")}
            </span>
            {!isCancelled && (
              <a href="#trip-apply" className="inline-flex h-12 items-center bg-accent px-6 text-base font-bold text-accent-on hover:bg-accent-hover focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                {isOrganizer ? t("trips.detail.edit") : t("trips.detail.apply")}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Main Content (2 cols) ── */}
          <div className="lg:col-span-2 space-y-6">
            {isCancelled && (
              <TripCancelledBanner
                title={t("trips.deletion.cancelledTitle")}
                meta={cancelledMeta}
                message={(trip.cancellation_message as string | null) ?? null}
                organizerName={organizer?.display_name ?? null}
                note={t("trips.deletion.cancelledNote")}
              />
            )}
            {/* Quick Info Bar */}
            <div className="flex flex-wrap gap-3 text-sm">
              {startDate && (
                <span className="flex items-center gap-1.5 border border-line bg-surface px-3 py-1.5">
                  <Icon name="calendar" size={15} className="text-ink-muted" />
                  <span className="font-medium text-ink">
                    {startDate}
                    {endDate && startDate !== endDate ? ` - ${endDate}` : ""}
                  </span>
                  {dayCount && (
                    <span className="text-ink-muted">
                      ({dayCount} {t("trips.detail.days")})
                    </span>
                  )}
                </span>
              )}
              <span className="flex items-center gap-1.5 border border-line bg-surface px-3 py-1.5">
                <Icon name="map-pin" size={15} className="text-ink-muted" />
                <span className="font-medium text-ink">
                  {[trip.location_city, trip.location_region, trip.location_country]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </span>
              {diffLevel && (
                <span
                  className="flex items-center gap-1.5 border px-3 py-1.5"
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
              <span className="flex items-center gap-1.5 border border-line bg-surface px-3 py-1.5">
                <Icon name="users" size={15} className="text-ink-muted" />
                <span className="font-medium text-ink">
                  {trip.current_participants || 0}/{trip.max_participants} {t("trips.detail.guestsLabel")}
                </span>
                {totalStaff > 0 && (
                  <>
                    <span className="mx-1 text-ink-muted">·</span>
                    <span className="font-medium text-[var(--color-success-text)]">
                      {filledStaff}/{totalStaff} {t("trips.detail.staffLabel")}
                    </span>
                  </>
                )}
              </span>
            </div>

            {/* Description */}
            <div className="border border-line bg-surface p-6">
              <h2 className="mb-3 font-display text-3xl font-extrabold text-ink">
                {t("trips.detail.description")}
              </h2>
              {trip.short_description && (
                <p className="mb-3 font-medium text-accent">
                  {trip.short_description}
                </p>
              )}
              <div className="whitespace-pre-wrap leading-relaxed text-ink-muted">
                {trip.description}
              </div>
            </div>

            {/* Category-Specific Details */}
            {paramDefs.length > 0 &&
              Object.keys(categoryDetails).length > 0 && (
                <div className="border border-line bg-surface p-6">
                  <h2 className="mb-4 font-display text-3xl font-extrabold text-ink">
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
                          className="border border-line bg-canvas p-3"
                        >
                          <span className="mb-0.5 block text-xs text-ink-muted">
                            {paramLabel}
                          </span>
                          <span className="text-sm font-semibold text-ink">
                            <DetailValue
                              value={val}
                              fieldType={param.field_type}
                              unit={param.unit}
                              options={param.options}
                              locale={locale}
                              t={t}
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
                    className="border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted"
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
            <div id="trip-apply" className="scroll-mt-24 space-y-4 border border-line bg-surface p-6">
              {trip.price_amount ? (
                <div className="text-center">
                  <span className="font-display text-4xl font-extrabold text-ink">
                    {trip.price_currency} {Number(trip.price_amount).toFixed(0)}
                  </span>
                  <span className="text-sm text-ink-muted"> / {t("trips.detail.perPerson")}</span>
                </div>
              ) : (
                <div className="text-center">
                  <span className="font-display text-3xl font-extrabold text-accent">
                    {t("trips.detail.free")}
                  </span>
                  {trip.is_cost_sharing && (
                    <span className="mt-1 block text-xs text-ink-muted">
                      {t("trips.detail.withCostSharing")}
                    </span>
                  )}
                </div>
              )}

              {!isCancelled && (
              <div className="text-center text-sm text-ink-muted">
                <span
                  className={`font-bold ${spotsLeft > 0 ? "text-accent" : "text-[var(--color-danger)]"}`}
                >
                  {spotsLeft > 0
                    ? `${spotsLeft} ${t("trips.detail.spotsLeft")}`
                    : t("trips.detail.full")}
                </span>
                <span className="text-ink-muted"> / {trip.max_participants}</span>
              </div>
              )}

              {!isOrganizer && isCancelled && (
                <p className="flex min-h-[48px] w-full items-center justify-center gap-2 bg-line px-4 text-[15px] font-semibold text-ink-muted">
                  <Icon name="lock" size={18} />
                  {t("trips.deletion.applyClosed")}
                </p>
              )}

              {!isOrganizer && !isCancelled && (
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
                  className="block w-full border border-line-strong bg-surface py-3 text-center font-bold text-ink transition-colors hover:border-accent hover:text-accent"
                >
                  {t("trips.detail.edit")}
                </Link>
              )}
            </div>

            {/* Organizer Card */}
            {organizer && (
              <div className="border border-line bg-surface p-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  {t("trips.detail.organizer")}
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-on">
                    {(organizer.display_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-ink">
                      {organizer.display_name || t("common.user")}
                    </span>
                    {organizer.subscription_tier &&
                      organizer.subscription_tier !== "free" && (
                        <span className="ml-1.5 bg-[var(--color-primary-subtle)] px-1.5 py-0.5 text-xs font-medium text-accent">
                          {organizer.subscription_tier}
                        </span>
                      )}
                    {organizer.slug && (
                      <span className="block text-xs text-ink-muted">
                        @{organizer.slug}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Public Crew Card — only when there are crew positions */}
            {crewPositions.length > 0 && (
              <div className="space-y-3 border border-line bg-surface p-5">
                <h3 className="font-display text-2xl font-extrabold text-ink">
                  {t("trips.detail.crewCardTitle")}
                </h3>

                {teamTotal > 0 && (
                  <div className="flex items-center gap-2 bg-[var(--color-success-subtle)] px-3 py-2 text-xs font-semibold text-[var(--color-success-text)]">
                    <Icon name="users" size={14} />
                    <span>
                      {t("trips.detail.teamSetup")
                        .replace("{guests}", String(totalGuests))
                        .replace("{staff}", String(totalStaff))
                        .replace("{total}", String(teamTotal))}
                    </span>
                  </div>
                )}

                <ul className="space-y-3">
                  {crewPositions.map((pos: { id: string; role_name: string; spots: number; filled_spots: number }) => {
                    const filled = pos.filled_spots ?? 0;
                    const total = pos.spots ?? 0;
                    const ratio = total > 0 ? filled / total : 0;
                    const pct = Math.min(100, Math.round(ratio * 100));
                    const barColor =
                      ratio >= 1 ? "var(--color-success)" : ratio > 0 ? "var(--color-warning)" : "var(--color-border-strong)";
                    return (
                      <li key={pos.id} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-ink">{pos.role_name}</span>
                          <span className="text-xs tabular-nums text-ink-muted">{filled}/{total}</span>
                        </div>
                        <div className="h-1 overflow-hidden bg-line">
                          <div
                            className="h-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {!isOrganizer && !isCancelled && crewPositions.some((p: { spots: number; filled_spots: number }) => (p.filled_spots ?? 0) < (p.spots ?? 0)) && (
                  <div className="pt-1 text-sm font-semibold text-[var(--color-success-text)]">
                    {t("trips.detail.applyForPosition")}
                  </div>
                )}
                {crewPositions.every((p: { spots: number; filled_spots: number }) => (p.filled_spots ?? 0) >= (p.spots ?? 0)) && (
                  <div className="pt-1 text-xs text-ink-muted">
                    {t("trips.detail.allPositionsFilled")}
                  </div>
                )}
              </div>
            )}

            {/* Trip Meta */}
            <div className="space-y-3 border border-line bg-surface p-5 text-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {t("trips.detail.details")}
              </h3>
              <div className="flex justify-between">
                <span className="text-ink-muted">{t("trips.wizard.visibility")}</span>
                <span className="font-medium text-ink">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name={trip.visibility === "public" ? "globe" : trip.visibility === "followers_only" ? "users" : "lock"} size={14} />
                    {trip.visibility === "public"
                      ? t("trips.wizard.visPublic")
                      : trip.visibility === "followers_only"
                        ? t("trips.wizard.visFollowers")
                        : t("trips.wizard.visPrivate")}
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">{t("trips.detail.approval")}</span>
                <span className="font-medium text-ink">
                  {trip.require_approval
                    ? t("trips.detail.required")
                    : t("trips.detail.automatic")}
                </span>
              </div>
              {trip.registration_deadline && (
                <div className="flex justify-between">
                  <span className="text-ink-muted">{t("trips.wizard.registrationDeadline")}</span>
                  <span className="font-medium text-ink">
                    {trip.registration_deadline_date
                      ? t("trips.detail.registrationDeadlineUntil", {
                          date: formatLocalDate(String(trip.registration_deadline_date), dateLocale),
                          timezone: trip.timezone || "UTC",
                        })
                      : new Date(trip.registration_deadline).toLocaleDateString(dateLocale, { timeZone: "UTC" })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* StickyActionBar — Night, csak mobilon (Brand Guide v2 §6, UX-004; terv: #M0RLZp) */}
      {!isCancelled && (
        <div data-surface="night" className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-between gap-3 border-t border-line bg-surface px-4 pb-[env(safe-area-inset-bottom)] lg:hidden" data-testid="trip-sticky-bar">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-ink">
              {trip.price_amount ? `${Number(trip.price_amount).toFixed(0)} ${trip.price_currency} / ${t("trips.detail.perPerson")}` : t("trips.detail.free")}
            </span>
            <span className="text-xs text-ink-muted">{spotsLeft > 0 ? `${spotsLeft} ${t("trips.detail.spotsLeft")}` : t("trips.detail.full")}</span>
          </div>
          <a href="#trip-apply" className="inline-flex h-11 items-center bg-accent px-5 text-sm font-bold text-accent-on">
            {isOrganizer ? t("trips.detail.edit") : t("trips.detail.apply")}
          </a>
        </div>
      )}
    </main>
  );
}

// ── Helper Components ──

function DetailValue({
  value,
  fieldType,
  unit,
  options,
  locale,
  t,
}: {
  value: unknown;
  fieldType: string;
  unit: string | null;
  options: ParameterDisplayOption[];
  locale: string;
  t: (key: "common.yes" | "common.no") => string;
}) {
  if (typeof value === "boolean") {
    return value ? <Icon name="check-circle-2" size={16} className="text-[var(--color-success-text)]" label={t("common.yes")} /> : <Icon name="x-circle" size={16} className="text-[var(--color-danger)]" label={t("common.no")} />;
  }
  return <>{formatParameterValue(value, fieldType, unit, options, locale)}</>;
}
