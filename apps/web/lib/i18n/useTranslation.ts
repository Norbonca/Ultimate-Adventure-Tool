"use client";

import { useState, useCallback, useEffect } from "react";
import {
  t as translate,
  setLocale,
  getLocale,
  getSection,
  type Locale,
  type TranslationKey,
  type TranslationKeys,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
} from "@uat/i18n";

/**
 * React hook for i18n translations.
 *
 * @example
 *   const { t, locale, switchLocale } = useTranslation();
 *   <h1>{t('auth.loginTitle')}</h1>
 *   <button onClick={() => switchLocale('en')}>EN</button>
 */
export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(getLocale());

  // Sync with browser/user preference on mount
  useEffect(() => {
    // Check localStorage first (user's explicit choice)
    const stored = localStorage.getItem("trevu-locale") as Locale | null;
    if (stored && SUPPORTED_LOCALES.includes(stored)) {
      setLocale(stored);
      setLocaleState(stored);
      document.documentElement.lang = stored;
      return;
    }

    // Fall back to browser language
    const browserLang = navigator.language.split("-")[0] as Locale;
    if (SUPPORTED_LOCALES.includes(browserLang)) {
      setLocale(browserLang);
      setLocaleState(browserLang);
      document.documentElement.lang = browserLang;
    }
  }, []);

  const switchLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    setLocaleState(newLocale);
    localStorage.setItem("trevu-locale", newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      return translate(key, params);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  );

  const section = useCallback(
    <K extends keyof TranslationKeys>(sectionName: K) => {
      return getSection(sectionName, locale);
    },
    [locale]
  );

  return {
    t,
    locale,
    switchLocale,
    section,
    supportedLocales: SUPPORTED_LOCALES,
    defaultLocale: DEFAULT_LOCALE,
  };
}
