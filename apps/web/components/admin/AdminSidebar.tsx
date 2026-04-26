"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface AdminSidebarProps {
  user: {
    email: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
  } | null;
}

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: string;
  badge?: number;
  comingSoon?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navGroups: NavGroup[] = [
    {
      label: t("admin.nav.operations"),
      items: [
        { key: "alerts", label: t("admin.nav.alerts"), href: "/admin/alerts", icon: "🔔", badge: 3, comingSoon: true },
        { key: "users", label: t("admin.nav.users"), href: "/admin/users", icon: "👥" },
        { key: "trips", label: t("admin.nav.trips"), href: "/admin/trips", icon: "🏔️" },
        { key: "routes", label: t("admin.nav.routes"), href: "/admin/routes", icon: "🗺️", comingSoon: true },
        { key: "support", label: t("admin.nav.support"), href: "/admin/support", icon: "🎫", comingSoon: true },
      ],
    },
    {
      label: t("admin.nav.dashboards"),
      items: [
        { key: "overview", label: t("admin.nav.overview"), href: "/admin", icon: "📊" },
        { key: "traffic", label: t("admin.nav.traffic"), href: "/admin/traffic", icon: "📈", comingSoon: true },
        { key: "finance", label: t("admin.nav.finance"), href: "/admin/finance", icon: "💰", comingSoon: true },
        { key: "performance", label: t("admin.nav.performance"), href: "/admin/performance", icon: "⚡", comingSoon: true },
      ],
    },
    {
      label: t("admin.nav.configuration"),
      items: [
        { key: "tripConfig", label: t("admin.nav.tripConfig"), href: "/admin/trip-config", icon: "⚙️" },
        { key: "adminUsers", label: t("admin.nav.adminUsers"), href: "/admin/admin-users", icon: "🛡️" },
        { key: "settings", label: t("admin.nav.settings"), href: "/admin/settings", icon: "🔧", comingSoon: true },
      ],
    },
  ];

  const initials = user
    ? user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user.displayName
        ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
        : user.email[0].toUpperCase()
    : "?";

  const displayName = user?.firstName
    ? user.firstName
    : user?.displayName || user?.email || "";

  return (
    <aside className="w-60 min-h-screen bg-slate-900 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
            T
          </div>
          <span className="text-white font-semibold text-sm tracking-wide">
            {t("admin.header.title")}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);

                return (
                  <li key={item.key}>
                    {item.comingSoon ? (
                      <span className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-slate-500 cursor-not-allowed text-sm">
                        <span className="text-base leading-none w-4 text-center">{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                          {t("admin.comingSoon")}
                        </span>
                      </span>
                    ) : (
                      <Link
                        href={item.href}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors ${
                          isActive
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span className="text-base leading-none w-4 text-center">{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{displayName}</p>
            <p className="text-slate-500 text-[11px] truncate">{user?.email}</p>
          </div>
          <Link
            href="/api/v1/auth/signout"
            className="text-slate-500 hover:text-white transition-colors text-sm"
            title="Kijelentkezés"
          >
            →
          </Link>
        </div>
      </div>
    </aside>
  );
}
