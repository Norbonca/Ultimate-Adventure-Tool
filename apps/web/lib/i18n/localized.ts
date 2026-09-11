/**
 * Adatbázisból jövő, többnyelvű nevek feloldása.
 *
 * A ref_* és trip_* táblák `name` (angol alap) + `name_localized` ({hu, en})
 * párt tárolnak. Megjelenítéskor a locale szerinti fordítás nyer, hiányában
 * az alapnév. Kézi átnevezéskor a name_localized üres, így a beírt név
 * minden nyelven érvényes.
 */

export interface Localizable {
  name: string;
  name_localized?: Record<string, string> | null;
}

export function getLocalizedName(item: Localizable, locale: string): string {
  const localized = item.name_localized?.[locale];
  return localized && localized.trim() ? localized : item.name;
}

export function getLocalizedText(
  base: string | null | undefined,
  localized: Record<string, string> | null | undefined,
  locale: string
): string | null {
  const value = localized?.[locale];
  if (value && value.trim()) return value;
  return base ?? null;
}
