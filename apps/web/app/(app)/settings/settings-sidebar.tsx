"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Icon } from "@/components/Icon";


// UX-018 (2026-10-30): a működő /settings/skills és /settings/password oldal eddig csak URL-ről volt
// elérhető — mindkettő az oldalsávba került (Nielsen #6, WCAG 2.4.5). A sorrend a D01 beállítási
// oldalsáv rendjét követi; a két új sor Pencil-terve utólag vezetendő át (DESIGN-FIRST kivétel, hibajavítás).
const NAV_ITEMS = [
  { href: "/settings/profile", icon: "user-circle", key: "settings.nav.editProfile" },
  { href: "/settings/interests", icon: "compass", key: "settings.nav.adventureInterests" },
  { href: "/settings/skills", icon: "badge-check", key: "settings.nav.skillsExperience" },
  { href: "/settings/social", icon: "users", key: "settings.nav.socialNetworks" },
  { href: "/settings/password", icon: "key-round", key: "settings.nav.password" },
  { href: "/settings/privacy", icon: "shield", key: "settings.nav.privacy" },
] as const;

export function SettingsSidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <aside className="w-full min-w-0 shrink-0 lg:w-[260px]">
      <nav className="rounded-2xl border border-navy-200 bg-white py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl mx-1 px-5 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-trevu-50 text-trevu-700 font-semibold"
                  : "text-navy-500 hover:bg-navy-50 hover:text-navy-700"
              }`}
            >
              <Icon name={item.icon} size={18} />
              {t(item.key as Parameters<typeof t>[0])}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
