/**
 * M03 pénzszámítás — tiszta függvények, egész cent-aritmetikával (lebegőpontos hiba nélkül).
 * Döntések (Norbert, 2026-10-31): legfeljebb 2 tizedes a bevitelben és a kiegyenlítésben (GAP-012);
 * a kerekítési maradék a fizetőé (BR-M03-004); az optimalizált elszámolás kell, számítva (GAP-006).
 * Árfolyam-irány (065 fx_resolve_rate): 1 egység elszámolási pénznem = rate × tétel-pénznem,
 * tehát elszámolási összeg = tétel összeg / rate.
 */

export type Cents = number;

/** "1 234,56" | "1234.56" | 1234.56 → 123456; null, ha nem érvényes vagy 2-nél több tizedes. */
export function parseAmountToCents(input: string | number): Cents | null {
  const raw = typeof input === 'number' ? String(input) : input;
  const s = raw.replace(/[\s  ]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [int, frac = ''] = s.split('.');
  const cents = Number(int) * 100 + Number(frac.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

export const centsToDecimal = (c: Cents): string => {
  const sign = c < 0 ? '-' : '';
  const a = Math.abs(c);
  return `${sign}${Math.floor(a / 100)}.${String(a % 100).padStart(2, '0')}`;
};

export const decimalToCents = (d: string | number): Cents => Math.round(Number(d) * 100);

/** Tétel összeg → elszámolási pénznem, 2 tizedesre kerekítve (half-up). rate > 0. */
export function convertCents(amount: Cents, rate: number): Cents {
  if (!(rate > 0)) throw new Error('fx_rate_invalid');
  return Math.round(amount / rate);
}

export type SplitType = 'equal' | 'custom' | 'percentage';
export type SplitInput =
  | { type: 'equal'; userIds: string[] }
  | { type: 'custom'; shares: { userId: string; amount: Cents }[] }
  | { type: 'percentage'; shares: { userId: string; percent: number }[] };

export type SplitResult =
  | { ok: true; shares: { userId: string; amount: Cents }[] }
  | { ok: false; error: 'no_participants' | 'sum_mismatch' | 'percent_mismatch' | 'negative' };

/**
 * Elosztás egy összegen (bármely pénznemben, centben). Egyenlő és százalékos elosztásnál a
 * kerekítési maradék a fizetőé (ha ő is részesül), különben az első részesedőé — így a részek
 * összege mindig pontosan a teljes összeg.
 */
export function splitAmount(total: Cents, input: SplitInput, payerId: string): SplitResult {
  if (input.type === 'custom') {
    if (input.shares.length === 0) return { ok: false, error: 'no_participants' };
    if (input.shares.some((s) => s.amount < 0)) return { ok: false, error: 'negative' };
    const sum = input.shares.reduce((a, s) => a + s.amount, 0);
    if (sum !== total) return { ok: false, error: 'sum_mismatch' };
    return { ok: true, shares: input.shares.map((s) => ({ ...s })) };
  }
  let raw: { userId: string; amount: Cents }[];
  if (input.type === 'equal') {
    const ids = [...new Set(input.userIds)];
    if (ids.length === 0) return { ok: false, error: 'no_participants' };
    const base = Math.floor(total / ids.length);
    raw = ids.map((userId) => ({ userId, amount: base }));
  } else {
    if (input.shares.length === 0) return { ok: false, error: 'no_participants' };
    if (input.shares.some((s) => s.percent < 0)) return { ok: false, error: 'negative' };
    const pct = input.shares.reduce((a, s) => a + Math.round(s.percent * 100), 0);
    if (pct !== 10000) return { ok: false, error: 'percent_mismatch' };
    raw = input.shares.map((s) => ({ userId: s.userId, amount: Math.floor((total * Math.round(s.percent * 100)) / 10000) }));
  }
  const rest = total - raw.reduce((a, s) => a + s.amount, 0);
  const target = raw.find((s) => s.userId === payerId) ?? raw[0];
  target.amount += rest;
  return { ok: true, shares: raw };
}

/**
 * Részesedések átváltása az elszámolási pénznembe úgy, hogy összegük pontosan a tétel átváltott
 * összege legyen (a maradék itt is a fizetőé). rate = 065 szerinti irány.
 */
export function convertShares(
  shares: { userId: string; amount: Cents }[],
  totalSettlement: Cents,
  rate: number,
  payerId: string,
): { userId: string; amount: Cents }[] {
  const out = shares.map((s) => ({ userId: s.userId, amount: convertCents(s.amount, rate) }));
  const diff = totalSettlement - out.reduce((a, s) => a + s.amount, 0);
  if (out.length) (out.find((s) => s.userId === payerId) ?? out[0]).amount += diff;
  return out;
}

export type Transfer = { from: string; to: string; amount: Cents };

/**
 * Optimalizált (greedy) kiegyenlítési lista a nettó egyenlegekből (FR-M03-003, GAP-006):
 * a legnagyobb adós a legnagyobb hitelezőnek fizet, amíg mindenki 0. Legfeljebb n−1 utalás.
 * balance > 0: neki tartoznak; < 0: ő tartozik. A bemenet összegének 0-nak kell lennie;
 * az esetleges ±néhány cent kerekítési eltérést a végén elhagyjuk.
 */
export function optimizeSettlements(balances: { userId: string; balance: Cents }[]): Transfer[] {
  const cred = balances.filter((b) => b.balance > 0).map((b) => ({ ...b })).sort((a, b) => b.balance - a.balance || a.userId.localeCompare(b.userId));
  const debt = balances.filter((b) => b.balance < 0).map((b) => ({ ...b, balance: -b.balance })).sort((a, b) => b.balance - a.balance || a.userId.localeCompare(b.userId));
  const out: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debt.length && j < cred.length) {
    const amount = Math.min(debt[i].balance, cred[j].balance);
    if (amount > 0) out.push({ from: debt[i].userId, to: cred[j].userId, amount });
    debt[i].balance -= amount;
    cred[j].balance -= amount;
    if (debt[i].balance === 0) i++;
    if (cred[j].balance === 0) j++;
  }
  return out;
}
