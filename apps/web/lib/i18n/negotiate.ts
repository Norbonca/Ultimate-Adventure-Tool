import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "@uat/i18n";

/** A nyelvválasztó süti neve (a kliens `useTranslation` is ezt írja). */
export const LOCALE_COOKIE = "trevu-locale";

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Az olvasó nyelve az `Accept-Language` fejlécből (Norbert, 2026-11-09: mindig az olvasó nyelve dönt).
 * A minőségi súly (`q`) szerinti sorrendben az első támogatott nyelv; a régiót elhagyja (`en-GB` → `en`).
 * Fejléc nélkül vagy támogatott nyelv híján az alapértelmezett nyelv.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q ? Number(q.slice(2)) : 1;
      return { lang: tag.trim().toLowerCase().split("-")[0], weight: Number.isFinite(weight) ? weight : 0, i };
    })
    .filter((x) => x.lang && x.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.i - b.i);
  return ranked.find((x) => isSupportedLocale(x.lang))?.lang as Locale | undefined ?? DEFAULT_LOCALE;
}
