import { z } from 'zod';

/** A 003 expense_category_t értékei. */
export const EXPENSE_CATEGORIES = ['food_drinks', 'accommodation', 'transport_fuel', 'activities', 'gear_equipment', 'marina_berth'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Összeg szövegként jön a formból (hu/en tizedesjel); a centre bontás a money.parseAmountToCents dolga. */
const amountText = z.string().trim().min(1).max(20);

export const expenseInputSchema = z
  .object({
    tripId: z.string().uuid(),
    title: z.string().trim().min(1).max(120),
    amount: amountText,
    currency: z.string().trim().length(3).transform((s) => s.toUpperCase()),
    category: z.enum(EXPENSE_CATEGORIES),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    payerId: z.string().uuid(),
    splitType: z.enum(['equal', 'custom', 'percentage']),
    participants: z.array(z.string().uuid()).min(1).max(100),
    /** custom: összeg-szöveg résztvevőnként; percentage: százalék résztvevőnként */
    custom: z.record(z.string().uuid(), z.string().trim().max(20)).optional(),
    description: z.string().trim().max(500).optional().default(''),
  })
  .strict();
export type ExpenseInput = z.input<typeof expenseInputSchema>;

export const fxSettingsSchema = z
  .object({
    tripId: z.string().uuid(),
    settlementCurrency: z.string().trim().length(3).transform((s) => s.toUpperCase()),
    fxMode: z.enum(['expense_date', 'settlement_date', 'fixed']),
    participantsCanAdd: z.boolean(),
    rates: z.array(z.object({ currency: z.string().trim().length(3).transform((s) => s.toUpperCase()), rate: z.string().trim().min(1).max(20) })).max(30).default([]),
  })
  .strict();

export const settlementMarkSchema = z
  .object({
    tripId: z.string().uuid(),
    receiverId: z.string().uuid(),
    method: z.enum(['cash', 'bank_transfer']),
  })
  .strict();

export const disputeSchema = z
  .object({ settlementId: z.string().uuid(), note: z.string().trim().max(500).optional().default('') })
  .strict();
