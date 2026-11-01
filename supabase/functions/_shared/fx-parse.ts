/**
 * Frankfurter v2 → exchange_rates sorok (rendszerspec §14.7–14.8). Tiszta modul: Deno (Edge Function) és Vitest is importálja.
 * Forrás ellenőrizve 2026-11-01: https://api.frankfurter.dev/v2/openapi.json — `/v2/rates?base=&quotes=&from=&to=&providers=`,
 * válasz: [{ date, base, quote, rate }]. `providers=ECB` → csak az EKB jegyzése (nem a Frankfurter saját blendje).
 * A 065 seedjében a frankfurter base_url még `/v1` — a v2 végpontot ez a modul rögzíti.
 */
export const FRANKFURTER_V2 = 'https://api.frankfurter.dev/v2/rates';

export type FrankfurterRow = { date: string; base: string; quote: string; rate: number };
export type RateRow = { base_currency: 'EUR'; target_currency: string; rate: number; source: 'ecb'; rate_date: string; unit: 1; is_derived: false };

export function buildRatesUrl(from: string, to: string): string {
  const q = new URLSearchParams({ base: 'EUR', from, to, providers: 'ECB' });
  return `${FRANKFURTER_V2}?${q.toString()}`;
}

/** Csak érvényes, EUR-bázisú, az aktív pénznemlistán szereplő, nem-EUR sorok; a rate 6 tizedesre (DECIMAL(14,6)). */
export function toRateRows(payload: unknown, knownCurrencies: Set<string>): RateRow[] {
  if (!Array.isArray(payload)) throw new Error('fx_payload_not_array');
  const out: RateRow[] = [];
  for (const r of payload as FrankfurterRow[]) {
    if (!r || typeof r.rate !== 'number' || !(r.rate > 0)) continue;
    if (String(r.base).toUpperCase() !== 'EUR') continue;
    const quote = String(r.quote).toUpperCase();
    if (quote === 'EUR' || !knownCurrencies.has(quote)) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r.date))) continue;
    out.push({ base_currency: 'EUR', target_currency: quote, rate: Math.round(r.rate * 1e6) / 1e6, source: 'ecb', rate_date: r.date, unit: 1, is_derived: false });
  }
  return out;
}

/** A lekérdezési ablak: az utolsó tárolt EKB-nap másnapjától (legfeljebb `maxDays` vissza) a mai napig. */
export function syncWindow(lastStored: string | null, today: string, maxDays = 7): { from: string; to: string } | null {
  const t = new Date(`${today}T00:00:00Z`);
  const floor = new Date(t); floor.setUTCDate(floor.getUTCDate() - maxDays);
  let from = floor;
  if (lastStored) {
    const next = new Date(`${lastStored}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
    if (next > from) from = next;
  }
  if (from > t) return null;
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: today };
}
