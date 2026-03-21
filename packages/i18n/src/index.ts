/**
 * @uat/i18n — Lightweight, type-safe internationalization for Trevu
 *
 * Usage:
 *   import { t, setLocale, getLocale } from '@uat/i18n';
 *
 *   t('auth.login')              → "Bejelentkezés" (hu) / "Log in" (en)
 *   t('dashboard.welcomeMessage', { name: 'Anna' })  → "Üdvözlünk, Anna!"
 *   setLocale('en');              → switches to English
 */

import hu, { type TranslationKeys } from './hu';
import en from './en';

// ============================================================================
// Types
// ============================================================================

export type Locale = 'hu' | 'en';
export type { TranslationKeys };

/** All available translations */
const translations: Record<Locale, TranslationKeys> = { hu, en };

/** Supported locale list */
export const SUPPORTED_LOCALES: Locale[] = ['hu', 'en'];
export const DEFAULT_LOCALE: Locale = 'hu';

// ============================================================================
// State
// ============================================================================

let currentLocale: Locale = DEFAULT_LOCALE;

/** Get the current active locale */
export function getLocale(): Locale {
  return currentLocale;
}

/** Set the active locale */
export function setLocale(locale: Locale): void {
  if (SUPPORTED_LOCALES.includes(locale)) {
    currentLocale = locale;
  }
}

// ============================================================================
// Translation lookup
// ============================================================================

/**
 * Flattened key path type for autocomplete.
 * Produces union like "common.save" | "auth.login" | "profile.tabs.overview" etc.
 */
type FlattenKeys<T, Prefix extends string = ''> = T extends Record<string, unknown>
  ? {
      [K in keyof T & string]: T[K] extends Record<string, unknown>
        ? FlattenKeys<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = FlattenKeys<TranslationKeys>;

/**
 * Look up a nested value by dot-separated path.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * Translate a key with optional interpolation.
 *
 * @param key   Dot-separated path, e.g. "auth.loginTitle"
 * @param params  Optional interpolation values, e.g. { name: "Anna" }
 * @returns  Translated string, or the key itself if not found
 *
 * @example
 *   t('common.save')  // "Mentés"
 *   t('dashboard.welcomeMessage', { name: 'Anna' })  // "Üdvözlünk, Anna!"
 */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const dict = translations[currentLocale];
  let value = getNestedValue(dict as unknown as Record<string, unknown>, key);

  // Fallback to default locale if key not found
  if (value === undefined && currentLocale !== DEFAULT_LOCALE) {
    value = getNestedValue(translations[DEFAULT_LOCALE] as unknown as Record<string, unknown>, key);
  }

  // Fallback to key itself
  if (value === undefined) {
    return key;
  }

  // Interpolation: replace {param} placeholders
  if (params) {
    for (const [param, val] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${param}\\}`, 'g'), String(val));
    }
  }

  return value;
}

/**
 * Get the full translations object for the current or specified locale.
 * Useful when you need to iterate over a section (e.g. all category names).
 */
export function getTranslations(locale?: Locale): TranslationKeys {
  return translations[locale || currentLocale];
}

/**
 * Get a specific section of translations.
 *
 * @example
 *   const cats = getSection('categories');  // { hiking: "Túrázás", ... }
 */
export function getSection<K extends keyof TranslationKeys>(
  section: K,
  locale?: Locale
): TranslationKeys[K] {
  return translations[locale || currentLocale][section];
}

// ============================================================================
// Re-exports
// ============================================================================

export { hu, en };
