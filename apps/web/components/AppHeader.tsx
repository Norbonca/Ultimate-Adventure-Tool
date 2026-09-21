"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ChevronDown, Home, Sparkles, Users, CreditCard, Map } from "@/lib/icons";

// ── Types ──────────────────────────────────────────────────────────
interface AnchorLink {
  label: string;
  href: string;
}

interface AppHeaderProps {
  /** Contextual anchor links for the center zone */
  anchors?: AnchorLink[];
  /** User info — pass from server component to skip client-side fetch */
  user?: {
    email: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
  } | null;
}

// ── Navigation menu items (static) ────────────────────────────────
const NAV_ITEMS = [
  { key: "nav.home", href: "/", icon: Home },
  { key: "nav.tripPlanner", href: "/trips", icon: Map },
  { key: "nav.getStarted", href: "/get-started", icon: Sparkles },
  { key: "nav.community", href: "/community", icon: Users },
  { key: "nav.pricing", href: "/pricing", icon: CreditCard },
] as const;

// ── Belső funkciók menüje — a KÖZÉP zóna alapértelmezett tartalma
// bejelentkezve, minden app-oldalon (spec 1.4).
// Túratervező = M02 túraszervezés (a My Trips oldalról indul);
// nem keverendő az M20 Utazástervezővel (per-túra oda-/hazaút tervezés).
const INTERNAL_NAV = [
  { key: "nav.tripPlanner", href: "/trips" },
  { key: "nav.community", href: "/community" },
] as const;

// ── Component ─────────────────────────────────────────────────────
export function AppHeader({ anchors, user }: AppHeaderProps) {
  const { t } = useTranslation();
  const pathname = usePathname();

  // Dropdown state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auth state
  const [authChecked, setAuthChecked] = useState(user !== undefined);
  const [resolvedUser, setResolvedUser] = useState(user ?? null);

  // Sync user prop (client components pass it async)
  useEffect(() => {
    if (user !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only bootstrap/sync on mount; a proper rewrite (derive-during-render / useSyncExternalStore) is tracked as an open question (2026-08-29)
      setResolvedUser(user);
      setAuthChecked(true);
    }
  }, [user]);

  // Client-side auth check if no user prop
  useEffect(() => {
    if (user !== undefined) return;
    fetch("/api/v1/auth/check")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.authenticated && d?.email) {
          setResolvedUser({
            email: d.email,
            displayName: d.displayName ?? undefined,
            firstName: d.firstName ?? undefined,
            lastName: d.lastName ?? undefined,
          });
        }
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    <header className="sticky top-0 z-50 border-b border-line bg-glass backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center px-4 sm:px-6 lg:px-10">
        {/* ── BAL ZÓNA: Logo dropdown + Trevu home link ── */}
        <div className="flex items-center gap-1 shrink-0 relative" ref={menuRef}>
          {/* Logo icon = dropdown trigger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center bg-accent transition-colors hover:bg-accent-hover"
            aria-label={t('nav.menuLabel')}
            aria-expanded={menuOpen}
          >
            <span className="text-sm font-bold text-accent-on">T</span>
            <ChevronDown
              className={`ml-0.5 h-3 w-3 text-accent-on transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Trevu text = home link */}
          <Link href="/" className="ml-2 font-display text-xl font-bold leading-none tracking-tight text-ink">
            <span>tre</span>
            <span className="text-accent">vu</span>
          </Link>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-56 border border-line-strong bg-surface py-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-body transition-colors hover:bg-ghost hover:text-accent"
                  >
                    <Icon className="h-4 w-4 text-ink-muted" />
                    {t(item.key as Parameters<typeof t>[0])}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── KÖZÉP ZÓNA: belső navigáció ──
            Publikus oldal explicit anchorokat ad át; különben bejelentkezve
            a belső funkciók menüje (My Trips · Travel Planner · Community). */}
        {anchors && anchors.length > 0 ? (
          <nav className="hidden md:flex items-center gap-1 mx-auto">
            {anchors.map((anchor, i) => {
              const active = anchor.href === "/"
                ? pathname === "/"
                : !anchor.href.startsWith("#") && pathname?.startsWith(anchor.href);
              return (
                <span key={anchor.href} className="flex items-center">
                  {i > 0 && (
                    <span className="mx-1.5 text-line-strong">·</span>
                  )}
                  <a
                    href={anchor.href}
                    className={`text-sm transition-colors whitespace-nowrap ${
                      active
                        ? "font-semibold text-accent"
                        : "font-medium text-ink-muted hover:text-accent"
                    }`}
                  >
                    {anchor.label}
                  </a>
                </span>
              );
            })}
          </nav>
        ) : authChecked && isLoggedIn ? (
          <nav className="hidden md:flex items-center gap-1 mx-auto">
            {INTERNAL_NAV.map((item, i) => {
              const active = pathname?.startsWith(item.href);
              return (
                <span key={item.href} className="flex items-center">
                  {i > 0 && (
                    <span className="mx-1.5 text-line-strong">·</span>
                  )}
                  <Link
                    href={item.href}
                    className={`text-sm transition-colors whitespace-nowrap ${
                      active
                        ? "font-semibold text-accent"
                        : "font-medium text-ink-muted hover:text-accent"
                    }`}
                  >
                    {t(item.key as Parameters<typeof t>[0])}
                  </Link>
                </span>
              );
            })}
          </nav>
        ) : (
          <div className="flex-1" />
        )}

        {/* ── JOBB ZÓNA: Nyelv + User ── */}
        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitcher />

          {authChecked && isLoggedIn && (
            <>
              <Link
                href="/profile"
                className="flex h-8 shrink-0 items-center justify-center rounded-full bg-accent px-3 text-sm font-bold text-accent-on transition-colors hover:bg-accent-hover"
                title={resolvedUser!.email}
              >
                {avatarText}
              </Link>
              <form action="/api/v1/auth/signout" method="POST">
                <button
                  type="submit"
                  className="whitespace-nowrap text-sm text-ink-secondary transition-colors hover:text-ink"
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
                className="text-sm font-medium text-ink-body transition-colors hover:text-ink"
              >
                {t("nav.logIn")}
              </Link>
              <Link
                href="/register"
                className="bg-accent px-4 py-2 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover"
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
