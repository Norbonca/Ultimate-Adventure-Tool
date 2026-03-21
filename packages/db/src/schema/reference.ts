// ============================================================================
// Reference Data — Drizzle ORM Schema
// ============================================================================
// Táblák: ref_countries, ref_languages, ref_currencies, ref_timezones
// Cél: Normalizált referencia adatok országokhoz, nyelvekhez, valutákhoz
// ============================================================================

import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ============================================================================
// 1. ref_countries — Országok (ISO 3166-1)
// ============================================================================
export const refCountries = pgTable(
  'ref_countries',
  {
    /** ISO 3166-1 alpha-2 (PK) — pl. "HU", "DE", "HR" */
    code: varchar('code', { length: 2 }).primaryKey(),
    /** ISO 3166-1 alpha-3 — pl. "HUN", "DEU", "HRV" */
    alpha3: varchar('alpha3', { length: 3 }).notNull(),
    /** ISO 3166-1 numeric — pl. 348, 276, 191 */
    numericCode: varchar('numeric_code', { length: 3 }).notNull(),
    /** Angol név */
    nameEn: varchar('name_en', { length: 100 }).notNull(),
    /** Magyar név */
    nameHu: varchar('name_hu', { length: 100 }).notNull(),
    /** Német név */
    nameDe: varchar('name_de', { length: 100 }),
    /** Natív név (helyi nyelven) */
    nameNative: varchar('name_native', { length: 100 }),
    /** Földrész */
    continent: varchar('continent', { length: 20 }).notNull(),
    /** Alrégió (Central Europe, Southern Europe, stb.) */
    subRegion: varchar('sub_region', { length: 50 }),
    /** Nemzetközi telefonhívó kód — pl. "+36", "+49" */
    phoneCode: varchar('phone_code', { length: 8 }).notNull(),
    /** Alapértelmezett valuta kód (FK → ref_currencies.code) */
    defaultCurrency: varchar('default_currency', { length: 3 }).notNull(),
    /** Elsődleges nyelv kód (FK → ref_languages.code) */
    primaryLanguage: varchar('primary_language', { length: 5 }).notNull(),
    /** Zászló emoji — pl. "🇭🇺" */
    flagEmoji: varchar('flag_emoji', { length: 4 }),
    /** EU tagállam-e */
    isEu: boolean('is_eu').notNull().default(false),
    /** Euroövezet tagja-e */
    isEurozone: boolean('is_eurozone').notNull().default(false),
    /** Schengen-övezet tagja-e */
    isSchengen: boolean('is_schengen').notNull().default(false),
    /** Trevu célpiac (target market) prioritás: 1=elsődleges, 2=másodlagos, null=egyéb */
    marketPriority: integer('market_priority'),
    /** PPP árszorzó (1.0 = alap, <1.0 = olcsóbb piac) */
    pppMultiplier: decimal('ppp_multiplier', { precision: 3, scale: 2 }),
    /** Aktív-e a rendszerben */
    isActive: boolean('is_active').notNull().default(true),
    /** Rendezési sorrend */
    sortOrder: integer('sort_order').notNull().default(999),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_ref_countries_alpha3').on(table.alpha3),
    index('idx_ref_countries_continent').on(table.continent),
    index('idx_ref_countries_active').on(table.isActive),
    index('idx_ref_countries_market').on(table.marketPriority),
  ]
);

// ============================================================================
// 2. ref_languages — Nyelvek (ISO 639-1 / IETF BCP 47)
// ============================================================================
export const refLanguages = pgTable(
  'ref_languages',
  {
    /** ISO 639-1 kód vagy IETF tag — pl. "hu", "en", "de" */
    code: varchar('code', { length: 5 }).primaryKey(),
    /** Angol név */
    nameEn: varchar('name_en', { length: 80 }).notNull(),
    /** Magyar név */
    nameHu: varchar('name_hu', { length: 80 }).notNull(),
    /** Natív név (saját nyelvén) — pl. "Magyar", "Deutsch" */
    nameNative: varchar('name_native', { length: 80 }).notNull(),
    /** Írásirány: "ltr" vagy "rtl" */
    direction: varchar('direction', { length: 3 }).notNull().default('ltr'),
    /** Trevu app UI nyelveként támogatott-e */
    isAppSupported: boolean('is_app_supported').notNull().default(false),
    /** Tartalom nyelveként (trip leírás stb.) elérhető-e */
    isContentLanguage: boolean('is_content_language').notNull().default(true),
    /** Rendezési sorrend */
    sortOrder: integer('sort_order').notNull().default(999),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_ref_languages_app_supported').on(table.isAppSupported),
    index('idx_ref_languages_active').on(table.isActive),
  ]
);

// ============================================================================
// 3. ref_currencies — Valuták (ISO 4217)
// ============================================================================
export const refCurrencies = pgTable(
  'ref_currencies',
  {
    /** ISO 4217 kód — pl. "EUR", "HUF", "CZK" */
    code: varchar('code', { length: 3 }).primaryKey(),
    /** ISO 4217 numeric */
    numericCode: varchar('numeric_code', { length: 3 }),
    /** Angol név */
    nameEn: varchar('name_en', { length: 80 }).notNull(),
    /** Magyar név */
    nameHu: varchar('name_hu', { length: 80 }).notNull(),
    /** Szimbólum — pl. "€", "Ft", "Kč" */
    symbol: varchar('symbol', { length: 6 }).notNull(),
    /** Tizedesjegyek száma */
    decimalDigits: integer('decimal_digits').notNull().default(2),
    /** Ezres elválasztó */
    thousandsSeparator: varchar('thousands_separator', { length: 1 }).notNull().default(','),
    /** Tizedes elválasztó */
    decimalSeparator: varchar('decimal_separator', { length: 1 }).notNull().default('.'),
    /** Szimbólum pozíciója: "prefix" vagy "suffix" */
    symbolPosition: varchar('symbol_position', { length: 6 }).notNull().default('prefix'),
    /** Formátum minta — pl. "€1,234.56", "1 234,56 Ft" */
    formatExample: varchar('format_example', { length: 30 }),
    /** Stripe támogatja-e */
    isStripeSupported: boolean('is_stripe_supported').notNull().default(false),
    /** Trevu rendszerben aktív-e */
    isActive: boolean('is_active').notNull().default(true),
    /** Rendezési sorrend */
    sortOrder: integer('sort_order').notNull().default(999),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_ref_currencies_active').on(table.isActive),
    index('idx_ref_currencies_stripe').on(table.isStripeSupported),
  ]
);

// ============================================================================
// 4. ref_timezones — Időzónák (IANA)
// ============================================================================
export const refTimezones = pgTable(
  'ref_timezones',
  {
    /** IANA timezone azonosító — pl. "Europe/Budapest" */
    tzId: varchar('tz_id', { length: 50 }).primaryKey(),
    /** Megjelenítendő név — pl. "Budapest (CET/CEST)" */
    displayName: varchar('display_name', { length: 80 }).notNull(),
    /** UTC eltolás percben (téli idő) — pl. 60 = UTC+1 */
    utcOffsetMinutes: integer('utc_offset_minutes').notNull(),
    /** UTC eltolás szöveges — pl. "UTC+01:00" */
    utcOffsetText: varchar('utc_offset_text', { length: 10 }).notNull(),
    /** Van-e nyári időszámítás */
    hasDst: boolean('has_dst').notNull().default(false),
    /** Melyik országhoz tartozik (alpha-2) */
    countryCode: varchar('country_code', { length: 2 }).notNull(),
    /** Rendezési sorrend */
    sortOrder: integer('sort_order').notNull().default(999),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_ref_timezones_country').on(table.countryCode),
    index('idx_ref_timezones_active').on(table.isActive),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const refCountriesRelations = relations(refCountries, ({ one, many }) => ({
  currency: one(refCurrencies, {
    fields: [refCountries.defaultCurrency],
    references: [refCurrencies.code],
  }),
  language: one(refLanguages, {
    fields: [refCountries.primaryLanguage],
    references: [refLanguages.code],
  }),
  timezones: many(refTimezones),
}));

export const refTimezonesRelations = relations(refTimezones, ({ one }) => ({
  country: one(refCountries, {
    fields: [refTimezones.countryCode],
    references: [refCountries.code],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type RefCountry = typeof refCountries.$inferSelect;
export type NewRefCountry = typeof refCountries.$inferInsert;

export type RefLanguage = typeof refLanguages.$inferSelect;
export type NewRefLanguage = typeof refLanguages.$inferInsert;

export type RefCurrency = typeof refCurrencies.$inferSelect;
export type NewRefCurrency = typeof refCurrencies.$inferInsert;

export type RefTimezone = typeof refTimezones.$inferSelect;
export type NewRefTimezone = typeof refTimezones.$inferInsert;
