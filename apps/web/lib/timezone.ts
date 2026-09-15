/**
 * Időzóna-segédek a szervezés időzónájához (M23 Calendar, FR-M23-011…013).
 *
 * Szabály: a szervező napot ad meg jelentkezési határidőként; a jelentkezés a megadott napot
 * követő nap 00:00-kor zár a túra időzónájában (kizárólagos felső határ). Az adatbázis ugyanezt
 * számolja (036-os migráció, set_trip_registration_deadline); ez a modul a megjelenítéshez és a
 * validációhoz ad azonos logikát.
 */

export const DEFAULT_TRIP_TIMEZONE = "UTC";

/** Érvényes IANA-időzóna-e (a futtatókörnyezet Intl-adatbázisa szerint). */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || timeZone.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

const FALLBACK_TIMEZONES = [
  "Europe/Budapest", "Europe/Vienna", "Europe/Berlin", "Europe/London", "Europe/Lisbon",
  "Atlantic/Canary", "Europe/Madrid", "Europe/Rome", "Europe/Zagreb", "Europe/Bucharest",
  "Europe/Athens", "Asia/Kathmandu", "Asia/Bangkok", "Indian/Reunion", "Atlantic/Azores",
  "America/New_York", "America/Los_Angeles",
];

/** Választható időzónák: elöl az UTC, utána az IANA-lista ábécérendben. */
export function listTimeZones(): string[] {
  let zones: string[] = FALLBACK_TIMEZONES;
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  if (typeof intl.supportedValuesOf === "function") {
    try {
      zones = intl.supportedValuesOf("timeZone");
    } catch {
      zones = FALLBACK_TIMEZONES;
    }
  }
  const unique = Array.from(new Set(zones.filter((z) => z !== DEFAULT_TRIP_TIMEZONE))).sort();
  return [DEFAULT_TRIP_TIMEZONE, ...unique];
}

/** Az adott zóna UTC-eltolása egy pillanatban, pl. „UTC+02:00”. */
export function formatUtcOffset(timeZone: string, at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  const totalMinutes = Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
  const sign = totalMinutes < 0 ? "-" : "+";
  const abs = Math.abs(totalMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${hh}:${mm}`;
}

/**
 * A jelentkezés zárópillanata: a megadott napot követő nap 00:00 a zónában.
 * Kétlépéses közelítés, amely a nyári időszámítás-váltás napján is helyes eltolást ad.
 */
export function registrationClosesAt(deadlineDate: string, timeZone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadlineDate);
  if (!match) throw new Error("invalid_date");
  const tz = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TRIP_TIMEZONE;
  const naiveUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1, 0, 0, 0);
  const offsetMinutes = (at: number) => {
    const text = formatUtcOffset(tz, new Date(at)); // UTC±HH:MM
    const m = /UTC([+-])(\d{2}):(\d{2})/.exec(text);
    if (!m) return 0;
    const value = Number(m[2]) * 60 + Number(m[3]);
    return m[1] === "-" ? -value : value;
  };
  const first = naiveUtc - offsetMinutes(naiveUtc) * 60000;
  const second = naiveUtc - offsetMinutes(first) * 60000;
  return new Date(second);
}

/** A jelentkezés nyitva van-e a megadott pillanatban (kizárólagos felső határ). */
export function isRegistrationOpenAt(deadlineDate: string | null, timeZone: string, now: Date): boolean {
  if (!deadlineDate) return true;
  return now.getTime() < registrationClosesAt(deadlineDate, timeZone).getTime();
}

/** Naptári nap megjelenítése időzóna-eltolás nélkül (a DATE nem vetül zónára). */
export function formatLocalDate(deadlineDate: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadlineDate);
  if (!match) return deadlineDate;
  const utcNoon = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" }).format(utcNoon);
}
