"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Icon } from "@/components/Icon";


const NAV_ITEMS = [
  { href: "/settings/profile", icon: "user-circle", key: "settings.nav.editProfile" },
  { href: "/settings/interests", icon: "compass", key: "settings.nav.adventureInterests" },
  { href: "/settings/social", icon: "users", key: "settings.nav.socialNetworks" },
  { href: "/settings/privacy", icon: "shield", key: "settings.nav.privacy" },
] as const;

export function SettingsSidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <aside className="w-full shrink-0 lg:w-[260px]">
      <nav className="border border-line bg-surface p-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 border-l-4 px-5 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-accent bg-[var(--color-primary-subtle)] font-semibold text-ink"
                  : "border-transparent text-ink-muted hover:bg-canvas hover:text-ink"
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
