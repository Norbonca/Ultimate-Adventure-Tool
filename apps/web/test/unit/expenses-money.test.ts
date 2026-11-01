import { describe, expect, it } from 'vitest';
import {
  centsToDecimal,
  convertCents,
  convertShares,
  optimizeSettlements,
  parseAmountToCents,
  splitAmount,
} from '@/lib/expenses/money';

describe('M03 money — bevitel (GAP-012: legfeljebb 2 tizedes)', () => {
  it('magyar és angol tizedesjel, ezres szóköz', () => {
    expect(parseAmountToCents('1 234,56')).toBe(123456);
    expect(parseAmountToCents('1234.5')).toBe(123450);
    expect(parseAmountToCents('45000')).toBe(4500000);
  });
  it('3 tizedes, negatív, szöveg → null', () => {
    expect(parseAmountToCents('1,234')).toBeNull();
    expect(parseAmountToCents('-5')).toBeNull();
    expect(parseAmountToCents('abc')).toBeNull();
  });
  it('centsToDecimal', () => {
    expect(centsToDecimal(110009)).toBe('1100.09');
    expect(centsToDecimal(-5)).toBe('-0.05');
  });
});

describe('M03 money — átváltás (065 irány: elszámolási = tétel / rate)', () => {
  it('45 000 Ft → EUR 398,5-ös árfolyamon', () => {
    expect(convertCents(4500000, 398.5)).toBe(11292); // 112,92 €
  });
  it('120 USD → EUR 1,0892-n (D04 Hpeqs példa)', () => {
    expect(convertCents(12000, 1.0892)).toBe(11017);
  });
  it('100 EUR → HUF keresztárfolyamon (1/398,5)', () => {
    expect(convertCents(10000, 0.0025094103)).toBe(3985000);
  });
  it('érvénytelen árfolyam hiba', () => {
    expect(() => convertCents(100, 0)).toThrow('fx_rate_invalid');
  });
});

describe('M03 money — elosztás (maradék a fizetőé, BR-M03-004)', () => {
  it('egyenlő: 110,09 € 4 főre → 27,52 ×3 + 27,53 a fizetőnek', () => {
    const r = splitAmount(11009, { type: 'equal', userIds: ['a', 'b', 'c', 'd'] }, 'c');
    expect(r.ok && r.shares).toEqual([
      { userId: 'a', amount: 2752 }, { userId: 'b', amount: 2752 }, { userId: 'c', amount: 2753 }, { userId: 'd', amount: 2752 },
    ]);
  });
  it('egyenlő, a fizető nem részesül → az elsőé a maradék', () => {
    const r = splitAmount(100, { type: 'equal', userIds: ['a', 'b', 'c'] }, 'x');
    expect(r.ok && r.shares.map((s) => s.amount)).toEqual([34, 33, 33]);
  });
  it('egyéni: összeg egyezik / eltér', () => {
    expect(splitAmount(1000, { type: 'custom', shares: [{ userId: 'a', amount: 600 }, { userId: 'b', amount: 400 }] }, 'a').ok).toBe(true);
    expect(splitAmount(1000, { type: 'custom', shares: [{ userId: 'a', amount: 600 }, { userId: 'b', amount: 399 }] }, 'a')).toEqual({ ok: false, error: 'sum_mismatch' });
  });
  it('százalék: 33,33 + 33,33 + 33,34 = 100, összeg pontos', () => {
    const r = splitAmount(10000, { type: 'percentage', shares: [{ userId: 'a', percent: 33.33 }, { userId: 'b', percent: 33.33 }, { userId: 'c', percent: 33.34 }] }, 'a');
    expect(r.ok && r.shares.reduce((s, x) => s + x.amount, 0)).toBe(10000);
    expect(splitAmount(100, { type: 'percentage', shares: [{ userId: 'a', percent: 50 }] }, 'a')).toEqual({ ok: false, error: 'percent_mismatch' });
  });
  it('üres résztvevőlista hiba', () => {
    expect(splitAmount(100, { type: 'equal', userIds: [] }, 'a')).toEqual({ ok: false, error: 'no_participants' });
  });
  it('convertShares: a részek összege = a tétel átváltott összege', () => {
    const shares = [{ userId: 'a', amount: 4000 }, { userId: 'b', amount: 4000 }, { userId: 'c', amount: 4000 }];
    const total = convertCents(12000, 1.0892);
    const out = convertShares(shares, total, 1.0892, 'b');
    expect(out.reduce((s, x) => s + x.amount, 0)).toBe(total);
  });
});

describe('M03 money — optimalizált kiegyenlítés (GAP-006)', () => {
  it('3 adós, 2 hitelező → legfeljebb n−1 utalás, minden egyenleg nullázódik', () => {
    const bal = [{ userId: 'dani', balance: 103950 }, { userId: 'te', balance: 7420 }, { userId: 'reka', balance: -14300 }, { userId: 'bence', balance: -25550 }, { userId: 'lili', balance: -71520 }];
    const t = optimizeSettlements(bal);
    expect(t.length).toBeLessThanOrEqual(bal.length - 1);
    const net = new Map(bal.map((b) => [b.userId, b.balance]));
    for (const x of t) { net.set(x.from, net.get(x.from)! + x.amount); net.set(x.to, net.get(x.to)! - x.amount); }
    expect([...net.values()].every((v) => v === 0)).toBe(true);
  });
  it('kiegyenlített csoport → nincs utalás', () => {
    expect(optimizeSettlements([{ userId: 'a', balance: 0 }, { userId: 'b', balance: 0 }])).toEqual([]);
  });
});

it('centsToDecimal + parse oda-vissza', () => {
  expect(parseAmountToCents(centsToDecimal(4500000))).toBe(4500000);
});
