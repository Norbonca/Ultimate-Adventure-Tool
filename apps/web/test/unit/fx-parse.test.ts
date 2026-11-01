import { describe, expect, it } from 'vitest';
import { buildRatesUrl, syncWindow, toRateRows } from '../../../../supabase/functions/_shared/fx-parse';

describe('fx-sync — Frankfurter v2 (EKB) feldolgozás', () => {
  it('URL: EUR bázis, csak az EKB, dátumablak', () => {
    expect(buildRatesUrl('2026-10-26', '2026-11-01')).toBe(
      'https://api.frankfurter.dev/v2/rates?base=EUR&from=2026-10-26&to=2026-11-01&providers=ECB',
    );
  });
  it('csak az ismert, nem-EUR pénznemek; rate 6 tizedesre; hibás sorok kiesnek', () => {
    const rows = toRateRows(
      [
        { date: '2026-10-30', base: 'EUR', quote: 'HUF', rate: 398.1234567 },
        { date: '2026-10-30', base: 'EUR', quote: 'EUR', rate: 1 },
        { date: '2026-10-30', base: 'EUR', quote: 'XAU', rate: 0.0003 },
        { date: '2026-10-30', base: 'USD', quote: 'HUF', rate: 360 },
        { date: 'bad', base: 'EUR', quote: 'USD', rate: 1.08 },
        { date: '2026-10-30', base: 'EUR', quote: 'usd', rate: 1.0892 },
        { date: '2026-10-30', base: 'EUR', quote: 'CZK', rate: 0 },
      ],
      new Set(['HUF', 'USD', 'CZK']),
    );
    expect(rows).toEqual([
      { base_currency: 'EUR', target_currency: 'HUF', rate: 398.123457, source: 'ecb', rate_date: '2026-10-30', unit: 1, is_derived: false },
      { base_currency: 'EUR', target_currency: 'USD', rate: 1.0892, source: 'ecb', rate_date: '2026-10-30', unit: 1, is_derived: false },
    ]);
  });
  it('nem tömb válasz → hiba', () => {
    expect(() => toRateRows({ status: 422 }, new Set())).toThrow('fx_payload_not_array');
  });
  it('ablak: üres táblánál 7 nap; utolsó nap után másnaptól; naprakész → null', () => {
    expect(syncWindow(null, '2026-11-01')).toEqual({ from: '2026-10-25', to: '2026-11-01' });
    expect(syncWindow('2026-10-30', '2026-11-01')).toEqual({ from: '2026-10-31', to: '2026-11-01' });
    expect(syncWindow('2026-02-17', '2026-11-01')).toEqual({ from: '2026-10-25', to: '2026-11-01' });
    expect(syncWindow('2026-11-01', '2026-11-01')).toBeNull();
  });
});
