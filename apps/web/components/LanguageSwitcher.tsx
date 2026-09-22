"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";
import type { Locale } from "@uat/i18n";

interface LanguageSwitcherProps {
  /** Visual variant */
  variant?: "compact" | "full";
  /** Custom className */
  className?: string;
}

const FLAG: Record<Locale, string> = {
  hu: "🇭🇺",
  en: "🇬🇧",
};

const LABEL: Record<Locale, string> = {
  hu: "Magyar",
  en: "English",
};

/**
 * Language switcher toggle.
 * Compact: shows flag + code, toggles on click.
 * Full: shows both options side by side.
 */
export function LanguageSwitcher({ variant = "compact", className = "" }: LanguageSwitcherProps) {
  const { locale, switchLocale, supportedLocales } = useTranslation();

  if (variant === "full") {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {supportedLocales.map((loc) => (
          <button
            key={loc}
            onClick={() => switchLocale(loc)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              locale === loc
                ? "bg-accent text-accent-on"
                : "text-ink-muted hover:bg-ghost hover:text-ink"
            }`}
          >
            {FLAG[loc]} {LABEL[loc]}
          </button>
        ))}
      </div>
    );
  }

  // Compact: toggle between locales
  const nextLocale = locale === "hu" ? "en" : "hu";

  return (
    <button
      onClick={() => switchLocale(nextLocale)}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-ghost hover:text-ink ${className}`}
      title={LABEL[nextLocale]}
    >
      {FLAG[locale]} <span className="uppercase text-xs font-bold">{locale}</span>
    </button>
  );
}
