// ============================================
// M02 — Trip Management: Drizzle ORM Schema
// ============================================
// Modul: M02
// Verzió: 2.0
// Dátum: 2026-02-17
// Architektúra: v2 (Startup-Optimized Modular Monolith)
// Fájl: packages/db/src/schema/m02-trip.ts
// ============================================

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  decimal,
  date,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { profiles } from './m01-user';

// ============================================
// 1. ENUM DEFINITIONS
// ============================================

export const categoryStatusEnum = pgEnum('category_status_t', [
  'active',
  'draft',
  'deprecated',
]);

export const tripStatusEnum = pgEnum('trip_status_t', [
  'draft',
  'published',
  'registration_open',
  'active',
  'completed',
  'cancelled',
  'archived',
]);

export const tripVisibilityEnum = pgEnum('trip_visibility_t', [
  'public',
  'followers_only',
  'private',
]);

export const participantStatusEnum = pgEnum('participant_status_t', [
  'pending',
  'approved',
  'approved_pending_payment',
  'participant',
  'rejected',
  'waitlisted',
  'cancelled',
]);

export const skillMatchEnum = pgEnum('skill_match_t', [
  'qualified',
  'skill_needed',
  'exceeds',
]);

export const crewSkillLevelEnum = pgEnum('crew_skill_level_t', [
  'any',
  'intermediate',
  'advanced',
  'expert',
]);

export const poiTypeEnum = pgEnum('poi_type_t', [
  'stop',
  'camp',
  'viewpoint',
  'activity',
  'danger',
  'custom',
]);

export const cancelReasonEnum = pgEnum('cancel_reason_t', [
  'organizer_decision',
  'insufficient_participants',
  'weather',
  'safety',
  'force_majeure',
]);

// ============================================
// 2. TABLE DEFINITIONS
// ============================================

// --------------------------------------------
// 2.1 categories — Kalandkategóriák (8 fix)
// --------------------------------------------
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 50 }).notNull(),
    nameLocalized: jsonb('name_localized').notNull().default({}),
    description: text('description'),
    descriptionLocalized: jsonb('description_localized'),
    iconName: varchar('icon_name', { length: 50 }).notNull(),
    colorHex: varchar('color_hex', { length: 7 }).notNull(),
    status: categoryStatusEnum('status').notNull().default('active'),
    displayOrder: integer('display_order').notNull(),
    parameterSchema: jsonb('parameter_schema'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_categories_status').on(table.status),
    index('idx_categories_order').on(table.displayOrder),
  ]
);

// --------------------------------------------
// 2.2 sub_disciplines — Alkategóriák
// --------------------------------------------
export const subDisciplines = pgTable(
  'sub_disciplines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    nameLocalized: jsonb('name_localized').notNull().default({}),
    description: text('description'),
    status: categoryStatusEnum('status').notNull().default('active'),
    displayOrder: integer('display_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_sub_disciplines_category_name').on(table.categoryId, table.name),
    index('idx_sub_disciplines_category').on(table.categoryId),
    index('idx_sub_disciplines_status').on(table.status),
  ]
);

// --------------------------------------------
// 2.3 environments — Tereptípusok
// --------------------------------------------
export const environments = pgTable(
  'environments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subDisciplineId: uuid('sub_discipline_id')
      .notNull()
      .references(() => subDisciplines.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    nameLocalized: jsonb('name_localized').notNull().default({}),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_environments_sub_discipline').on(table.subDisciplineId),
  ]
);

// --------------------------------------------
// 2.4 experience_level_descriptions — Szint leírások
// --------------------------------------------
export const experienceLevelDescriptions = pgTable(
  'experience_level_descriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    level: integer('level').notNull(),
    label: varchar('label', { length: 50 }).notNull(),
    description: text('description').notNull(),
    descriptionLocalized: jsonb('description_localized'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_exp_level_category').on(table.categoryId, table.level),
    check('chk_exp_level_range', sql`${table.level} >= 1 AND ${table.level} <= 5`),
  ]
);

// --------------------------------------------
// 2.5 trips — Túrák (központi entitás)
// --------------------------------------------
export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizerId: uuid('organizer_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    orgId: uuid('org_id'),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    subDisciplineId: uuid('sub_discipline_id')
      .references(() => subDisciplines.id, { onDelete: 'set null' }),

    // Basic Info
    title: varchar('title', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 250 }).notNull(),
    shortDescription: varchar('short_description', { length: 280 }),
    description: text('description').notNull(),
    coverImageUrl: text('cover_image_url'),

    // Difficulty & Location
    difficulty: integer('difficulty').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    meetingPoint: varchar('meeting_point', { length: 200 }),
    locationCountry: varchar('location_country', { length: 2 }).notNull(),
    locationRegion: varchar('location_region', { length: 100 }),
    locationCity: varchar('location_city', { length: 100 }),

    // Participants
    maxParticipants: integer('max_participants').notNull(),
    minParticipants: integer('min_participants').notNull().default(1),
    currentParticipants: integer('current_participants').notNull().default(0),

    // Pricing
    priceAmount: decimal('price_amount', { precision: 10, scale: 2 }),
    priceCurrency: varchar('price_currency', { length: 3 }).default('EUR'),
    priceIncludes: text('price_includes'),
    priceExcludes: text('price_excludes'),
    isCostSharing: boolean('is_cost_sharing').notNull().default(true),

    // Category-specific
    categoryDetails: jsonb('category_details'),
    tags: text('tags').array(),
    language: varchar('language', { length: 5 }).notNull().default('hu'),

    // Lifecycle
    status: tripStatusEnum('status').notNull().default('draft'),
    visibility: tripVisibilityEnum('visibility').notNull().default('public'),
    requireApproval: boolean('require_approval').notNull().default(true),
    autoAccept: boolean('auto_accept').notNull().default(false),
    registrationDeadline: timestamp('registration_deadline', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelledReason: varchar('cancelled_reason', { length: 50 }),

    // Template
    templateId: uuid('template_id'),

    // Sync & Timestamps
    syncVersion: integer('sync_version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idx_trips_slug').on(table.slug),
    index('idx_trips_organizer').on(table.organizerId),
    index('idx_trips_category').on(table.categoryId),
    index('idx_trips_status').on(table.status),
    index('idx_trips_dates').on(table.startDate, table.endDate),
    index('idx_trips_country').on(table.locationCountry),
    check('chk_trips_difficulty', sql`${table.difficulty} >= 1 AND ${table.difficulty} <= 5`),
    check('chk_trips_participants', sql`${table.maxParticipants} >= ${table.minParticipants} AND ${table.maxParticipants} >= 2`),
  ]
);

// --------------------------------------------
// 2.6 trip_crew_positions — Crew Pozíciók
// --------------------------------------------
export const tripCrewPositions = pgTable(
  'trip_crew_positions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    roleName: varchar('role_name', { length: 100 }).notNull(),
    description: text('description'),
    requiredSkillCategory: uuid('required_skill_category')
      .references(() => categories.id, { onDelete: 'set null' }),
    requiredSkillLevel: crewSkillLevelEnum('required_skill_level').notNull().default('any'),
    spots: integer('spots').notNull(),
    filledSpots: integer('filled_spots').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_crew_position_trip_role').on(table.tripId, table.roleName),
    index('idx_crew_positions_trip').on(table.tripId),
    check('chk_crew_spots', sql`${table.spots} >= 1 AND ${table.spots} <= 50`),
    check('chk_crew_filled', sql`${table.filledSpots} >= 0 AND ${table.filledSpots} <= ${table.spots}`),
  ]
);

// --------------------------------------------
// 2.7 trip_participants — Résztvevők & Jelentkezők
// --------------------------------------------
export const tripParticipants = pgTable(
  'trip_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    crewPositionId: uuid('crew_position_id')
      .references(() => tripCrewPositions.id, { onDelete: 'set null' }),

    // Application
    status: participantStatusEnum('status').notNull().default('pending'),
    applicationText: text('application_text'),
    skillMatch: skillMatchEnum('skill_match'),
    rejectionReason: text('rejection_reason'),

    // Timestamps
    appliedAt: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    checkedIn: boolean('checked_in').notNull().default(false),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),

    // Offline sync
    localId: uuid('local_id'),
    syncStatus: varchar('sync_status', { length: 20 }).notNull().default('synced'),
    syncVersion: integer('sync_version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_trip_participant').on(table.tripId, table.userId),
    index('idx_participants_trip').on(table.tripId),
    index('idx_participants_user').on(table.userId),
    index('idx_participants_status').on(table.tripId, table.status),
  ]
);

// --------------------------------------------
// 2.8 trip_itinerary_days — Itinerary Napok
// --------------------------------------------
export const tripItineraryDays = pgTable(
  'trip_itinerary_days',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    dayNumber: integer('day_number').notNull(),
    title: varchar('title', { length: 200 }),
    description: text('description'),
    date: date('date'),
    startLocation: varchar('start_location', { length: 200 }),
    endLocation: varchar('end_location', { length: 200 }),
    distanceKm: decimal('distance_km', { precision: 6, scale: 1 }),
    elevationGainM: integer('elevation_gain_m'),
    estimatedHours: decimal('estimated_hours', { precision: 4, scale: 1 }),
    routeGeojson: jsonb('route_geojson'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_itinerary_day').on(table.tripId, table.dayNumber),
    index('idx_itinerary_days_trip').on(table.tripId),
    check('chk_day_number', sql`${table.dayNumber} >= 1 AND ${table.dayNumber} <= 90`),
  ]
);

// --------------------------------------------
// 2.9 trip_pois — Points of Interest
// --------------------------------------------
export const tripPois = pgTable(
  'trip_pois',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    itineraryDayId: uuid('itinerary_day_id')
      .references(() => tripItineraryDays.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    poiType: poiTypeEnum('poi_type').notNull(),
    latitude: decimal('latitude', { precision: 10, scale: 7 }).notNull(),
    longitude: decimal('longitude', { precision: 10, scale: 7 }).notNull(),
    markerColor: varchar('marker_color', { length: 7 }),
    icon: varchar('icon', { length: 50 }),
    sortOrder: integer('sort_order').notNull().default(0),
    elevationM: integer('elevation_m'),
    photos: jsonb('photos'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_pois_trip').on(table.tripId),
    index('idx_pois_day').on(table.itineraryDayId),
  ]
);

// --------------------------------------------
// 2.10 trip_templates — Túra Sablonok
// --------------------------------------------
export const tripTemplates = pgTable(
  'trip_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    creatorId: uuid('creator_id')
      .references(() => profiles.id, { onDelete: 'set null' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    isPublic: boolean('is_public').notNull().default(false),
    isFeatured: boolean('is_featured').notNull().default(false),
    templateData: jsonb('template_data').notNull(),
    usageCount: integer('usage_count').notNull().default(0),
    status: categoryStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_templates_category').on(table.categoryId),
    index('idx_templates_creator').on(table.creatorId),
  ]
);

// ============================================
// 3. RELATIONS
// ============================================

export const categoriesRelations = relations(categories, ({ many }) => ({
  subDisciplines: many(subDisciplines),
  experienceLevels: many(experienceLevelDescriptions),
  trips: many(trips),
  templates: many(tripTemplates),
}));

export const subDisciplinesRelations = relations(subDisciplines, ({ one, many }) => ({
  category: one(categories, {
    fields: [subDisciplines.categoryId],
    references: [categories.id],
  }),
  environments: many(environments),
}));

export const environmentsRelations = relations(environments, ({ one }) => ({
  subDiscipline: one(subDisciplines, {
    fields: [environments.subDisciplineId],
    references: [subDisciplines.id],
  }),
}));

export const experienceLevelDescriptionsRelations = relations(
  experienceLevelDescriptions,
  ({ one }) => ({
    category: one(categories, {
      fields: [experienceLevelDescriptions.categoryId],
      references: [categories.id],
    }),
  })
);

export const tripsRelations = relations(trips, ({ one, many }) => ({
  organizer: one(profiles, {
    fields: [trips.organizerId],
    references: [profiles.id],
  }),
  category: one(categories, {
    fields: [trips.categoryId],
    references: [categories.id],
  }),
  subDiscipline: one(subDisciplines, {
    fields: [trips.subDisciplineId],
    references: [subDisciplines.id],
  }),
  crewPositions: many(tripCrewPositions),
  participants: many(tripParticipants),
  itineraryDays: many(tripItineraryDays),
  pois: many(tripPois),
}));

export const tripCrewPositionsRelations = relations(tripCrewPositions, ({ one, many }) => ({
  trip: one(trips, {
    fields: [tripCrewPositions.tripId],
    references: [trips.id],
  }),
  requiredCategory: one(categories, {
    fields: [tripCrewPositions.requiredSkillCategory],
    references: [categories.id],
  }),
  participants: many(tripParticipants),
}));

export const tripParticipantsRelations = relations(tripParticipants, ({ one }) => ({
  trip: one(trips, {
    fields: [tripParticipants.tripId],
    references: [trips.id],
  }),
  user: one(profiles, {
    fields: [tripParticipants.userId],
    references: [profiles.id],
  }),
  crewPosition: one(tripCrewPositions, {
    fields: [tripParticipants.crewPositionId],
    references: [tripCrewPositions.id],
  }),
}));

export const tripItineraryDaysRelations = relations(tripItineraryDays, ({ one, many }) => ({
  trip: one(trips, {
    fields: [tripItineraryDays.tripId],
    references: [trips.id],
  }),
  pois: many(tripPois),
}));

export const tripPoisRelations = relations(tripPois, ({ one }) => ({
  trip: one(trips, {
    fields: [tripPois.tripId],
    references: [trips.id],
  }),
  itineraryDay: one(tripItineraryDays, {
    fields: [tripPois.itineraryDayId],
    references: [tripItineraryDays.id],
  }),
}));

export const tripTemplatesRelations = relations(tripTemplates, ({ one }) => ({
  creator: one(profiles, {
    fields: [tripTemplates.creatorId],
    references: [profiles.id],
  }),
  category: one(categories, {
    fields: [tripTemplates.categoryId],
    references: [categories.id],
  }),
}));

// ============================================
// 4. TYPE EXPORTS
// ============================================

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type SubDiscipline = typeof subDisciplines.$inferSelect;
export type NewSubDiscipline = typeof subDisciplines.$inferInsert;

export type Environment = typeof environments.$inferSelect;
export type NewEnvironment = typeof environments.$inferInsert;

export type ExperienceLevelDescription = typeof experienceLevelDescriptions.$inferSelect;
export type NewExperienceLevelDescription = typeof experienceLevelDescriptions.$inferInsert;

export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;

export type TripCrewPosition = typeof tripCrewPositions.$inferSelect;
export type NewTripCrewPosition = typeof tripCrewPositions.$inferInsert;

export type TripParticipant = typeof tripParticipants.$inferSelect;
export type NewTripParticipant = typeof tripParticipants.$inferInsert;

export type TripItineraryDay = typeof tripItineraryDays.$inferSelect;
export type NewTripItineraryDay = typeof tripItineraryDays.$inferInsert;

export type TripPoi = typeof tripPois.$inferSelect;
export type NewTripPoi = typeof tripPois.$inferInsert;

export type TripTemplate = typeof tripTemplates.$inferSelect;
export type NewTripTemplate = typeof tripTemplates.$inferInsert;

// Status & Enum types
export type CategoryStatus = (typeof categoryStatusEnum.enumValues)[number];
export type TripStatus = (typeof tripStatusEnum.enumValues)[number];
export type TripVisibility = (typeof tripVisibilityEnum.enumValues)[number];
export type ParticipantStatus = (typeof participantStatusEnum.enumValues)[number];
export type SkillMatch = (typeof skillMatchEnum.enumValues)[number];
export type CrewSkillLevel = (typeof crewSkillLevelEnum.enumValues)[number];
export type PoiType = (typeof poiTypeEnum.enumValues)[number];
export type CancelReason = (typeof cancelReasonEnum.enumValues)[number];
