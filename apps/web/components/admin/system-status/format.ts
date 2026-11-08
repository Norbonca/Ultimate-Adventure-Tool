/**
 * M151 — megjelenítési segédek a rendszerállapot-felülethez (kliens). Terv: design/D15_Admin.pen#VeTnM
 */
import type { Locale, TranslationKey } from "@uat/i18n";
import type { CheckKey, CheckResult, CheckState } from "@/lib/system-status/types";

export type DisplayState = CheckState | "wait";

type T = (key: TranslationKey, params?: Record<string, string | number>) => string;

/** A sorok megjelenítési rendje és csoportja — adat nélkül (első betöltés) is ebből rajzolunk. */
export const CHECK_LAYOUT: { group: "platform" | "data" | "external"; keys: CheckKey[] }[] = [
  { group: "platform", keys: ["app", "database", "auth", "storage"] },
  { group: "data", keys: ["migrations", "cron", "fx"] },
  { group: "external", keys: ["extFrankfurter", "extNominatim", "extEox"] },
];

export const CHECK_ICON: Record<CheckKey, string> = {
  app: "server",
  database: "database",
  auth: "key-round",
  storage: "hard-drive",
  migrations: "database",
  cron: "calendar-clock",
  fx: "banknote",
  extFrankfurter: "globe",
  extNominatim: "map-pin",
  extEox: "map",
};

/** Az állapotsáv pöttyei: a három külső szolgáltatás egy „Külső” jelzésbe olvad (a legrosszabb állapottal). */
export const STRIP_ITEMS = ["app", "database", "auth", "storage", "migrations", "cron", "fx", "external"] as const;
export type StripItem = (typeof STRIP_ITEMS)[number];

const EXTERNAL_KEYS: CheckKey[] = ["extFrankfurter", "extNominatim", "extEox"];
const RANK: Record<CheckState, number> = { ok: 0, warn: 1, down: 2 };

export function stripItemOf(key: CheckKey): StripItem {
  return EXTERNAL_KEYS.includes(key) ? "external" : (key as StripItem);
}

export function stripItemState(item: StripItem, checks: CheckResult[]): CheckState {
  const keys = item === "external" ? EXTERNAL_KEYS : [item as CheckKey];
  return checks
    .filter((c) => keys.includes(c.key))
    .reduce<CheckState>((worst, c) => (RANK[c.state] > RANK[worst] ? c.state : worst), "ok");
}

/** Az érintett ellenőrzések rövid nevei, ismétlés nélkül (a külsők egyszer, „Külső”-ként). */
export function affectedNames(keys: CheckKey[], t: T): string {
  const items = [...new Set(keys.map(stripItemOf))];
  return items.map((i) => t(`admin.system.short.${i}` as TranslationKey)).join(", ");
}

function intlLocale(locale: Locale): string {
  return locale === "hu" ? "hu-HU" : "en-GB";
}

export function formatClock(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(iso));
}

/** Mai napon csak az óra, egyébként nap + óra. */
export function formatWhen(iso: string, locale: Locale, now = new Date()): string {
  const d = new Date(iso);
  const sameDay = d.toDateString() === now.toDateString();
  const opts: Intl.DateTimeFormatOptions = sameDay
    ? { hour: "2-digit", minute: "2-digit" }
    : { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
  return new Intl.DateTimeFormat(intlLocale(locale), opts).format(d);
}

export function checkValueText(check: CheckResult, t: T, locale: Locale): string {
  if (!check.value) return "";
  const params: Record<string, string | number> = { ...(check.value.params ?? {}) };
  if (typeof params.at === "string") params.at = formatWhen(params.at, locale);
  return t(`admin.system.value.${check.value.key}` as TranslationKey, params);
}

export function cronStatusText(status: string | null, t: T): string {
  const known = ["succeeded", "failed", "running"];
  return t(`admin.system.cron.status.${status && known.includes(status) ? status : "other"}` as TranslationKey);
}
