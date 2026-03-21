/**
 * M03 - Expense Sharing — Drizzle ORM Schema
 *
 * Táblák: expenses, expense_splits, expense_balances, settlements, exchange_rates
 * Kapcsolatok: M01 (profiles), M02 (trips, trip_participants)
 *
 * @module packages/db/src/schema/expense.ts
 * @version 1.0.0
 * @date 2026-02-17
 */

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  decimal,
  integer,
  boolean,
  date,
  timestamp,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { profiles } from './user'; // M01
import { trips, tripParticipants } from './trip'; // M02
import { syncStatusEnum } from './user'; // Közös sync_status_t

// ============================================
// ENUM DEFINÍCIÓK
// ============================================

/**
 * 6 expense kategória színkódokkal
 * food_drinks (#D97706), accommodation (#DC2626), transport_fuel (#0D9488),
 * activities (#8B5CF6), gear_equipment (#DC2626), marina_berth (#3B82F6)
 */
export const expenseCategoryEnum = pgEnum('expense_category_t', [
  'food_drinks',
  'accommodation',
  'transport_fuel',
  'activities',
  'gear_equipment',
  'marina_berth',
]);

/** Split típusok: equal (default), custom, percentage */
export const splitTypeEnum = pgEnum('split_type_t', [
  'equal',
  'custom',
  'percentage',
]);

/** Expense státusz: active, deleted (soft delete) */
export const expenseStatusEnum = pgEnum('expense_status_t', [
  'active',
  'deleted',
]);

/** Settlement fizetési mód: stripe (ajánlott), cash, bank_transfer */
export const settlementMethodEnum = pgEnum('settlement_method_t', [
  'stripe',
  'cash',
  'bank_transfer',
]);

/** Settlement státusz: pending, completed, failed, disputed */
export const settlementStatusEnum = pgEnum('settlement_status_t', [
  'pending',
  'completed',
  'failed',
  'disputed',
]);

// ============================================
// TÁBLA DEFINÍCIÓK
// ============================================

/**
 * expenses — Költségbejegyzések
 *
 * Offline-first: A-kategória, append-only szinkron.
 * Idempotency: `local_id` field (kliens-generált UUID).
 */
export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    payerId: uuid('payer_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),

    // Összeg adatok
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    amountInPrimary: decimal('amount_in_primary', { precision: 10, scale: 2 }),
    exchangeRate: decimal('exchange_rate', { precision: 10, scale: 6 }),

    // Kategorizálás
    category: expenseCategoryEnum('category').notNull(),
    description: varchar('description', { length: 500 }),

    // Bizonylat
    receiptUrl: text('receipt_url'),
    receiptThumbnailUrl: text('receipt_thumbnail_url'),

    // Dátum és típus
    date: date('date').notNull().defaultNow(),
    splitType: splitTypeEnum('split_type').notNull().default('equal'),

    // Státusz
    status: expenseStatusEnum('status').notNull().default('active'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    // Offline sync (A-kategória)
    localId: uuid('local_id'),
    syncStatus: syncStatusEnum('sync_status').notNull().default('synced'),
    localUpdatedAt: timestamp('local_updated_at', { withTimezone: true }),
    deviceId: varchar('device_id', { length: 64 }),
    syncVersion: integer('sync_version').notNull().default(1),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_expenses_trip').on(table.tripId),
    index('idx_expenses_payer').on(table.payerId),
    index('idx_expenses_trip_date').on(table.tripId, table.date),
    index('idx_expenses_trip_category').on(table.tripId, table.category),
    check('expenses_amount_check', sql`${table.amount} > 0 AND ${table.amount} <= 99999.99`),
  ]
);

/**
 * expense_splits — Elosztás részletei
 *
 * Egy expense → N split (egy per résztvevő).
 * Equal: amount = total/N, Custom: explicit amount, Percentage: explicit %.
 */
export const expenseSplits = pgTable(
  'expense_splits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    expenseId: uuid('expense_id')
      .notNull()
      .references(() => expenses.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),

    // Elosztási adatok
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    percentage: decimal('percentage', { precision: 5, scale: 2 }),

    // Settlement tracking
    isSettled: boolean('is_settled').notNull().default(false),
    settledAt: timestamp('settled_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_expense_splits_unique').on(table.expenseId, table.userId),
    index('idx_expense_splits_expense').on(table.expenseId),
    index('idx_expense_splits_user').on(table.userId),
  ]
);

/**
 * expense_balances — Denormalizált egyenlegek
 *
 * Materialized tábla: Inngest background job frissíti expense CRUD után.
 * balance > 0: receives (kap pénzt), balance < 0: owes (tartozik).
 */
export const expenseBalances = pgTable(
  'expense_balances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),

    // Egyenleg adatok
    totalPaid: decimal('total_paid', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    totalOwed: decimal('total_owed', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    balance: decimal('balance', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),

    // Számítás időbélyeg
    lastCalculatedAt: timestamp('last_calculated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_balances_trip_user').on(table.tripId, table.userId),
    index('idx_balances_trip').on(table.tripId),
    index('idx_balances_user').on(table.userId),
  ]
);

/**
 * settlements — Elszámolások
 *
 * Tartozások rendezése: Stripe (ajánlott), cash, bank transfer.
 * Cash/BT: mindkét fél megerősítése szükséges → auto-complete trigger.
 */
export const settlements = pgTable(
  'settlements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    payerId: uuid('payer_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    receiverId: uuid('receiver_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),

    // Összeg
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),

    // Fizetési mód és státusz
    method: settlementMethodEnum('method').notNull(),
    status: settlementStatusEnum('status').notNull().default('pending'),

    // Stripe integráció
    stripePaymentId: varchar('stripe_payment_id', { length: 100 }),

    // Cash/Bank Transfer megerősítés
    confirmedByPayer: boolean('confirmed_by_payer').notNull().default(false),
    confirmedByPayee: boolean('confirmed_by_payee').notNull().default(false),

    // Megjegyzések
    notes: text('notes'),

    // Timestamps
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_settlements_trip').on(table.tripId),
    index('idx_settlements_payer').on(table.payerId),
    index('idx_settlements_receiver').on(table.receiverId),
    index('idx_settlements_status').on(table.tripId, table.status),
    check('settlements_payer_not_receiver', sql`${table.payerId} != ${table.receiverId}`),
    check('settlements_amount_check', sql`${table.amount} > 0`),
  ]
);

/**
 * exchange_rates — Árfolyam cache
 *
 * ECB API (elsődleges) + Fixer.io (fallback), napi frissítés Inngest cron-nal.
 */
export const exchangeRates = pgTable(
  'exchange_rates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    baseCurrency: varchar('base_currency', { length: 3 })
      .notNull()
      .default('EUR'),
    targetCurrency: varchar('target_currency', { length: 3 }).notNull(),
    rate: decimal('rate', { precision: 10, scale: 6 }).notNull(),
    source: varchar('source', { length: 20 }).notNull().default('ecb'),
    rateDate: date('rate_date').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_exchange_rates_unique').on(
      table.baseCurrency,
      table.targetCurrency,
      table.rateDate
    ),
    index('idx_exchange_rates_date').on(table.rateDate),
    index('idx_exchange_rates_pair').on(
      table.baseCurrency,
      table.targetCurrency,
      table.rateDate
    ),
  ]
);

// ============================================
// RELATIONS
// ============================================

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  trip: one(trips, {
    fields: [expenses.tripId],
    references: [trips.id],
  }),
  payer: one(profiles, {
    fields: [expenses.payerId],
    references: [profiles.id],
  }),
  splits: many(expenseSplits),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseSplits.expenseId],
    references: [expenses.id],
  }),
  user: one(profiles, {
    fields: [expenseSplits.userId],
    references: [profiles.id],
  }),
}));

export const expenseBalancesRelations = relations(expenseBalances, ({ one }) => ({
  trip: one(trips, {
    fields: [expenseBalances.tripId],
    references: [trips.id],
  }),
  user: one(profiles, {
    fields: [expenseBalances.userId],
    references: [profiles.id],
  }),
}));

export const settlementsRelations = relations(settlements, ({ one }) => ({
  trip: one(trips, {
    fields: [settlements.tripId],
    references: [trips.id],
  }),
  payer: one(profiles, {
    fields: [settlements.payerId],
    references: [profiles.id],
    relationName: 'settlementPayer',
  }),
  receiver: one(profiles, {
    fields: [settlements.receiverId],
    references: [profiles.id],
    relationName: 'settlementReceiver',
  }),
}));

// ============================================
// TYPE EXPORTS
// ============================================

/** Expense select type */
export type Expense = typeof expenses.$inferSelect;
/** Expense insert type */
export type NewExpense = typeof expenses.$inferInsert;

/** ExpenseSplit select type */
export type ExpenseSplit = typeof expenseSplits.$inferSelect;
/** ExpenseSplit insert type */
export type NewExpenseSplit = typeof expenseSplits.$inferInsert;

/** ExpenseBalance select type */
export type ExpenseBalance = typeof expenseBalances.$inferSelect;
/** ExpenseBalance insert type */
export type NewExpenseBalance = typeof expenseBalances.$inferInsert;

/** Settlement select type */
export type Settlement = typeof settlements.$inferSelect;
/** Settlement insert type */
export type NewSettlement = typeof settlements.$inferInsert;

/** ExchangeRate select type */
export type ExchangeRate = typeof exchangeRates.$inferSelect;
/** ExchangeRate insert type */
export type NewExchangeRate = typeof exchangeRates.$inferInsert;

/** Expense category enum values */
export type ExpenseCategory = (typeof expenseCategoryEnum.enumValues)[number];
/** Split type enum values */
export type SplitType = (typeof splitTypeEnum.enumValues)[number];
/** Expense status enum values */
export type ExpenseStatus = (typeof expenseStatusEnum.enumValues)[number];
/** Settlement method enum values */
export type SettlementMethod = (typeof settlementMethodEnum.enumValues)[number];
/** Settlement status enum values */
export type SettlementStatus = (typeof settlementStatusEnum.enumValues)[number];
