// ============================================================================
// system_settings — Drizzle ORM Schema
// ============================================================================
// Globális key-value rendszerbeállítások. READ: bárki, WRITE: csak admin.
// Első use-case: trip_auto_approval_threshold (küszöb a require_approval defaulthoz).
// Lásd: supabase/migrations/023_system_settings.sql
// ============================================================================

import { pgTable, text, jsonb, uuid, timestamp } from 'drizzle-orm/pg-core';
import { profiles } from './m01-user';

export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedBy: uuid('updated_by').references(() => profiles.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type SystemSettingInsert = typeof systemSettings.$inferInsert;

// ============================================================================
// Well-known keys
// ============================================================================
export const SYSTEM_SETTING_KEYS = {
  /** Küszöb amely felett a require_approval alapértelmezetten false (auto-approval). */
  TRIP_AUTO_APPROVAL_THRESHOLD: 'trip_auto_approval_threshold',
} as const;
