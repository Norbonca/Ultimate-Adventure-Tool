"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  createT,
  setLocale,
  getLocale,
  getSection,
  type Locale,
  type TranslationKey,
  type TranslationKeys,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
} from "@uat/i18n";
import { useServerLocale } from "./LocaleProvider";

const LOCALE_CHANGE_EVENT = "trevu-locale-change";
const STORAGE_KEY = "trevu-locale";

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

function isSupported(value: string | null | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * A localStorage nem mindig érhető el: letiltott vagy privát módú tárnál a böngésző dob,
 * Node 25+ alatt (tesztfutó) a globális `localStorage` fájl nélkül `undefined`.
 * A nyelv elsődleges forrása a cookie; a tár csak másodpéldány, a hiánya nem hiba.
 */
function readStoredLocale(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeStoredLocale(locale: Locale) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, locale);
  } catch {
    // a cookie elég
  }
}

/** A nyelv rögzítése mindenhol (modul-állapot, <html lang>, cookie, localStorage). */
function persistLocale(locale: Locale) {
  setLocale(locale);
  document.documentElement.lang = locale;
  setCookie(STORAGE_KEY, locale);
  writeStoredLocale(locale);
}

// ── Külső tár (useSyncExternalStore) ───────────────────────────────────────────
// A nyelv forrása az @uat/i18n modul-állapota (getLocale). A feliratkozók a
// LOCALE_CHANGE_EVENT DOM-eseményre frissülnek. A kliensoldali bootstrap (cookie →
// localStorage → böngészőnyelv) az első feliratkozáskor fut egyszer — nem effectben
// (react-hooks/set-state-in-effect, 2026-10-30, D12).
let bootstrapped = false;

function bootstrapClientLocale() {
  if (bootstrapped || typeof window === "undefined") return;
  bootstrapped = true;
  const fromCookie = getCookie(STORAGE_KEY);
  const fromStorage = readStoredLocale();
  const stored = isSupported(fromCookie) ? fromCookie : isSupported(fromStorage) ? fromStorage : null;
  const browserLang = navigator.language.split("-")[0];
  const next = stored ?? (isSupported(browserLang) ? browserLang : null);
  if (next && next !== getLocale()) {
    persistLocale(next);
    window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: next }));
  } else if (next) {
    // a szerver cookie-ból már ezt adta: csak a tárakat hozzuk szinkronba
    persistLocale(next);
  }
}

function subscribe(onChange: () => void) {
  const handler = (e: Event) => {
    const newLocale = (e as CustomEvent<Locale>).detail;
    if (isSupported(newLocale)) {
      setLocale(newLocale);
      onChange();
    }
  };
  window.addEventListener(LOCALE_CHANGE_EVENT, handler);
  // Első feliratkozás után, a commit fázison kívül: a bootstrap a feliratkozókat eseménnyel értesíti.
  queueMicrotask(bootstrapClientLocale);
  return () => window.removeEventListener(LOCALE_CHANGE_EVENT, handler);
}

const getSnapshot = () => getLocale();

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
  // A szerveroldali render és a hidratálás a szerver által feloldott olvasói nyelvet használja
  // (LocaleProvider), nem a megosztott modul-állapotot — így kérések között sem szivárog át.
  const serverLocale = useServerLocale();
  const locale = useSyncExternalStore(subscribe, getSnapshot, () => serverLocale);

  const switchLocale = useCallback((newLocale: Locale) => {
    persistLocale(newLocale);
    // Broadcast to all useTranslation instances on the page (including this one)
    window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: newLocale }));
  }, []);

  const t = useMemo(() => {
    const bound = createT(locale);
    return (key: TranslationKey, params?: Record<string, string | number>) => bound(key, params);
  }, [locale]);

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
