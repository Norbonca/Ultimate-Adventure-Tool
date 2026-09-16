// Design: D15_Admin.pen — `CMUG6` "Admin / User Detail" (breadcrumb, header, Personal Information, Trip History).
// The right column (Financial Summary, Admin Notes, Support Tickets) waits for the M04/M15 data sources.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { TranslationKey } from "@uat/i18n";
import { getServerT } from "@/lib/i18n/server";
import { Icon } from "@/components/Icon";
import { getAdminUserDetail } from "../../actions";
import { UserDetailActions } from "./user-detail-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

const PARTICIPANT_STATUS_KEY: Record<string, TranslationKey> = {
  pending: "trips.participantStatus.pending",
  approved: "trips.participantStatus.approved",
  approved_pending_payment: "trips.participantStatus.approvedPendingPayment",
  participant: "trips.participantStatus.participant",
  rejected: "trips.participantStatus.rejected",
  waitlisted: "trips.participantStatus.waitlisted",
  cancelled: "trips.participantStatus.cancelled",
};

const TRIP_STATUS_KEY: Record<string, TranslationKey> = {
  draft: "trips.status.draft",
  published: "trips.status.published",
  registration_open: "trips.status.registrationOpen",
  active: "trips.status.active",
  completed: "trips.status.completed",
  cancelled: "trips.status.cancelled",
  archived: "trips.status.archived",
};

const TRIP_STATUS_CLASS: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700",
  published: "bg-emerald-100 text-emerald-700",
  registration_open: "bg-emerald-100 text-emerald-700",
  active: "bg-blue-100 text-blue-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
  archived: "bg-slate-100 text-slate-500",
};

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { t, locale } = await getServerT();
  const user = await getAdminUserDetail(id);
  if (!user) notFound();

  const dateLocale = locale === "en" ? "en-US" : "hu-HU";
  const fmtDate = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat(dateLocale, { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso)) : "—";
  const fmtDateTime = (iso: string) =>
    new Intl.DateTimeFormat(dateLocale, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const fmtRange = (start: string | null, end: string | null) => {
    if (!start) return "—";
    const f = new Intl.DateTimeFormat(dateLocale, { year: "numeric", month: "short", day: "numeric" });
    return end && end !== start ? `${f.format(new Date(start))} – ${f.format(new Date(end))}` : f.format(new Date(start));
  };

  const fullName = [user.last_name, user.first_name].filter(Boolean).join(" ");
  const name = user.display_name || fullName || user.email || user.id.slice(0, 8);
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const plan =
    user.subscription_tier === "pro" ? t("admin.users.planPro")
    : user.subscription_tier === "business" ? t("admin.users.planBusiness")
    : t("admin.users.planFree");
  const planClass =
    user.subscription_tier === "pro" ? "bg-violet-100 text-violet-700"
    : user.subscription_tier === "business" ? "bg-amber-100 text-amber-700"
    : "bg-slate-100 text-slate-600";
  const location = [user.location_city, user.country_code].filter(Boolean).join(", ");

  const fields: { label: string; value: string }[] = [
    { label: t("admin.users.detailFullName"), value: fullName || "—" },
    { label: t("admin.users.detailEmail"), value: user.email || "—" },
    { label: t("admin.users.detailPhone"), value: user.phone || "—" },
    { label: t("admin.users.detailLastLogin"), value: user.last_sign_in_at ? fmtDateTime(user.last_sign_in_at) : t("admin.users.detailNeverLoggedIn") },
    { label: t("admin.users.detailRegistered"), value: fmtDate(user.created_at) },
    { label: t("admin.users.detailLocation"), value: location || "—" },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm">
        <Link href="/admin/users" className="text-slate-500 hover:text-emerald-600">
          {t("admin.users.title")}
        </Link>
        <Icon name="chevron-right" size={14} className="text-slate-400" />
        <span className="text-slate-900 font-medium">{name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl font-bold">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-slate-500">
              <span>{user.email}</span>
              <span aria-hidden="true" className="w-1 h-1 rounded-full bg-slate-300" />
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${planClass}`}>{plan}</span>
              <span aria-hidden="true" className="w-1 h-1 rounded-full bg-slate-300" />
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.is_banned ? "text-red-600" : "text-emerald-600"}`}>
                <span aria-hidden="true" className={`w-2 h-2 rounded-full ${user.is_banned ? "bg-red-500" : "bg-emerald-500"}`} />
                {user.is_banned ? t("admin.users.statusBanned") : t("admin.users.statusActive")}
              </span>
            </div>
          </div>
        </div>
        <UserDetailActions
          userId={user.id}
          userName={name}
          isBanned={user.is_banned}
          labels={{
            ban: t("admin.users.banUser"),
            unban: t("admin.users.unbanUser"),
            banSuccess: t("admin.users.banSuccess"),
            unbanSuccess: t("admin.users.unbanSuccess"),
            modal: {
              title: t("admin.users.banTitle"),
              reason: t("admin.users.banReason"),
              reasonPlaceholder: t("admin.users.banReasonPlaceholder"),
              duration: t("admin.users.banDuration"),
              day1: t("admin.users.banTemp1day"),
              days7: t("admin.users.banTemp7days"),
              days30: t("admin.users.banTemp30days"),
              permanent: t("admin.users.banPermanent"),
              confirm: t("admin.users.banConfirm"),
              cancel: t("common.cancel"),
            },
          }}
        />
      </div>

      {/* Personal information */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-5">{t("admin.users.detailPersonalInfo")}</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {fields.map((field) => (
            <div key={field.label}>
              <dt className="text-xs text-slate-500">{field.label}</dt>
              <dd className="text-sm font-medium text-slate-900 mt-1 break-words">{field.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Trip history */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-slate-900">{t("admin.users.detailTripHistory")}</h2>
          <span className="text-xs text-slate-500">{t("admin.users.detailTripCount", { count: user.trips.length })}</span>
        </div>
        {user.trips.length === 0 ? (
          <p className="text-sm text-slate-500 py-3">{t("admin.users.detailNoTrips")}</p>
        ) : (
          <ul>
            {user.trips.map((trip) => (
              <li key={trip.id} className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-b-0">
                <div className="min-w-0">
                  <Link href={`/trips/${trip.slug}`} target="_blank" className="text-sm font-medium text-slate-900 hover:text-emerald-600 truncate block">
                    {trip.title}
                  </Link>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {trip.role === "organizer" ? t("trips.detail.organizer") : t(PARTICIPANT_STATUS_KEY[trip.role] ?? "trips.participantStatus.pending")}
                    {"  ·  "}
                    {fmtRange(trip.start_date, trip.end_date)}
                  </p>
                </div>
                <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${TRIP_STATUS_CLASS[trip.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {TRIP_STATUS_KEY[trip.status] ? t(TRIP_STATUS_KEY[trip.status]) : trip.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
