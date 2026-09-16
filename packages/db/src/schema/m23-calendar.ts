// ============================================================================
// M23 Calendar — Drizzle ORM Schema
// ============================================================================
// Táblák: ref_calendar_period_types, ref_calendar_tags, ref_calendar_periods,
//         ref_calendar_occurrences, ref_calendar_period_tags
// Forrás: supabase/migrations/037_m23_calendar.sql (a CHECK-ek, az RLS és a
// szabálymotor-függvények ott élnek; ez a fájl a típusos hozzáféréshez kell)
// ============================================================================

import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  smallint,
  jsonb,
  uuid,
  date,
  timestamp,
  index,
  primaryKey,
  unique,
} from 'drizzle-orm/pg-core';
import { profiles } from './m01-user';
import { refCountries } from './reference';

type LocalizedLabel = { hu: string; en: string } & Record<string, string>;

export const refCalendarPeriodTypes = pgTable('ref_calendar_period_types', {
  key: varchar('key', { length: 40 }).primaryKey(),
  labelLocalized: jsonb('label_localized').$type<LocalizedLabel>().notNull(),
  canBeDayOff: boolean('can_be_day_off').notNull().default(false),
  iconKey: varchar('icon_key', { length: 50 }),
  sortOrder: integer('sort_order').notNull().default(999),
  status: varchar('status', { length: 10 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const refCalendarTags = pgTable('ref_calendar_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 40 }).notNull().unique(),
  labelLocalized: jsonb('label_localized').$type<LocalizedLabel>().notNull(),
  iconKey: varchar('icon_key', { length: 50 }),
  colorToken: varchar('color_token', { length: 40 }),
  sortOrder: integer('sort_order').notNull().default(999),
  status: varchar('status', { length: 10 }).notNull().default('active'),
  updatedBy: uuid('updated_by').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const refCalendarPeriods = pgTable(
  'ref_calendar_periods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: varchar('key', { length: 80 }).notNull(),
    labelLocalized: jsonb('label_localized').$type<LocalizedLabel>().notNull(),
    descriptionLocalized: jsonb('description_localized').$type<Record<string, string>>(),
    periodType: varchar('period_type', { length: 40 }).notNull().references(() => refCalendarPeriodTypes.key),
    countryCode: varchar('country_code', { length: 2 }).references(() => refCountries.code),
    subdivisionCode: varchar('subdivision_code', { length: 10 }),
    hemisphere: varchar('hemisphere', { length: 5 }),
    ruleKind: varchar('rule_kind', { length: 20 }).notNull(),
    ruleParams: jsonb('rule_params').$type<Record<string, unknown>>().notNull().default({}),
    durationDays: smallint('duration_days'),
    isDayOff: boolean('is_day_off').notNull().default(false),
    sourceText: text('source_text').notNull(),
    sourceUrl: text('source_url'),
    status: varchar('status', { length: 10 }).notNull().default('active'),
    updatedBy: uuid('updated_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('uq_ref_calendar_periods_scope_key').on(table.countryCode, table.subdivisionCode, table.key).nullsNotDistinct(),
    index('idx_ref_calendar_periods_country').on(table.countryCode, table.status),
    index('idx_ref_calendar_periods_type').on(table.periodType),
  ]
);

export const refCalendarOccurrences = pgTable(
  'ref_calendar_occurrences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    periodId: uuid('period_id').notNull().references(() => refCalendarPeriods.id, { onDelete: 'cascade' }),
    year: smallint('year').notNull(),
    earliest: date('earliest').notNull(),
    latest: date('latest').notNull(),
    status: varchar('status', { length: 10 }).notNull().default('entered'),
    verifiedBy: uuid('verified_by').references(() => profiles.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    sourceNote: text('source_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('uq_ref_calendar_occurrences_period_year').on(table.periodId, table.year),
    index('idx_ref_calendar_occurrences_range').on(table.earliest, table.latest),
    index('idx_ref_calendar_occurrences_period').on(table.periodId),
  ]
);

export const refCalendarPeriodTags = pgTable(
  'ref_calendar_period_tags',
  {
    periodId: uuid('period_id').notNull().references(() => refCalendarPeriods.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id').notNull().references(() => refCalendarTags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.periodId, table.tagId] }),
    index('idx_ref_calendar_period_tags_tag').on(table.tagId),
  ]
);

export type RefCalendarPeriod = typeof refCalendarPeriods.$inferSelect;
export type RefCalendarOccurrence = typeof refCalendarOccurrences.$inferSelect;
export type RefCalendarTag = typeof refCalendarTags.$inferSelect;
