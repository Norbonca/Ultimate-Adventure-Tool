/**
 * M021 Menetrend — tiszta segédfüggvények (formázás, átrendezés), szerver- és kliensoldalon is.
 * Terv: design/D02_Trip_Management.pen „M021 v2 — …” (UDerj, NO5UX, PbOhz, zNUB9).
 */

/** „08:00:00” | „08:00” → „08:00”; minden más → null. */
export function normalizeTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value.trim());
  if (!m) return null;
  if (Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return `${m[1]}:${m[2]}`;
}

/** ISO dátum (ÉÉÉÉ-HH-NN) → „dec. 10.” / „Dec 10”; az óra opcionálisan „ · 08:00”. A nap a túra helyi napja, ezért UTC-ben formázunk. */
export function formatDue(date: string | null | undefined, time: string | null | undefined, locale: string): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, mo, d] = date.split("-").map(Number);
  const label = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "hu-HU", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, mo - 1, d)));
  const hhmm = normalizeTime(time);
  return hhmm ? `${label} · ${hhmm}` : label;
}

/** Elem áthelyezése egy listán belül (nem módosítja a bemenetet). */
export function moveInList<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
  return next;
}

export interface MilestoneLayoutEntry {
  phase_id: string;
  milestone_ids: string[];
}

/**
 * Mérföldkő áthelyezése a fázisok elrendezésében: kiveszi a régi helyéről, és a célfázis
 * `toIndex` pozíciójára teszi (fázison belül és fázisok között is). Ismeretlen azonosítónál változatlan.
 */
export function moveMilestone(
  layout: readonly MilestoneLayoutEntry[],
  milestoneId: string,
  toPhaseId: string,
  toIndex: number,
): MilestoneLayoutEntry[] {
  const copy = layout.map((e) => ({ ...e, milestone_ids: [...e.milestone_ids] }));
  const from = copy.find((e) => e.milestone_ids.includes(milestoneId));
  const to = copy.find((e) => e.phase_id === toPhaseId);
  if (!from || !to) return copy;
  if (from === to) {
    to.milestone_ids = moveInList(to.milestone_ids, to.milestone_ids.indexOf(milestoneId), toIndex);
    return copy;
  }
  from.milestone_ids = from.milestone_ids.filter((id) => id !== milestoneId);
  to.milestone_ids.splice(Math.max(0, Math.min(toIndex, to.milestone_ids.length)), 0, milestoneId);
  return copy;
}

/** Navigációs átadás (M121 spec §7.3, SZ14): Google Maps útvonal a koordinátához. */
export function mapsDirectionsUrl(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;
}
