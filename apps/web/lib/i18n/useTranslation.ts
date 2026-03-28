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

const LOCALE_CHANGE_EVENT = "trevu-locale-change";

/**
 * Set a cookie (client-side).
 */
function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value};expires=${expires};path=/;SameSite=Lax`;
}

/**
 * Read a cookie value (client-side).
 */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}

/**
 * React hook for i18n translations.
 *
 * Persists locale to both localStorage AND cookie (for SSR sync).
 * Broadcasts locale changes via custom DOM event so all hook instances stay in sync.
 *
 * @example
 *   const { t, locale, switchLocale } = useTranslation();
 *   <h1>{t('auth.loginTitle')}</h1>
 *   <button onClick={() => switchLocale('en')}>EN</button>
 */
export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(getLocale());

  // Sync with stored preference on mount + listen for cross-component locale changes
  useEffect(() => {
    // Check cookie first (synced with server), then localStorage, then browser
    const fromCookie = getCookie("trevu-locale") as Locale | null;
    const fromStorage = localStorage.getItem("trevu-locale") as Locale | null;
    const stored = fromCookie || fromStorage;

    if (stored && SUPPORTED_LOCALES.includes(stored)) {
      setLocale(stored);
      setLocaleState(stored);
      document.documentElement.lang = stored;
      setCookie("trevu-locale", stored);
      localStorage.setItem("trevu-locale", stored);
    } else {
      // Fall back to browser language
      const browserLang = navigator.language.split("-")[0] as Locale;
      if (SUPPORTED_LOCALES.includes(browserLang)) {
        setLocale(browserLang);
        setLocaleState(browserLang);
        document.documentElement.lang = browserLang;
        setCookie("trevu-locale", browserLang);
        localStorage.setItem("trevu-locale", browserLang);
      }
    }

    // Listen for locale changes broadcast by other hook instances
    const handleLocaleChange = (e: Event) => {
      const newLocale = (e as CustomEvent<Locale>).detail;
      if (SUPPORTED_LOCALES.includes(newLocale)) {
        setLocale(newLocale);
        setLocaleState(newLocale);
      }
    };

    window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
  }, []);

  const switchLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    setLocaleState(newLocale);
    localStorage.setItem("trevu-locale", newLocale);
    setCookie("trevu-locale", newLocale);
    document.documentElement.lang = newLocale;
    // Broadcast to all other useTranslation instances on the page
    window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: newLocale }));
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
