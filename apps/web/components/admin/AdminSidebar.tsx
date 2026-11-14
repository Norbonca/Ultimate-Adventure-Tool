"use client";

import { BrandHead } from "@/components/brand/BrandMark";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Icon } from "@/components/Icon";

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
  const [menuOpen, setMenuOpen] = useState(false);

  const navGroups: NavGroup[] = [
    {
      label: t("admin.nav.operations"),
      items: [
        { key: "alerts", label: t("admin.nav.alerts"), href: "/admin/alerts", icon: "bell", badge: 3, comingSoon: true },
        { key: "users", label: t("admin.nav.users"), href: "/admin/users", icon: "users" },
        { key: "trips", label: t("admin.nav.trips"), href: "/admin/trips", icon: "backpack" },
        { key: "ideas", label: t("admin.nav.ideas"), href: "/admin/ideas", icon: "lightbulb" }, // M22 moderáció
        { key: "routes", label: t("admin.nav.routes"), href: "/admin/routes", icon: "map", comingSoon: true },
        { key: "support", label: t("admin.nav.support"), href: "/admin/support", icon: "ticket", comingSoon: true },
      ],
    },
    {
      label: t("admin.nav.dashboards"),
      items: [
        { key: "overview", label: t("admin.nav.overview"), href: "/admin", icon: "layout-dashboard" },
        { key: "traffic", label: t("admin.nav.traffic"), href: "/admin/traffic", icon: "trending-up", comingSoon: true },
        { key: "finance", label: t("admin.nav.finance"), href: "/admin/finance", icon: "wallet", comingSoon: true },
        // M151 — a „Teljesítmény” (p95, hibaarány) V2; az állapot V1-e él (design/D15_Admin.pen#ihHfu)
        { key: "system", label: t("admin.nav.system"), href: "/admin/system", icon: "activity" },
      ],
    },
    {
      label: t("admin.nav.configuration"),
      items: [
        { key: "tripConfig", label: t("admin.nav.tripConfig"), href: "/admin/trip-config", icon: "settings-2" },
        { key: "calendar", label: t("admin.nav.calendar"), href: "/admin/calendar", icon: "calendar" },
        { key: "fx", label: t("admin.nav.fx"), href: "/admin/fx", icon: "banknote" },
        { key: "adminUsers", label: t("admin.nav.adminUsers"), href: "/admin/admin-users", icon: "shield" },
        { key: "settings", label: t("admin.nav.settings"), href: "/admin/settings", icon: "wrench", comingSoon: true },
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
    <>
      {/* M151 — mobil felső sáv (design/D15_Admin.pen#oDiPb): 768 px alatt az oldalsáv fiókként nyílik */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-slate-900 px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-controls="admin-sidebar"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-md text-white"
        >
          <Icon name="menu" size={22} label={t("admin.header.openMenu")} />
        </button>
        <span className="text-[15px] font-semibold text-white">{t("admin.header.title")}</span>
      </div>
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/60 md:hidden" aria-hidden="true" onClick={() => setMenuOpen(false)} />
      )}
    <aside
      id="admin-sidebar"
      className={`${menuOpen ? "fixed inset-y-0 left-0 z-50 flex" : "hidden"} w-60 min-h-screen bg-slate-900 flex-col shrink-0 md:static md:flex`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) setMenuOpen(false);
      }}
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-trevu-500 flex items-center justify-center text-slate-900">
            <BrandHead height={20} />
          </div>
          <span className="text-white font-semibold text-sm tracking-wide">
            {t("admin.header.title")}
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-md text-slate-400 hover:text-white md:hidden"
          >
            <Icon name="x" size={20} label={t("admin.header.closeMenu")} />
          </button>
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
                        <Icon name={item.icon} size={16} className="w-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-sm">
                          {t("admin.comingSoon")}
                        </span>
                      </span>
                    ) : (
                      <Link
                        href={item.href}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors ${
                          isActive
                            ? "bg-trevu-500/20 text-trevu-400"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <Icon name={item.icon} size={16} className="w-4 shrink-0" />
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
          <div className="w-8 h-8 rounded-full bg-trevu-500 flex items-center justify-center text-slate-900 text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{displayName}</p>
            <p className="text-slate-500 text-[11px] truncate">{user?.email}</p>
          </div>
          <Link
            href="/api/v1/auth/signout"
            className="text-slate-500 hover:text-white transition-colors text-sm"
            title={t("auth.logout")}
          >
            →
          </Link>
        </div>
      </div>
    </aside>
    </>
  );
}
