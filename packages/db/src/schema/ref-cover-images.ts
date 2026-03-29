// ============================================================================
// ref_cover_images — Drizzle ORM Schema
// ============================================================================
// Előre feltöltött stock/AI képek amit a user kiválaszthat cover image-ként
// Kategóriánként 3-4 kép + univerzális képek
// ============================================================================

import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  index,
  jsonb,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { categories, subDisciplines } from './m02-trip';

// ============================================================================
// ref_cover_images — Cover image könyvtár
// ============================================================================

export const refCoverImages = pgTable(
  'ref_cover_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Kategória kötés — NULL = univerzális, minden kategóriához használható */
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    /** Alkategória kötés (opcionális, finomabb szűrés) */
    subDisciplineId: uuid('sub_discipline_id').references(() => subDisciplines.id, { onDelete: 'set null' }),

    /** Teljes méretű kép URL */
    url: text('url').notNull(),
    /** Előnézeti kép URL (kisebb méret) */
    thumbnailUrl: text('thumbnail_url'),
    /** Alt szöveg (accessibility + SEO) */
    altText: text('alt_text').notNull().default(''),
    /** Lokalizált alt szöveg — { "hu": "...", "en": "..." } */
    altTextLocalized: jsonb('alt_text_localized').default({}),

    /** Kép forrása */
    source: text('source').notNull().default('stock'),
    /** Forrás-specifikus azonosító (pl. Unsplash photo ID) */
    sourceId: text('source_id'),
    /** Fotós neve (attribution) */
    photographer: text('photographer'),
    /** Fotós profil URL */
    photographerUrl: text('photographer_url'),
    /** Licenc típus */
    license: text('license').default('free'),

    /** Keresési kulcsszavak */
    tags: text('tags').array().default(sql`'{}'`),
    /** Domináns szín (hex) — UI-ban szín-alapú szűréshez */
    colorDominant: text('color_dominant'),
    /** Kép orientáció */
    orientation: text('orientation').default('landscape'),

    /** Aktív-e (megjelenik a választóban) */
    isActive: boolean('is_active').notNull().default(true),
    /** Kiemelt-e (elsőként jelenik meg) */
    isFeatured: boolean('is_featured').notNull().default(false),
    /** Rendezési sorrend */
    sortOrder: integer('sort_order').notNull().default(0),
    /** Használati számláló (melyik kép a legnépszerűbb) */
    usageCount: integer('usage_count').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_ref_cover_images_category').on(table.categoryId),
    index('idx_ref_cover_images_source').on(table.source),
    index('idx_ref_cover_images_featured').on(table.isFeatured),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const refCoverImagesRelations = relations(refCoverImages, ({ one }) => ({
  category: one(categories, {
    fields: [refCoverImages.categoryId],
    references: [categories.id],
  }),
  subDiscipline: one(subDisciplines, {
    fields: [refCoverImages.subDisciplineId],
    references: [subDisciplines.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type RefCoverImage = typeof refCoverImages.$inferSelect;
export type NewRefCoverImage = typeof refCoverImages.$inferInsert;
