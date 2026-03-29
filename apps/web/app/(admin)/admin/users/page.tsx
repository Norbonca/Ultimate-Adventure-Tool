import { getServerT } from "@/lib/i18n/server";
import { getAdminUsers, banUser, unbanUser } from "../actions";
import { AdminUsersClient } from "./users-client";

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; status?: string; plan?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const { t, locale } = await getServerT();
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const search = params.search ?? "";
  const status = params.status ?? "";
  const plan = params.plan ?? "";

  const { users, total } = await getAdminUsers({ page, search, status, plan });

  const totalPages = Math.ceil(total / 25);

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t("admin.users.title")}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {t("admin.users.subtitle")}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: t("admin.users.totalUsers"), value: total, color: "text-slate-900" },
          { label: t("admin.users.activeUsers"), value: users.filter((u) => !u.is_banned).length, color: "text-emerald-600" },
          { label: t("admin.users.suspendedUsers"), value: users.filter((u) => u.is_banned).length, color: "text-red-600" },
          { label: t("admin.users.newThisMonth"), value: "—", color: "text-blue-600" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      <AdminUsersClient
        users={users}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        status={status}
        plan={plan}
        locale={locale}
        t_users_title={t("admin.users.title")}
        t_search_placeholder={t("admin.users.searchPlaceholder")}
        t_filter_status={t("admin.users.filterStatus")}
        t_filter_plan={t("admin.users.filterPlan")}
        t_col_user={t("admin.users.colUser")}
        t_col_status={t("admin.users.colStatus")}
        t_col_plan={t("admin.users.colPlan")}
        t_col_registered={t("admin.users.colRegistered")}
        t_col_trips={t("admin.users.colTrips")}
        t_col_revenue={t("admin.users.colRevenue")}
        t_view_details={t("admin.users.viewDetails")}
        t_ban_user={t("admin.users.banUser")}
        t_unban_user={t("admin.users.unbanUser")}
        t_status_active={t("admin.users.statusActive")}
        t_status_banned={t("admin.users.statusBanned")}
        t_plan_free={t("admin.users.planFree")}
        t_plan_pro={t("admin.users.planPro")}
        t_plan_business={t("admin.users.planBusiness")}
        t_showing_of={t("admin.users.showingOf")}
        t_no_results={t("admin.noResults")}
        t_ban_title={t("admin.users.banTitle")}
        t_ban_reason={t("admin.users.banReason")}
        t_ban_reason_placeholder={t("admin.users.banReasonPlaceholder")}
        t_ban_duration={t("admin.users.banDuration")}
        t_ban_1day={t("admin.users.banTemp1day")}
        t_ban_7days={t("admin.users.banTemp7days")}
        t_ban_30days={t("admin.users.banTemp30days")}
        t_ban_permanent={t("admin.users.banPermanent")}
        t_ban_confirm={t("admin.users.banConfirm")}
        t_ban_success={t("admin.users.banSuccess")}
        t_unban_success={t("admin.users.unbanSuccess")}
        t_cancel={t("common.cancel")}
      />
    </div>
  );
}
