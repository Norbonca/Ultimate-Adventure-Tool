// ============================================================================
// ref_avatar_images — Drizzle ORM Schema
// ============================================================================
// Előre feltöltött rendszer avatar-ok amit a user kiválaszthat profilképként
// 3 típus: icon (kaland sziluettek), nature (tájkép közelítések), abstract (geometrikus minták)
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
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================================================
// ref_avatar_images — Avatar könyvtár
// ============================================================================

export const refAvatarImages = pgTable(
  'ref_avatar_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Avatar típus: icon (sziluettek), nature (tájkép), abstract (geometrikus) */
    type: text('type').notNull().default('icon'),

    /** Kép URL */
    url: text('url').notNull(),
    /** Előnézeti kép URL (kisebb méret) */
    thumbnailUrl: text('thumbnail_url'),

    /** Alt szöveg (accessibility) */
    altText: text('alt_text').notNull().default(''),
    /** Lokalizált alt szöveg — { "hu": "...", "en": "..." } */
    altTextLocalized: jsonb('alt_text_localized').default({}),

    /** Keresési kulcsszavak */
    tags: text('tags').array().default(sql`'{}'`),

    /** Aktív-e (megjelenik a választóban) */
    isActive: boolean('is_active').notNull().default(true),
    /** Rendezési sorrend */
    sortOrder: integer('sort_order').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_ref_avatar_images_type').on(table.type),
    index('idx_ref_avatar_images_active_sort').on(table.isActive, table.sortOrder),
  ]
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type RefAvatarImage = typeof refAvatarImages.$inferSelect;
export type NewRefAvatarImage = typeof refAvatarImages.$inferInsert;
