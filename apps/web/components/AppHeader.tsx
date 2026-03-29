"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ChevronDown, Home, Compass, Sparkles, Users, CreditCard } from "lucide-react";

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
  { key: "nav.discover", href: "/discover", icon: Compass },
  { key: "nav.features", href: "/#features", icon: Sparkles },
  { key: "nav.community", href: "/community", icon: Users },
  { key: "nav.pricing", href: "/pricing", icon: CreditCard },
] as const;

// ── Component ─────────────────────────────────────────────────────
export function AppHeader({ anchors, user }: AppHeaderProps) {
  const { t } = useTranslation();

  // Dropdown state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auth state
  const [authChecked, setAuthChecked] = useState(user !== undefined);
  const [resolvedUser, setResolvedUser] = useState(user ?? null);

  // Sync user prop (client components pass it async)
  useEffect(() => {
    if (user !== undefined) {
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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200">
      <div className="max-w-7xl mx-auto h-14 px-4 flex items-center">
        {/* ── BAL ZÓNA: Logo dropdown + Trevu home link ── */}
        <div className="flex items-center gap-1 shrink-0 relative" ref={menuRef}>
          {/* Logo icon = dropdown trigger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center hover:bg-teal-700 transition-colors"
            aria-label="Navigation menu"
            aria-expanded={menuOpen}
          >
            <span className="text-white font-bold text-sm">T</span>
            <ChevronDown
              className={`w-3 h-3 text-teal-200 ml-0.5 transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Trevu text = home link */}
          <Link href="/" className="font-bold text-base ml-1">
            <span className="text-teal-600">Tre</span>
            <span className="text-slate-900">vu</span>
          </Link>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-teal-600 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    {t(item.key as Parameters<typeof t>[0])}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── KÖZÉP ZÓNA: Kontextuális anchor linkek ── */}
        {anchors && anchors.length > 0 && (
          <nav className="hidden md:flex items-center gap-1 mx-auto">
            {anchors.map((anchor, i) => (
              <span key={anchor.href} className="flex items-center">
                {i > 0 && (
                  <span className="text-slate-300 mx-1.5">·</span>
                )}
                <a
                  href={anchor.href}
                  className="text-sm font-medium text-slate-500 hover:text-teal-600 transition-colors whitespace-nowrap"
                >
                  {anchor.label}
                </a>
              </span>
            ))}
          </nav>
        )}

        {/* Spacer when no anchors (push right zone to edge) */}
        {(!anchors || anchors.length === 0) && <div className="flex-1" />}

        {/* ── JOBB ZÓNA: Nyelv + User ── */}
        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitcher />

          {authChecked && isLoggedIn && (
            <>
              <Link
                href="/profile"
                className="h-8 px-3 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold shrink-0 hover:bg-teal-700 transition-colors"
                title={resolvedUser!.email}
              >
                {avatarText}
              </Link>
              <form action="/api/v1/auth/signout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-slate-500 hover:text-slate-700 transition-colors whitespace-nowrap"
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
                className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                {t("nav.logIn")}
              </Link>
              <Link
                href="/register"
                className="px-4 py-1.5 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors"
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
