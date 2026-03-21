// ============================================================================
// M01 — User Management: Drizzle ORM Schema
// ============================================================================
// Modul:       M01
// Fájl:        packages/db/src/schema/m01-user.ts
// ORM:         Drizzle ORM (PostgreSQL)
// Verzió:      2.0.0
// Dátum:       2026-02-17
// ============================================================================

import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  date,
  timestamp,
  inet,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';

// ============================================================================
// ENUM DEFINÍCIÓK
// ============================================================================

export const subscriptionTierEnum = pgEnum('subscription_tier_t', [
  'free',
  'pro',
  'business',
  'enterprise',
  'community',
  'seasonal',
]);

export const genderEnum = pgEnum('gender_t', [
  'male',
  'female',
  'other',
  'prefer_not_to_say',
]);

export const profileVisibilityEnum = pgEnum('profile_visibility_t', [
  'public',
  'registered',
  'private',
]);

export const visibilityEnum = pgEnum('visibility_t', [
  'public',
  'hidden',
]);

export const phoneVisibilityEnum = pgEnum('phone_visibility_t', [
  'trip_companions_only',
  'hidden',
]);

export const locationPrecisionEnum = pgEnum('location_precision_t', [
  'city_country',
  'country_only',
  'hidden',
]);

export const tripHistoryVisibilityEnum = pgEnum('trip_history_visibility_t', [
  'public',
  'followers_only',
  'private',
]);

export const skillLevelEnum = pgEnum('skill_level_t', [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
]);

export const authProviderEnum = pgEnum('auth_provider_t', [
  'email',
  'phone',
  'google',
  'facebook',
  'apple',
]);

export const deviceTypeEnum = pgEnum('device_type_t', [
  'web',
  'mobile',
  'tablet',
]);

// ============================================================================
// TÁBLÁK
// ============================================================================

// ----------------------------------------------------------------------------
// profiles — Felhasználói profil (1:1 auth.users kiterjesztés)
// ----------------------------------------------------------------------------
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),  // = auth.users.id
  displayName: varchar('display_name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 60 }).notNull(),
  firstName: varchar('first_name', { length: 50 }).notNull().default(''),
  lastName: varchar('last_name', { length: 50 }).default(''),
  email: varchar('email', { length: 254 }),
  phone: varchar('phone', { length: 20 }),
  avatarUrl: text('avatar_url'),
  bio: varchar('bio', { length: 500 }),
  locationCity: varchar('location_city', { length: 100 }),
  countryCode: varchar('country_code', { length: 2 }),
  dateOfBirth: date('date_of_birth'),
  gender: genderEnum('gender'),
  subscriptionTier: subscriptionTierEnum('subscription_tier').notNull().default('free'),
  subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 50 }),
  reputationPoints: integer('reputation_points').notNull().default(0),
  reputationLevel: integer('reputation_level').notNull().default(1),
  profileVisibility: profileVisibilityEnum('profile_visibility').notNull().default('public'),
  showEmail: boolean('show_email').notNull().default(false),
  showPhone: boolean('show_phone').notNull().default(false),
  preferredLanguage: varchar('preferred_language', { length: 5 }).notNull().default('hu'),
  preferredCurrency: varchar('preferred_currency', { length: 3 }).notNull().default('EUR'),
  timezone: varchar('timezone', { length: 50 }),
  twoFaEnabled: boolean('two_fa_enabled').notNull().default(false),
  verifiedOrganizer: boolean('verified_organizer').notNull().default(false),
  emailVerified: boolean('email_verified').notNull().default(false),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  syncVersion: integer('sync_version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('idx_profiles_slug').on(table.slug),
  index('idx_profiles_email').on(table.email),
  index('idx_profiles_phone').on(table.phone),
  index('idx_profiles_subscription_tier').on(table.subscriptionTier),
  index('idx_profiles_country_code').on(table.countryCode),
  index('idx_profiles_last_active').on(table.lastActiveAt),
  check('chk_profiles_reputation_level', sql`reputation_level >= 1 AND reputation_level <= 5`),
  check('chk_profiles_reputation_points', sql`reputation_points >= 0`),
]);

// ----------------------------------------------------------------------------
// user_skills — Felhasználói készségek (kategóriánként 1)
// ----------------------------------------------------------------------------
export const userSkills = pgTable('user_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull(),  // FK → M02.categories (cross-module)
  skillLevel: skillLevelEnum('skill_level').notNull().default('beginner'),
  yearsExperience: integer('years_experience'),
  certifications: text('certifications').array().default(sql`'{}'`),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_user_skills_user_category').on(table.userId, table.categoryId),
  index('idx_user_skills_user_id').on(table.userId),
  index('idx_user_skills_category_id').on(table.categoryId),
  index('idx_user_skills_level').on(table.skillLevel),
  check('chk_user_skills_years', sql`years_experience IS NULL OR (years_experience >= 0 AND years_experience <= 50)`),
]);

// ----------------------------------------------------------------------------
// emergency_contacts — Vészhelyzeti kontaktok (max 3/felhasználó)
// ----------------------------------------------------------------------------
export const emergencyContacts = pgTable('emergency_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  relationship: varchar('relationship', { length: 50 }).notNull(),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_emergency_contacts_user_id').on(table.userId),
]);

// ----------------------------------------------------------------------------
// user_follows — Követési kapcsolatok (M:N self-referenciális)
// ----------------------------------------------------------------------------
export const userFollows = pgTable('user_follows', {
  followerId: uuid('follower_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  followingId: uuid('following_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.followerId, table.followingId] }),
  index('idx_user_follows_follower').on(table.followerId),
  index('idx_user_follows_following').on(table.followingId),
  check('chk_user_follows_no_self', sql`follower_id != following_id`),
]);

// ----------------------------------------------------------------------------
// user_sessions — Aktív munkamenetek
// ----------------------------------------------------------------------------
export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).notNull(),
  deviceType: deviceTypeEnum('device_type').notNull().default('web'),
  deviceName: varchar('device_name', { length: 100 }),
  browser: varchar('browser', { length: 100 }),
  ipAddress: inet('ip_address'),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_user_sessions_user_id').on(table.userId),
  index('idx_user_sessions_token_hash').on(table.refreshTokenHash),
  index('idx_user_sessions_expires').on(table.expiresAt),
]);

// ----------------------------------------------------------------------------
// user_credentials — Multi-auth provider linking
// ----------------------------------------------------------------------------
export const userCredentials = pgTable('user_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  provider: authProviderEnum('provider').notNull(),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  credentialsJson: text('credentials_json').$type<Record<string, unknown>>(),
  linkedAt: timestamp('linked_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_user_credentials_provider_id').on(table.provider, table.providerId),
  uniqueIndex('uq_user_credentials_user_provider').on(table.userId, table.provider),
  index('idx_user_credentials_user_id').on(table.userId),
]);

// ----------------------------------------------------------------------------
// user_privacy_settings — Adatvédelmi beállítások (1:1 profiles)
// ----------------------------------------------------------------------------
export const userPrivacySettings = pgTable('user_privacy_settings', {
  userId: uuid('user_id').primaryKey().references(() => profiles.id, { onDelete: 'cascade' }),
  profileVisibility: profileVisibilityEnum('profile_visibility').notNull().default('public'),
  emailVisibility: visibilityEnum('email_visibility').notNull().default('hidden'),
  phoneVisibility: phoneVisibilityEnum('phone_visibility').notNull().default('hidden'),
  locationPrecision: locationPrecisionEnum('location_precision').notNull().default('city_country'),
  tripHistoryVisibility: tripHistoryVisibilityEnum('trip_history_visibility').notNull().default('public'),
  onlineStatusVisible: boolean('online_status_visible').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ----------------------------------------------------------------------------
// user_adventure_interests — Kalandérdeklődések (M:N join tábla)
// ----------------------------------------------------------------------------
export const userAdventureInterests = pgTable('user_adventure_interests', {
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull(),  // FK → M02.categories (cross-module)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.categoryId] }),
  index('idx_user_interests_user_id').on(table.userId),
  index('idx_user_interests_category_id').on(table.categoryId),
]);

// ============================================================================
// RELATION DEFINÍCIÓK (Drizzle Relations API)
// ============================================================================

export const profilesRelations = relations(profiles, ({ many, one }) => ({
  skills: many(userSkills),
  emergencyContacts: many(emergencyContacts),
  sessions: many(userSessions),
  credentials: many(userCredentials),
  interests: many(userAdventureInterests),
  privacySettings: one(userPrivacySettings, {
    fields: [profiles.id],
    references: [userPrivacySettings.userId],
  }),
  // Self-referenciális follow kapcsolatok
  following: many(userFollows, { relationName: 'follower' }),
  followers: many(userFollows, { relationName: 'following' }),
}));

export const userSkillsRelations = relations(userSkills, ({ one }) => ({
  user: one(profiles, {
    fields: [userSkills.userId],
    references: [profiles.id],
  }),
  // category: one(categories) — M02 modulban definiálva
}));

export const emergencyContactsRelations = relations(emergencyContacts, ({ one }) => ({
  user: one(profiles, {
    fields: [emergencyContacts.userId],
    references: [profiles.id],
  }),
}));

export const userFollowsRelations = relations(userFollows, ({ one }) => ({
  follower: one(profiles, {
    fields: [userFollows.followerId],
    references: [profiles.id],
    relationName: 'follower',
  }),
  following: one(profiles, {
    fields: [userFollows.followingId],
    references: [profiles.id],
    relationName: 'following',
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(profiles, {
    fields: [userSessions.userId],
    references: [profiles.id],
  }),
}));

export const userCredentialsRelations = relations(userCredentials, ({ one }) => ({
  user: one(profiles, {
    fields: [userCredentials.userId],
    references: [profiles.id],
  }),
}));

export const userPrivacySettingsRelations = relations(userPrivacySettings, ({ one }) => ({
  user: one(profiles, {
    fields: [userPrivacySettings.userId],
    references: [profiles.id],
  }),
}));

export const userAdventureInterestsRelations = relations(userAdventureInterests, ({ one }) => ({
  user: one(profiles, {
    fields: [userAdventureInterests.userId],
    references: [profiles.id],
  }),
  // category: one(categories) — M02 modulban definiálva
}));

// ============================================================================
// TYPESCRIPT TÍPUS EXPORTOK
// ============================================================================

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type UserSkill = typeof userSkills.$inferSelect;
export type NewUserSkill = typeof userSkills.$inferInsert;

export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type NewEmergencyContact = typeof emergencyContacts.$inferInsert;

export type UserFollow = typeof userFollows.$inferSelect;
export type NewUserFollow = typeof userFollows.$inferInsert;

export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;

export type UserCredential = typeof userCredentials.$inferSelect;
export type NewUserCredential = typeof userCredentials.$inferInsert;

export type UserPrivacySettings = typeof userPrivacySettings.$inferSelect;
export type NewUserPrivacySettings = typeof userPrivacySettings.$inferInsert;

export type UserAdventureInterest = typeof userAdventureInterests.$inferSelect;
export type NewUserAdventureInterest = typeof userAdventureInterests.$inferInsert;

// Enum típus exportok
export type SubscriptionTier = (typeof subscriptionTierEnum.enumValues)[number];
export type Gender = (typeof genderEnum.enumValues)[number];
export type ProfileVisibility = (typeof profileVisibilityEnum.enumValues)[number];
export type SkillLevel = (typeof skillLevelEnum.enumValues)[number];
export type AuthProvider = (typeof authProviderEnum.enumValues)[number];
export type DeviceType = (typeof deviceTypeEnum.enumValues)[number];
