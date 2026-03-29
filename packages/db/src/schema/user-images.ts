// ============================================================================
// user_images — Drizzle ORM Schema
// ============================================================================
// Felhasználók személyes képgalériája
// Egyszer feltöltött képek többször használhatók (cover, kártya, galéria, avatar)
// ============================================================================

import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ============================================================================
// user_images — Személyes képgaléria
// ============================================================================

export const userImages = pgTable(
  'user_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),

    // Kép adatok
    url: text('url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    originalFilename: text('original_filename').notNull().default(''),
    fileSize: integer('file_size').notNull().default(0),
    width: integer('width'),
    height: integer('height'),
    mimeType: text('mime_type').notNull().default('image/jpeg'),

    // Szervezés
    tags: text('tags').array().default(sql`'{}'`),
    altText: text('alt_text').default(''),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_user_images_user_id').on(table.userId),
    index('idx_user_images_created').on(table.createdAt),
  ]
);

export type UserImage = typeof userImages.$inferSelect;
export type NewUserImage = typeof userImages.$inferInsert;
