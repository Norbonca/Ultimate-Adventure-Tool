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

export interface ParameterDisplayOption {
  value: string;
  label: string;
  label_localized?: Record<string, string> | null;
}

/** Resolve saved option codes using the same reference labels as the editor. */
export function formatParameterValue(
  value: unknown,
  fieldType: string,
  unit: string | null,
  options: ParameterDisplayOption[],
  locale: string
): string {
  const formatOne = (item: unknown): string => {
    if (fieldType === "select" || fieldType === "multiselect") {
      const option = options.find((candidate) => candidate.value === String(item));
      if (option) return getLocalizedText(option.label, option.label_localized, locale) ?? String(item);
    }
    // Keep legacy/custom values readable if their reference option was removed.
    return typeof item === "number"
      ? item.toLocaleString(locale === "en" ? "en-US" : "hu-HU")
      : String(item);
  };
  const text = Array.isArray(value) ? value.map(formatOne).join(", ") : formatOne(value);
  return text && unit ? `${text} ${unit}` : text;
}
