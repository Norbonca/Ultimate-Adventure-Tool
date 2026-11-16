"use client";

import { BRAND } from "@uat/config";
import { BrandHead, BrandWordmark } from "@/components/brand/BrandMark";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ChevronDown } from "@/lib/icons";
import { NAV_ITEMS, visibleNavItems } from "@/lib/nav/items";
import { useAuthUser } from "@/lib/nav/useAuthUser";

// ── Types ──────────────────────────────────────────────────────────
interface AppHeaderProps {
  /** Contextual anchor links for the center zone */
  /** User info — pass from server component to skip client-side fetch */
  user?: {
    email: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
  } | null;
}

// ── Component ─────────────────────────────────────────────────────
export function AppHeader({ user }: AppHeaderProps) {
  const { t } = useTranslation();
  const pathname = usePathname();

  // Dropdown state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Belépési állapot — a prop az igazság, ha a szülő adta; különben a közös kliensoldali ellenőrzés.
  const { checked: authChecked, user: resolvedUser } = useAuthUser(user);

  // Close dropdown on outside click or ESC
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const isLoggedIn = !!resolvedUser;

  // Avatar: first name > monogram > email initial
  const avatarText = resolvedUser?.firstName
    ? resolvedUser.firstName
    : resolvedUser?.displayName
      ? resolvedUser.displayName
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : resolvedUser?.email?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <header data-surface="night" className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 night:bg-glass night:border-line">
      <div className="max-w-7xl mx-auto h-14 px-4 flex items-center">
        {/* ── BAL ZÓNA: márkajel (menügomb) + szójel (home link) ── */}
        <div className="flex items-center gap-1 shrink-0 relative" ref={menuRef}>
          {/* Logo icon = dropdown trigger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="h-9 pl-1.5 pr-1 bg-teal-600 rounded-lg flex items-center justify-center gap-0.5 text-white hover:bg-teal-700 transition-colors night:bg-accent night:hover:bg-accent-hover night:text-accent-on"
            aria-label={t('nav.menuLabel')}
            aria-expanded={menuOpen}
          >
            <BrandHead height={22} />
            <ChevronDown
              className={`w-3 h-3 text-teal-200 night:text-accent-on ml-0.5 transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Szójel = home link (a név a márkakonfigurációból: aria-label) */}
          <Link href="/" className="ml-1.5 text-slate-900 night:text-ink sm:ml-2" aria-label={BRAND.name}>
            <BrandWordmark height={20} decorative className="h-4 w-auto sm:h-5" />
          </Link>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 night:bg-surface night:border-line night:shadow-none">
              {visibleNavItems(isLoggedIn).map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-teal-600 transition-colors night:text-ink-body night:hover:bg-ghost night:hover:text-accent"
                  >
                    <Icon className="w-4 h-4 text-slate-400 night:text-ink-muted" />
                    {t(item.key as Parameters<typeof t>[0])}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── KÖZÉP ZÓNA: a fő navigáció a NAV_ITEMS elvei szerint — kijelentkezve
            Túrák felfedezése · Mi a {brand}?; belépve Túrák felfedezése · Túratervező · Közösség ·
            Útmutatók · Mi a {brand}?. Az `anchors` prop nem befolyásolja a középső zónát. */}
        <nav className="hidden lg:flex items-center gap-1 mx-auto" data-testid="header-nav">
          {NAV_ITEMS.filter((item) => item.center && (!item.auth || (authChecked && isLoggedIn))).map((item, i) => {
            const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
            return (
              <span key={item.href} className="flex items-center">
                {i > 0 && (
                  <span className="text-slate-300 mx-1.5 night:text-line-strong">·</span>
                )}
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`text-sm transition-colors whitespace-nowrap ${
                    active
                      ? "font-semibold text-teal-600 night:text-accent"
                      : "font-medium text-slate-500 hover:text-teal-600 night:text-ink-secondary night:hover:text-accent"
                  }`}
                >
                  {t(item.key as Parameters<typeof t>[0])}
                </Link>
              </span>
            );
          })}
        </nav>

        {/* ── JOBB ZÓNA: Nyelv + User ── */}
        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          {/* 390 px-en a magyar „Bejelentkezés · Regisztráció” is elfér: tömör nyelvváltó, kisebb rések */}
          <LanguageSwitcher />

          {authChecked && isLoggedIn && (
            <>
              <Link
                href="/profile"
                className="h-8 px-3 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold shrink-0 hover:bg-teal-700 transition-colors night:bg-accent night:text-accent-on night:hover:bg-accent-hover"
                title={resolvedUser!.email}
              >
                {avatarText}
              </Link>
              <form action="/api/v1/auth/signout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-slate-500 hover:text-slate-700 transition-colors whitespace-nowrap night:text-ink-secondary night:hover:text-ink"
                >
                  {t("auth.logout")}
                </button>
              </form>
            </>
          )}

          {authChecked && !isLoggedIn && (
            <>
              <Link
                href="/login"
                className="whitespace-nowrap text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors night:text-ink-body night:hover:text-ink"
              >
                {t("nav.logIn")}
              </Link>
              <Link
                href="/register"
                className="whitespace-nowrap px-3 sm:px-4 py-1.5 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors night:bg-accent night:text-accent-on night:hover:bg-accent-hover"
              >
                {t("nav.signUp")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
