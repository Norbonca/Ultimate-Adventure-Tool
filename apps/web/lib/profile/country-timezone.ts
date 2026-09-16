/**
 * Profil ország ↔ időzóna összerendelés (M23; Norbert döntései, 2026-09-15).
 *
 * - Az összerendelés forrása a saját `ref_timezones` törzs (`country_code`).
 * - Egyzónás országnál a zóna automatikus, többzónásnál a felhasználó választ.
 * - Ország nélküli profilnál a böngésző időzónája / nyelvi régiója alapján javaslatot adunk
 *   (nem mentünk automatikusan).
 *
 * Tiszta függvények, kliens- és szerveroldalon is használhatók (nincs szerver-import). A szerveroldali
 * kényszer a 045-ös migráció `validate_profile_country_timezone` triggere.
 */

export interface CountryTimezoneRow {
  tz_id: string;
  country_code: string;
  display_name?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
}

export interface CountryRow {
  code: string;
  is_active?: boolean | null;
}

export interface CountryTimezoneSuggestion {
  countryCode: string;
  /** `null`: többzónás ország, a felhasználónak választania kell. */
  timezone: string | null;
}

const COUNTRY_RE = /^[A-Z]{2}$/;

function normalizeCountry(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase();
}

/** Az ország aktív zónái `sort_order`, majd megjelenített név (végül azonosító) szerint. */
export function timezonesForCountry<T extends CountryTimezoneRow>(countryCode: string | null | undefined, timezones: readonly T[]): T[] {
  const code = normalizeCountry(countryCode);
  if (!COUNTRY_RE.test(code)) return [];
  return timezones
    .filter((tz) => tz.is_active !== false && normalizeCountry(tz.country_code) === code)
    .sort(
      (a, b) =>
        (a.sort_order ?? 999) - (b.sort_order ?? 999) ||
        (a.display_name ?? a.tz_id).localeCompare(b.display_name ?? b.tz_id) ||
        a.tz_id.localeCompare(b.tz_id),
    );
}

/** Egyzónás országnál az egyetlen zóna azonosítója; többzónásnál vagy ismeretlen országnál `null`. */
export function autoTimezoneForCountry(countryCode: string | null | undefined, timezones: readonly CountryTimezoneRow[]): string | null {
  const zones = timezonesForCountry(countryCode, timezones);
  return zones.length === 1 ? zones[0].tz_id : null;
}

/** Az adott zóna az ország aktív zónája-e. */
export function isTimezoneOfCountry(
  countryCode: string | null | undefined,
  timezone: string | null | undefined,
  timezones: readonly CountryTimezoneRow[],
): boolean {
  if (!timezone) return false;
  return timezonesForCountry(countryCode, timezones).some((tz) => tz.tz_id === timezone);
}

function regionOfLanguageTag(tag: string): string | null {
  const trimmed = tag.trim();
  if (!trimmed) return null;
  const LocaleCtor = (Intl as unknown as { Locale?: new (tag: string) => { region?: string } }).Locale;
  if (typeof LocaleCtor === "function") {
    try {
      const region = new LocaleCtor(trimmed.replace(/_/g, "-")).region;
      return region && COUNTRY_RE.test(region.toUpperCase()) ? region.toUpperCase() : null;
    } catch {
      return null;
    }
  }
  // Tartalék: nyelv[-írás]-régió (pl. "de-AT", "zh-Hant-TW", "en_US").
  const parts = trimmed.split(/[-_]/).slice(1);
  const region = parts.find((part) => /^[A-Za-z]{2}$/.test(part));
  return region ? region.toUpperCase() : null;
}

/**
 * Ország- és időzóna-javaslat a böngésző adatai alapján:
 * 1. a böngésző időzónája szerepel a törzsben és az országa aktív → az az ország és zóna;
 * 2. különben az első olyan nyelvi címke régiója, amely aktív ország → az ország, zóna csak egyzónásnál;
 * 3. különben `null`. Régió nélküli nyelvből (pl. `hu`) nem találgatunk országot.
 */
export function suggestCountryAndTimezone(input: {
  browserTimeZone?: string | null;
  browserLanguages?: readonly string[] | null;
  countries: readonly CountryRow[];
  timezones: readonly CountryTimezoneRow[];
}): CountryTimezoneSuggestion | null {
  const activeCountries = new Set(
    input.countries.filter((c) => c.is_active !== false).map((c) => normalizeCountry(c.code)),
  );

  const browserTz = input.browserTimeZone?.trim();
  if (browserTz) {
    const zone = input.timezones.find((tz) => tz.tz_id === browserTz && tz.is_active !== false);
    const code = normalizeCountry(zone?.country_code);
    if (zone && activeCountries.has(code)) return { countryCode: code, timezone: zone.tz_id };
  }

  for (const tag of input.browserLanguages ?? []) {
    const region = regionOfLanguageTag(tag);
    if (region && activeCountries.has(region)) {
      return { countryCode: region, timezone: autoTimezoneForCountry(region, input.timezones) };
    }
  }

  return null;
}
