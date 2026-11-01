import { describe, expect, it } from 'vitest';
import { buildExpenseRows } from '@/lib/expenses/build';
import { expenseInputSchema } from '@/lib/expenses/schemas';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';
const base = {
  tripId: '44444444-4444-4444-8444-444444444444', title: 'Búvármerülés', amount: '120,00', currency: 'usd',
  category: 'activities', date: '2026-07-15', payerId: A, splitType: 'equal', participants: [A, B, C],
};
const parse = (o: object) => expenseInputSchema.parse({ ...base, ...o });

describe('M03 buildExpenseRows — űrlap → DB-sorok', () => {
  it('idegen pénznem, utolsó ismert árfolyam: átváltott összeg + részek összege egyezik, figyelmeztetés-minőség', () => {
    const r = buildExpenseRows(parse({}), { rate: 1.0892, rate_date: '2026-06-30', source: 'ecb', quality: 'stale' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.expense).toMatchObject({ amount: '120.00', currency: 'USD', amount_settlement: '110.17', fx_quality: 'stale', fx_rate_source: 'ecb', fx_rate_date: '2026-06-30' });
    const sum = r.value.splits.reduce((s, x) => s + Math.round(Number(x.amount_settlement) * 100), 0);
    expect(sum).toBe(11017);
    expect(r.value.splits.find((s) => s.user_id === A)!.amount).toBe('40.00');
  });
  it('nincs árfolyam → menthető, átváltás függőben (NULL), quality none', () => {
    const r = buildExpenseRows(parse({ currency: 'npr' }), { rate: null, rate_date: null, source: 'none', quality: 'none' });
    expect(r.ok && r.value.expense).toMatchObject({ amount_settlement: null, fx_rate: null, fx_quality: 'none' });
    expect(r.ok && r.value.splits.every((s) => s.amount_settlement === null)).toBe(true);
  });
  it('3 tizedes összeg → amount_invalid (GAP-012)', () => {
    expect(buildExpenseRows(parse({ amount: '10,005' }), { rate: 1, rate_date: null, source: 'same', quality: 'same' })).toEqual({ ok: false, error: 'amount_invalid' });
  });
  it('egyéni elosztás eltérő összeggel → sum_mismatch', () => {
    const r = buildExpenseRows(parse({ splitType: 'custom', custom: { [A]: '50', [B]: '50', [C]: '10' } }), { rate: 1, rate_date: null, source: 'same', quality: 'same' });
    expect(r).toEqual({ ok: false, error: 'sum_mismatch' });
  });
  it('manual (BAM/BGN paritás) forrás → peg a pillanatképben', () => {
    const r = buildExpenseRows(parse({ currency: 'bgn', amount: '19,56' }), { rate: 1.95583, rate_date: '1999-01-01', source: 'manual', quality: 'peg' });
    expect(r.ok && r.value.expense.fx_rate_source).toBe('peg');
    expect(r.ok && r.value.expense.amount_settlement).toBe('10.00');
  });
});
