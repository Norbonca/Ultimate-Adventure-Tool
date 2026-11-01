import { centsToDecimal, convertCents, convertShares, parseAmountToCents, splitAmount, type SplitInput } from './money';
import type { expenseInputSchema } from './schemas';
import type { z } from 'zod';

type Parsed = z.output<typeof expenseInputSchema>;

/** A 065 fx_resolve_rate() egy sora; null rate = még nincs árfolyam (átváltás függőben — a mentés nem tiltott). */
export type ResolvedRate = { rate: number | null; rate_date: string | null; source: string; quality: string };

export type BuiltExpense = {
  expense: {
    amount: string; currency: string; title: string; description: string | null; category: string; date: string;
    payer_id: string; split_type: string; fx_rate: string | null; fx_rate_date: string | null; fx_rate_source: string | null;
    fx_quality: string; amount_settlement: string | null; fx_locked_at: string;
  };
  splits: { user_id: string; amount: string; percentage: string | null; amount_settlement: string | null }[];
};

export type BuildError = 'amount_invalid' | 'no_participants' | 'sum_mismatch' | 'percent_mismatch' | 'negative';

/** Űrlap → DB-sorok. Minden összeg ≤ 2 tizedes (GAP-012); a kerekítési maradék a fizetőé (BR-M03-004). */
export function buildExpenseRows(input: Parsed, fx: ResolvedRate, now = new Date()): { ok: true; value: BuiltExpense } | { ok: false; error: BuildError } {
  const total = parseAmountToCents(input.amount);
  if (total === null || total <= 0) return { ok: false, error: 'amount_invalid' };

  let split: SplitInput;
  if (input.splitType === 'equal') split = { type: 'equal', userIds: input.participants };
  else if (input.splitType === 'custom') {
    const shares = input.participants.map((u) => ({ userId: u, amount: parseAmountToCents(input.custom?.[u] ?? '') }));
    if (shares.some((s) => s.amount === null)) return { ok: false, error: 'amount_invalid' };
    split = { type: 'custom', shares: shares as { userId: string; amount: number }[] };
  } else {
    const shares = input.participants.map((u) => ({ userId: u, percent: Number(String(input.custom?.[u] ?? '').replace(',', '.')) }));
    if (shares.some((s) => !Number.isFinite(s.percent))) return { ok: false, error: 'amount_invalid' };
    split = { type: 'percentage', shares };
  }
  const res = splitAmount(total, split, input.payerId);
  if (!res.ok) return res;

  const rate = fx.rate && fx.rate > 0 ? fx.rate : null;
  const totalSettlement = rate ? convertCents(total, rate) : null;
  const settleShares = rate && totalSettlement !== null ? convertShares(res.shares, totalSettlement, rate, input.payerId) : null;
  const pct = split.type === 'percentage' ? new Map(split.shares.map((s) => [s.userId, s.percent])) : null;

  return {
    ok: true,
    value: {
      expense: {
        amount: centsToDecimal(total), currency: input.currency, title: input.title, description: input.description || null,
        category: input.category, date: input.date, payer_id: input.payerId, split_type: input.splitType,
        fx_rate: rate ? rate.toFixed(10) : null, fx_rate_date: rate ? fx.rate_date : null,
        fx_rate_source: rate ? (fx.source === 'manual' ? 'peg' : fx.source) : null,
        fx_quality: rate ? fx.quality : 'none',
        amount_settlement: totalSettlement !== null ? centsToDecimal(totalSettlement) : null,
        fx_locked_at: now.toISOString(),
      },
      splits: res.shares.map((s) => ({
        user_id: s.userId, amount: centsToDecimal(s.amount),
        percentage: pct ? String(pct.get(s.userId)) : null,
        amount_settlement: settleShares ? centsToDecimal(settleShares.find((x) => x.userId === s.userId)!.amount) : null,
      })),
    },
  };
}
