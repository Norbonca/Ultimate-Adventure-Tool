import { getServerT } from "@/lib/i18n/server";
import { getAdminStats } from "./actions";

export default async function AdminDashboardPage() {
  const { t } = await getServerT();
  const stats = await getAdminStats();

  const kpiCards = [
    {
      label: t("admin.dashboard.totalUsers"),
      value: stats.totalUsers.toLocaleString(),
      trend: "+2.5%",
      trendUp: true,
      icon: "👥",
      color: "bg-blue-50 border-blue-200",
      iconBg: "bg-blue-100",
    },
    {
      label: t("admin.dashboard.newSignups"),
      value: stats.newSignups.toLocaleString(),
      trend: "+4.2%",
      trendUp: true,
      icon: "✨",
      color: "bg-emerald-50 border-emerald-200",
      iconBg: "bg-emerald-100",
    },
    {
      label: t("admin.dashboard.activeTrips"),
      value: stats.activeTrips.toLocaleString(),
      trend: "+1.8%",
      trendUp: true,
      icon: "🏔️",
      color: "bg-violet-50 border-violet-200",
      iconBg: "bg-violet-100",
    },
    {
      label: t("admin.dashboard.monthlyRevenue"),
      value: "—",
      trend: "",
      trendUp: true,
      icon: "💰",
      color: "bg-amber-50 border-amber-200",
      iconBg: "bg-amber-100",
      note: t("admin.comingSoon"),
    },
    {
      label: t("admin.dashboard.conversionRate"),
      value: "—",
      trend: "",
      trendUp: false,
      icon: "📈",
      color: "bg-rose-50 border-rose-200",
      iconBg: "bg-rose-100",
      note: t("admin.comingSoon"),
    },
    {
      label: t("admin.dashboard.openTickets"),
      value: "—",
      trend: "",
      trendUp: false,
      icon: "🎫",
      color: "bg-orange-50 border-orange-200",
      iconBg: "bg-orange-100",
      note: t("admin.comingSoon"),
    },
  ];

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {t("admin.dashboard.title")}
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          {t("admin.dashboard.subtitle")}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className={`p-4 rounded-xl border ${card.color} flex flex-col gap-2`}
          >
            <div className="flex items-center justify-between">
              <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center text-base`}>
                {card.icon}
              </div>
              {card.trend && (
                <span
                  className={`text-xs font-medium ${
                    card.trendUp ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {card.trend}
                </span>
              )}
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{card.note || card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart placeholder */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">
              {t("admin.dashboard.revenueOverview")}
            </h2>
            <div className="flex gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                {t("admin.dashboard.revenue")}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
                {t("admin.dashboard.subscriptions")}
              </span>
            </div>
          </div>
          <div className="h-48 flex items-center justify-center bg-slate-50 rounded-lg">
            <p className="text-slate-400 text-sm">
              {t("admin.comingSoon")} — M04 Payment modul
            </p>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">
              {t("admin.dashboard.recentActivity")}
            </h2>
            <a
              href="/admin/users"
              className="text-xs text-emerald-600 hover:underline"
            >
              {t("admin.dashboard.viewAll")}
            </a>
          </div>
          <div className="space-y-3">
            {[
              { text: "Új felhasználó regisztrált", time: "5 perce", icon: "👤" },
              { text: "Túra publikálva", time: "12 perce", icon: "🏔️" },
              { text: "Regisztráció megerősítve", time: "28 perce", icon: "✅" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-base mt-0.5">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">{item.text}</p>
                  <p className="text-xs text-slate-400">{item.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick links */}
          <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
            <a
              href="/admin/users"
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600 transition-colors"
            >
              <span>👥</span>
              <span>
                {stats.totalUsers} {t("admin.nav.users")}
              </span>
            </a>
            <a
              href="/admin/trips"
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600 transition-colors"
            >
              <span>🏔️</span>
              <span>
                {stats.activeTrips} {t("admin.nav.trips")}
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
