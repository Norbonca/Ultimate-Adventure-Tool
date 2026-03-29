import { cookies } from 'next/headers';
import { createT, type Locale, SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@uat/i18n';

/**
 * Get the active locale from cookies (server-side).
 */
export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const stored = cookieStore.get('trevu-locale')?.value as Locale | null;
  return stored && SUPPORTED_LOCALES.includes(stored) ? stored : DEFAULT_LOCALE;
}

/**
 * Server-safe translation function.
 * Reads locale from cookies and returns a locale-bound `t` + the locale.
 *
 * @example
 *   const { t, locale } = await getServerT();
 *   <h1>{t('dashboard.welcomeMessage', { name: 'Anna' })}</h1>
 */
export async function getServerT() {
  const locale = await getServerLocale();
  return { t: createT(locale), locale };
}
