"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";


const NAV_ITEMS = [
  { href: "/settings/profile", icon: "👤", key: "settings.nav.editProfile" },
  { href: "/settings/interests", icon: "🧭", key: "settings.nav.adventureInterests" },
  { href: "/settings/social", icon: "👥", key: "settings.nav.socialNetworks" },
  { href: "/settings/privacy", icon: "🛡️", key: "settings.nav.privacy" },
] as const;

export function SettingsSidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <aside className="w-[260px] shrink-0">
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
              <span className="text-base">{item.icon}</span>
              {t(item.key as Parameters<typeof t>[0])}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
