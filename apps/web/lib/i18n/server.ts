import { cookies, headers } from 'next/headers';
import { createT, type Locale } from '@uat/i18n';
import { LOCALE_COOKIE, isSupportedLocale, negotiateLocale } from './negotiate';

/**
 * Az olvasó nyelve szerveroldalon (Norbert, 2026-11-09: mindig az olvasó nyelve dönt):
 * 1. a választott nyelv (süti — a `proxy.ts` az első kérésnél az Accept-Language szerint beállítja),
 * 2. süti híján az `Accept-Language` fejléc (pl. a proxy-n kívüli útvonalak, megosztó robotok),
 * 3. végül az alapértelmezett nyelv.
 */
export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isSupportedLocale(stored)) return stored;
  const headerStore = await headers();
  return negotiateLocale(headerStore.get('accept-language'));
}

/**
 * Server-safe translation function.
 * Reads the reader's locale (see `getServerLocale`) and returns a locale-bound `t` + the locale.
 *
 * @example
 *   const { t, locale } = await getServerT();
 *   <h1>{t('dashboard.welcomeMessage', { name: 'Anna' })}</h1>
 */
export async function getServerT() {
  const locale = await getServerLocale();
  return { t: createT(locale), locale };
}
