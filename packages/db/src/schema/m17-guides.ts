/**
 * M17 - Local Guides Marketplace — Drizzle ORM Schema
 *
 * Tablak: guide_profiles, guide_categories, guide_languages, guide_services,
 *         guide_certifications, guide_identity_documents, guide_portfolio_images,
 *         guide_availability, guide_availability_rules, guide_bookings,
 *         guide_earnings, guide_payouts, guide_reviews,
 *         guide_message_threads, guide_messages, guide_disputes, guide_admin_actions
 *
 * Kapcsolatok: M01 (profiles), M02 (trips/categories)
 *
 * @module packages/db/src/schema/guide-marketplace.ts
 * @version 2.0.0
 * @date 2026-02-19
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
  jsonb,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { profiles } from './user'; // M01

// ============================================
// ENUM DEFINICIOK
// ============================================

/**
 * Guide profil tipusok
 * professional: hivatasos turavezeto (UIAA, IFMGA, stb.)
 * local_expert: helyi szakerto (tapasztalat alapu, nincs formalis kepesites)
 * activity_specialist: tevekenyseg-specialista (pl. termeszetfotos, madarlesz)
 */
export const guideTypeEnum = pgEnum('guide_type_t', [
  'professional',
  'local_expert',
  'activity_specialist',
]);

/**
 * Guide profil statuszok
 * draft: piszkozat, pending_review: admin review varakozas,
 * active: aktiv, suspended: felfuggesztett, banned: tiltott
 */
export const guideStatusEnum = pgEnum('guide_status_t', [
  'draft',
  'pending_review',
  'active',
  'suspended',
  'banned',
]);

/**
 * Guide verifikacios statuszok
 * unverified: nincs verifikacio, pending: verifikacio folyamatban,
 * verified: verifikalt (Verified Guide badge), expired: lejart
 */
export const guideVerificationStatusEnum = pgEnum('guide_verification_status_t', [
  'unverified',
  'pending',
  'verified',
  'expired',
]);

/**
 * Kepesites tipusok
 * mountain_guide_uiaa, sailing_instructor_rya, diving_padi, stb.
 */
export const certificationTypeEnum = pgEnum('certification_type_t', [
  'mountain_guide_uiaa',
  'mountain_guide_ifmga',
  'sailing_instructor_rya',
  'sailing_instructor_asa',
  'diving_padi',
  'diving_ssi',
  'wilderness_first_responder',
  'first_aid',
  'ski_instructor',
  'kayak_instructor',
  'climbing_instructor',
  'surf_instructor',
  'cycling_guide',
  'other',
]);

/**
 * Kepesites verifikacios statusz
 * pending: verifikacira var, verified: admin jovahagyta,
 * rejected: admin elutasitotta, expired: lejart
 */
export const certificationStatusEnum = pgEnum('certification_status_t', [
  'pending',
  'verified',
  'rejected',
  'expired',
]);

/**
 * Szemelyazonosito dokumentum tipusok
 */
export const identityDocumentTypeEnum = pgEnum('identity_document_type_t', [
  'id_card',
  'passport',
  'drivers_license',
]);

/**
 * Szolgaltatas tipusok
 * half_day: ~4-5 ora, full_day: ~8-10 ora, multi_day: tobbnapos,
 * per_trip: teljes tura, hourly: oras alapu
 */
export const guideServiceTypeEnum = pgEnum('guide_service_type_t', [
  'half_day',
  'full_day',
  'multi_day',
  'per_trip',
  'hourly',
]);

/**
 * Nyelvtudasi szintek
 * native: anyanyelvi, fluent: folyekony, conversational: tarsalgasi
 */
export const languageProficiencyEnum = pgEnum('language_proficiency_t', [
  'native',
  'fluent',
  'conversational',
]);

/**
 * Elrhetosegi statusz
 * available: elrheto (zold), blocked: blokkolt (szurke), booked: foglalt (kek)
 */
export const availabilityStatusEnum = pgEnum('availability_status_t', [
  'available',
  'blocked',
  'booked',
]);

/**
 * Elrhetosegi szabaly tipusok
 * recurring_weekly: heti ismtetlodes, seasonal: szezonalis, one_time: egyszeri
 */
export const availabilityRuleTypeEnum = pgEnum('availability_rule_type_t', [
  'recurring_weekly',
  'seasonal',
  'one_time',
]);

/**
 * Foglalasi statuszok
 * requested: kerelem elkuldve, accepted: guide elfogadta (fizetes szukseges),
 * declined: guide elutasitotta, expired: 24h timeout,
 * confirmed: fizetes sikeres, active: tura folyamatban,
 * completed: teljesitett, cancelled: lemondott, disputed: vita nyitva
 */
export const bookingStatusEnum = pgEnum('booking_status_t', [
  'requested',
  'accepted',
  'declined',
  'expired',
  'confirmed',
  'active',
  'completed',
  'cancelled',
  'disputed',
]);

/**
 * Foglalasi fizetes statuszok
 * pending: varakozik, paid: kifizetve (escrow), refunded: teljes visszaterites,
 * partially_refunded: reszleges visszaterites
 */
export const bookingPaymentStatusEnum = pgEnum('booking_payment_status_t', [
  'pending',
  'paid',
  'refunded',
  'partially_refunded',
]);

/**
 * Lemondas kezdemenyezoje
 */
export const cancellationActorEnum = pgEnum('cancellation_actor_t', [
  'organizer',
  'guide',
  'admin',
  'system',
]);

/**
 * Guide bevetel statuszok
 * pending: escrow-ban, available: kiutalhato, paid_out: kiutalva, disputed: vita alatt
 */
export const earningStatusEnum = pgEnum('earning_status_t', [
  'pending',
  'available',
  'paid_out',
  'disputed',
]);

/**
 * Guide kifizetes statuszok
 * pending: varakozik, processing: Stripe transfer inditva,
 * completed: sikeres, failed: sikertelen
 */
export const guidePayoutStatusEnum = pgEnum('guide_payout_status_t', [
  'pending',
  'processing',
  'completed',
  'failed',
]);

/**
 * Vita statuszok
 * open: nyitva, under_review: admin vizsgalja, resolved: megoldva, closed: lezarva
 */
export const disputeStatusEnum = pgEnum('dispute_status_t', [
  'open',
  'under_review',
  'resolved',
  'closed',
]);

/**
 * Vita feloldas tipusok
 */
export const disputeResolutionEnum = pgEnum('dispute_resolution_t', [
  'full_refund',
  'partial_refund',
  'no_refund',
  'warning_guide',
  'warning_organizer',
]);

// ============================================
// TABLA DEFINICIOK
// ============================================

/**
 * guide_profiles — Guide profilok
 *
 * A Trevu guide piacter kozponti entitasa.
 * Egy usernek max 1 guide profilja. PostGIS lokacio, denormalizalt statisztikak.
 * Cache: Redis 15 perc TTL, guide.profile_updated event-re invalidacio.
 */
export const guideProfiles = pgTable(
  'guide_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => profiles.id, { onDelete: 'restrict' }),

    // Profil alapadatok
    displayName: varchar('display_name', { length: 80 }).notNull(),
    bio: text('bio').notNull(),
    tagline: varchar('tagline', { length: 120 }).notNull(),
    profilePhotoUrl: text('profile_photo_url').notNull(),

    // Lokacio
    country: varchar('country', { length: 2 }).notNull(),
    region: varchar('region', { length: 100 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    operatingRadiusKm: integer('operating_radius_km').notNull().default(100),
    // PostGIS location tarolasa text-kent — PostGIS muveletek SQL-en keresztul
    // (Drizzle nativ PostGIS tamogatas hianyzik)
    lat: decimal('lat', { precision: 10, scale: 7 }),
    lng: decimal('lng', { precision: 10, scale: 7 }),

    // Szaktudas
    guideType: guideTypeEnum('guide_type').notNull().default('local_expert'),
    experienceYears: integer('experience_years').notNull(),
    maxGroupSize: integer('max_group_size').notNull(),

    // Penznem
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),

    // Statusz es verifikacio
    status: guideStatusEnum('status').notNull().default('draft'),
    verificationStatus: guideVerificationStatusEnum('verification_status')
      .notNull()
      .default('unverified'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),

    // Stripe Connect
    stripeConnectId: varchar('stripe_connect_id', { length: 100 }),
    payoutEnabled: boolean('payout_enabled').notNull().default(false),

    // Denormalizalt statisztikak
    averageRating: decimal('average_rating', { precision: 3, scale: 2 }),
    totalReviews: integer('total_reviews').notNull().default(0),
    totalBookings: integer('total_bookings').notNull().default(0),
    completedBookings: integer('completed_bookings').notNull().default(0),
    responseRate: decimal('response_rate', { precision: 5, scale: 2 }),
    responseTimeHours: decimal('response_time_hours', { precision: 6, scale: 2 }),

    // Platform jutalek
    commissionRate: decimal('commission_rate', { precision: 4, scale: 2 })
      .notNull()
      .default('12.00'),

    // Metadata
    metadata: jsonb('metadata'),

    // Soft delete
    deletedAt: timestamp('deleted_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_guide_profiles_user').on(table.userId),
    index('idx_guide_profiles_status').on(table.status),
    index('idx_guide_profiles_type').on(table.guideType),
    index('idx_guide_profiles_verification').on(table.verificationStatus),
    index('idx_guide_profiles_country').on(table.country),
    index('idx_guide_profiles_country_region').on(table.country, table.region),
    index('idx_guide_profiles_rating').on(table.averageRating),
    index('idx_guide_profiles_stripe').on(table.stripeConnectId),
    check(
      'guide_profiles_experience_check',
      sql`${table.experienceYears} >= 0 AND ${table.experienceYears} <= 60`
    ),
    check(
      'guide_profiles_group_check',
      sql`${table.maxGroupSize} >= 1 AND ${table.maxGroupSize} <= 100`
    ),
    check(
      'guide_profiles_radius_check',
      sql`${table.operatingRadiusKm} >= 10 AND ${table.operatingRadiusKm} <= 500`
    ),
    check(
      'guide_profiles_rating_check',
      sql`${table.averageRating} IS NULL OR (${table.averageRating} >= 1.0 AND ${table.averageRating} <= 5.0)`
    ),
    check(
      'guide_profiles_commission_check',
      sql`${table.commissionRate} >= 0 AND ${table.commissionRate} <= 30`
    ),
  ]
);

/**
 * guide_categories — Guide-ok kategoriai
 *
 * Many-to-many: guide <-> M02 kategoriak.
 * Alkategoriak es nehezsegi szint (1-5).
 */
export const guideCategories = pgTable(
  'guide_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => guideProfiles.id, { onDelete: 'cascade' }),
    categorySlug: varchar('category_slug', { length: 50 }).notNull(),
    subcategorySlugs: text('subcategory_slugs').array(),
    maxDifficultyLevel: integer('max_difficulty_level').notNull().default(3),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_guide_categories_unique').on(table.guideId, table.categorySlug),
    index('idx_guide_categories_guide').on(table.guideId),
    index('idx_guide_categories_slug').on(table.categorySlug),
    check(
      'guide_categories_difficulty_check',
      sql`${table.maxDifficultyLevel} >= 1 AND ${table.maxDifficultyLevel} <= 5`
    ),
  ]
);

/**
 * guide_languages — Guide nyelvtudas
 *
 * Nyelv + szint (native/fluent/conversational). Min. 1 nyelv kotelezo.
 */
export const guideLanguages = pgTable(
  'guide_languages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => guideProfiles.id, { onDelete: 'cascade' }),
    languageCode: varchar('language_code', { length: 5 }).notNull(),
    proficiency: languageProficiencyEnum('proficiency')
      .notNull()
      .default('conversational'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_guide_languages_unique').on(table.guideId, table.languageCode),
    index('idx_guide_languages_guide').on(table.guideId),
    index('idx_guide_languages_code').on(table.languageCode),
  ]
);

/**
 * guide_services — Guide szolgaltatasok
 *
 * Szolgaltatas tipusok es arazsas. Guide szabadon definialhato szolgaltatasok.
 */
export const guideServices = pgTable(
  'guide_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => guideProfiles.id, { onDelete: 'cascade' }),

    serviceType: guideServiceTypeEnum('service_type').notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    priceAmount: decimal('price_amount', { precision: 10, scale: 2 }).notNull(),
    priceCurrency: varchar('price_currency', { length: 3 }).notNull().default('EUR'),
    durationHours: decimal('duration_hours', { precision: 6, scale: 2 }),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_guide_services_guide').on(table.guideId),
    index('idx_guide_services_type').on(table.serviceType),
    check(
      'guide_services_price_check',
      sql`${table.priceAmount} >= 1.00 AND ${table.priceAmount} <= 9999.99`
    ),
    check(
      'guide_services_duration_check',
      sql`${table.durationHours} IS NULL OR (${table.durationHours} >= 0.5 AND ${table.durationHours} <= 720)`
    ),
  ]
);

/**
 * guide_certifications — Kepesitesek
 *
 * Tanusitvanyfeltoltes es admin-review verifikacio.
 * Lejarat figyelese: 30 nappal lejarat elott ertesites.
 */
export const guideCertifications = pgTable(
  'guide_certifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => guideProfiles.id, { onDelete: 'cascade' }),

    certificationType: certificationTypeEnum('certification_type').notNull(),
    customTypeName: varchar('custom_type_name', { length: 100 }),
    issuingOrganization: varchar('issuing_organization', { length: 100 }).notNull(),
    certificateNumber: varchar('certificate_number', { length: 50 }),
    issueDate: date('issue_date').notNull(),
    expiryDate: date('expiry_date'),

    documentUrl: text('document_url').notNull(),
    documentEncrypted: boolean('document_encrypted').notNull().default(true),

    verificationStatus: certificationStatusEnum('verification_status')
      .notNull()
      .default('pending'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedBy: uuid('verified_by').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    rejectionReason: text('rejection_reason'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_guide_certifications_guide').on(table.guideId),
    index('idx_guide_certifications_status').on(table.verificationStatus),
    index('idx_guide_certifications_expiry').on(table.expiryDate),
  ]
);

/**
 * guide_identity_documents — Szemelyazonosito dokumentumok
 *
 * GDPR: verifikacio utan 90 nappal automatikus torles.
 */
export const guideIdentityDocuments = pgTable(
  'guide_identity_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => guideProfiles.id, { onDelete: 'cascade' }),

    documentType: identityDocumentTypeEnum('document_type').notNull(),
    documentUrl: text('document_url').notNull(),
    verified: boolean('verified').notNull().default(false),

    autoDeleteAt: timestamp('auto_delete_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_guide_identity_docs_guide').on(table.guideId),
    index('idx_guide_identity_docs_autodelete').on(table.autoDeleteAt),
  ]
);

/**
 * guide_portfolio_images — Portfolio kepek
 *
 * Max 20 kep guide-onkent. Drag & drop rendezesi sorrend.
 */
export const guidePortfolioImages = pgTable(
  'guide_portfolio_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => guideProfiles.id, { onDelete: 'cascade' }),

    imageUrl: text('image_url').notNull(),
    caption: varchar('caption', { length: 200 }),
    sortOrder: integer('sort_order').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_guide_portfolio_guide').on(table.guideId),
    index('idx_guide_portfolio_sort').on(table.guideId, table.sortOrder),
  ]
);

/**
 * guide_availability — Napi elrhetoseg
 *
 * Napi granularitas: available/blocked/booked.
 * Foglalasok automatikusan booked-re allitjak a relevan napokat.
 */
export const guideAvailability = pgTable(
  'guide_availability',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => guideProfiles.id, { onDelete: 'cascade' }),

    date: date('date').notNull(),
    status: availabilityStatusEnum('status').notNull().default('available'),
    bookingId: uuid('booking_id'),
    blockReason: varchar('block_reason', { length: 200 }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_guide_availability_unique').on(table.guideId, table.date),
    index('idx_guide_availability_guide').on(table.guideId),
    index('idx_guide_availability_date_status').on(table.date, table.status),
    index('idx_guide_availability_booking').on(table.bookingId),
  ]
);

/**
 * guide_availability_rules — Ismtetlodo elrhetosegi szabalyok
 *
 * recurring_weekly: heti mintazat (pl. kedd = blokkolt)
 * seasonal: szezonalis (pl. nov-marc = blokkolt)
 * one_time: egyszeri blokk
 */
export const guideAvailabilityRules = pgTable(
  'guide_availability_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => guideProfiles.id, { onDelete: 'cascade' }),

    ruleType: availabilityRuleTypeEnum('rule_type').notNull(),
    dayOfWeek: integer('day_of_week'), // 0=hetfo, 6=vasarnap
    seasonStart: date('season_start'),
    seasonEnd: date('season_end'),
    status: availabilityStatusEnum('status').notNull().default('blocked'),
    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_guide_avail_rules_guide').on(table.guideId),
    check(
      'guide_avail_rules_day_check',
      sql`${table.dayOfWeek} IS NULL OR (${table.dayOfWeek} >= 0 AND ${table.dayOfWeek} <= 6)`
    ),
  ]
);

/**
 * guide_bookings — Foglalasok
 *
 * A guide piacter kozponti tranzakcios tablaja.
 * Statusz flow: requested -> accepted/declined/expired -> confirmed -> active -> completed
 * Escrow: fizetes utan zarolva, teljesites + 48h utan feloldva.
 */
export const guideBookings = pgTable(
  'guide_bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingNumber: varchar('booking_number', { length: 20 }).notNull().unique(),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => guideProfiles.id, { onDelete: 'restrict' }),
    organizerId: uuid('organizer_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    tripId: uuid('trip_id'), // FK -> trips (nullable)
    serviceId: uuid('service_id')
      .notNull()
      .references(() => guideServices.id, { onDelete: 'restrict' }),

    // Szolgaltatas reszletek
    serviceType: guideServiceTypeEnum('service_type').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    participantCount: integer('participant_count').notNull(),
    specialRequests: text('special_requests'),

    // Arazsas
    guideFee: decimal('guide_fee', { precision: 10, scale: 2 }).notNull(),
    platformFee: decimal('platform_fee', { precision: 10, scale: 2 }).notNull(),
    totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),

    // Fizetes
    paymentStatus: bookingPaymentStatusEnum('payment_status')
      .notNull()
      .default('pending'),
    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 200 }),
    stripeCheckoutSessionId: varchar('stripe_checkout_session_id', { length: 200 }),
    escrowReleased: boolean('escrow_released').notNull().default(false),
    escrowReleasedAt: timestamp('escrow_released_at', { withTimezone: true }),

    // Statusz
    status: bookingStatusEnum('status').notNull().default('requested'),

    // Lemondas
    cancelledBy: cancellationActorEnum('cancelled_by'),
    cancellationReason: text('cancellation_reason'),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    refundAmount: decimal('refund_amount', { precision: 10, scale: 2 }),
    refundPercent: decimal('refund_percent', { precision: 5, scale: 2 }),

    // Idopontok
    requestedAt: timestamp('requested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    declinedAt: timestamp('declined_at', { withTimezone: true }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_guide_bookings_guide').on(table.guideId),
    index('idx_guide_bookings_organizer').on(table.organizerId),
    index('idx_guide_bookings_trip').on(table.tripId),
    index('idx_guide_bookings_status').on(table.status),
    index('idx_guide_bookings_guide_status').on(table.guideId, table.status),
    index('idx_guide_bookings_organizer_status').on(table.organizerId, table.status),
    index('idx_guide_bookings_dates').on(table.startDate, table.endDate),
    index('idx_guide_bookings_payment_status').on(table.paymentStatus),
    index('idx_guide_bookings_expires').on(table.expiresAt),
    index('idx_guide_bookings_stripe_pi').on(table.stripePaymentIntentId),
    index('idx_guide_bookings_stripe_session').on(table.stripeCheckoutSessionId),
    index('idx_guide_bookings_number').on(table.bookingNumber),
    check(
      'guide_bookings_dates_check',
      sql`${table.endDate} >= ${table.startDate}`
    ),
    check(
      'guide_bookings_fee_check',
      sql`${table.guideFee} > 0`
    ),
    check(
      'guide_bookings_total_check',
      sql`${table.totalAmount} >= ${table.guideFee}`
    ),
    check(
      'guide_bookings_participant_check',
      sql`${table.participantCount} >= 1`
    ),
  ]
);

/**
 * guide_earnings — Guide bevetelkezeles
 *
 * Escrow rendszer: pending (zar) -> available (feloldva) -> paid_out (kiutalva).
 * Egy foglalashoz egy bevetel rekord.
 */
export const guideEarnings = pgTable(
  'guide_earnings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => guideProfiles.id, { onDelete: 'restrict' }),
    bookingId: uuid('booking_id')
      .notNull()
      .unique()
      .references(() => guideBookings.id, { onDelete: 'restrict' }),

    grossAmount: decimal('gross_amount', { precision: 10, scale: 2 }).notNull(),
    platformFee: decimal('platform_fee', { precision: 10, scale: 2 }).notNull(),
    netAmount: decimal('net_amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),

    status: earningStatusEnum('status').notNull().default('pending'),
    availableAt: timestamp('available_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_guide_earnings_guide').on(table.guideId),
    index('idx_guide_earnings_status').on(table.status),
    index('idx_guide_earnings_guide_status').on(table.guideId, table.status),
    index('idx_guide_earnings_available').on(table.availableAt),
    check(
      'guide_earnings_gross_check',
      sql`${table.grossAmount} > 0`
    ),
    check(
      'guide_earnings_net_check',
      sql`${table.netAmount} > 0`
    ),
    check(
      'guide_earnings_fee_check',
      sql`${table.platformFee} >= 0`
    ),
  ]
);

/**
 * guide_payouts — Guide kifizetesek
 *
 * Stripe Connect Transfer. Minimum EUR 50 kifizetes.
 * Heti automatikus kifizetesi ciklus (vasarnap ejjel).
 */
export const guidePayouts = pgTable(
  'guide_payouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => guideProfiles.id, { onDelete: 'restrict' }),

    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    stripeTransferId: varchar('stripe_transfer_id', { length: 200 }),

    status: guidePayoutStatusEnum('status').notNull().default('pending'),
    failureReason: text('failure_reason'),
    retryCount: integer('retry_count').notNull().default(0),

    earningIds: uuid('earning_ids').array().notNull(),

    initiatedAt: timestamp('initiated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_guide_payouts_guide').on(table.guideId),
    index('idx_guide_payouts_status').on(table.status),
    index('idx_guide_payouts_guide_status').on(table.guideId, table.status),
    index('idx_guide_payouts_stripe').on(table.stripeTransferId),
    check(
      'guide_payouts_amount_check',
      sql`${table.amount} >= 50.00`
    ),
    check(
      'guide_payouts_retry_check',
      sql`${table.retryCount} >= 0 AND ${table.retryCount} <= 3`
    ),
  ]
);

/**
 * guide_reviews — Guide ertekelesek
 *
 * M06 Reviews & Ratings kiterjesztese guide-specifikus dimenziokkal.
 * 5 dimenzio (1-5 csillag), anonim: guide nem latja ki ertekelte.
 */
export const guideReviews = pgTable(
  'guide_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => guideProfiles.id, { onDelete: 'restrict' }),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => guideBookings.id, { onDelete: 'restrict' }),
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),

    // Ertkelesi dimenziok (1-5)
    expertiseRating: integer('expertise_rating').notNull(),
    communicationRating: integer('communication_rating').notNull(),
    punctualityRating: integer('punctuality_rating').notNull(),
    safetyRating: integer('safety_rating').notNull(),
    valueRating: integer('value_rating').notNull(),

    overallRating: decimal('overall_rating', { precision: 3, scale: 2 }).notNull(),

    reviewText: text('review_text'),

    // Guide valasz
    guideResponse: text('guide_response'),
    guideRespondedAt: timestamp('guide_responded_at', { withTimezone: true }),

    // Moderacio
    isVisible: boolean('is_visible').notNull().default(true),
    moderatedBy: uuid('moderated_by').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    moderatedAt: timestamp('moderated_at', { withTimezone: true }),
    moderationReason: text('moderation_reason'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_guide_reviews_unique').on(table.bookingId, table.reviewerId),
    index('idx_guide_reviews_guide').on(table.guideId),
    index('idx_guide_reviews_booking').on(table.bookingId),
    index('idx_guide_reviews_reviewer').on(table.reviewerId),
    index('idx_guide_reviews_guide_visible').on(table.guideId),
    check(
      'guide_reviews_expertise_check',
      sql`${table.expertiseRating} >= 1 AND ${table.expertiseRating} <= 5`
    ),
    check(
      'guide_reviews_communication_check',
      sql`${table.communicationRating} >= 1 AND ${table.communicationRating} <= 5`
    ),
    check(
      'guide_reviews_punctuality_check',
      sql`${table.punctualityRating} >= 1 AND ${table.punctualityRating} <= 5`
    ),
    check(
      'guide_reviews_safety_check',
      sql`${table.safetyRating} >= 1 AND ${table.safetyRating} <= 5`
    ),
    check(
      'guide_reviews_value_check',
      sql`${table.valueRating} >= 1 AND ${table.valueRating} <= 5`
    ),
  ]
);

/**
 * guide_message_threads — Guide-szervezo uzenet szalak
 *
 * Dedikalt message thread-ek (nem a trip chat).
 * Pre-booking es booking kontextusban egyarant.
 */
export const guideMessageThreads = pgTable(
  'guide_message_threads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => guideProfiles.id, { onDelete: 'restrict' }),
    organizerId: uuid('organizer_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    bookingId: uuid('booking_id').references(() => guideBookings.id, {
      onDelete: 'set null',
    }),

    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    guideUnreadCount: integer('guide_unread_count').notNull().default(0),
    organizerUnreadCount: integer('organizer_unread_count').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_guide_msg_threads_unique').on(
      table.guideId,
      table.organizerId,
      table.bookingId
    ),
    index('idx_guide_msg_threads_guide').on(table.guideId),
    index('idx_guide_msg_threads_organizer').on(table.organizerId),
    index('idx_guide_msg_threads_booking').on(table.bookingId),
    index('idx_guide_msg_threads_last_msg').on(table.lastMessageAt),
    check(
      'guide_msg_threads_unread_check',
      sql`${table.guideUnreadCount} >= 0 AND ${table.organizerUnreadCount} >= 0`
    ),
  ]
);

/**
 * guide_messages — Uzenetek
 *
 * Szoveg + csatolmany. Append-only modell (nem torolheto).
 */
export const guideMessages = pgTable(
  'guide_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => guideMessageThreads.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),

    content: text('content').notNull(),
    attachmentUrl: text('attachment_url'),

    readAt: timestamp('read_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_guide_messages_thread').on(table.threadId),
    index('idx_guide_messages_thread_created').on(table.threadId, table.createdAt),
    index('idx_guide_messages_sender').on(table.senderId),
  ]
);

/**
 * guide_disputes — Foglalasi vitak
 *
 * Egy foglalashoz max 1 vita. Admin elbiralasu vitakezeles.
 */
export const guideDisputes = pgTable(
  'guide_disputes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .unique()
      .references(() => guideBookings.id, { onDelete: 'restrict' }),
    openedBy: uuid('opened_by')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),

    reason: text('reason').notNull(),
    status: disputeStatusEnum('status').notNull().default('open'),

    assignedTo: uuid('assigned_to').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    resolution: disputeResolutionEnum('resolution'),
    resolutionNotes: text('resolution_notes'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: uuid('resolved_by').references(() => profiles.id, {
      onDelete: 'set null',
    }),

    refundAmount: decimal('refund_amount', { precision: 10, scale: 2 }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_guide_disputes_booking').on(table.bookingId),
    index('idx_guide_disputes_status').on(table.status),
    index('idx_guide_disputes_assigned').on(table.assignedTo),
  ]
);

/**
 * guide_admin_actions — Admin audit log
 *
 * Minden admin muvelet naplozva: activate, reject, suspend, ban, verify, stb.
 */
export const guideAdminActions = pgTable(
  'guide_admin_actions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    guideId: uuid('guide_id')
      .notNull()
      .references(() => guideProfiles.id, { onDelete: 'restrict' }),

    action: varchar('action', { length: 50 }).notNull(),
    reason: text('reason'),
    previousStatus: varchar('previous_status', { length: 50 }),
    newStatus: varchar('new_status', { length: 50 }),
    metadata: jsonb('metadata'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_guide_admin_actions_guide').on(table.guideId),
    index('idx_guide_admin_actions_admin').on(table.adminId),
    index('idx_guide_admin_actions_action').on(table.action),
    index('idx_guide_admin_actions_created').on(table.createdAt),
  ]
);

// ============================================
// RELATIONS
// ============================================

export const guideProfilesRelations = relations(guideProfiles, ({ one, many }) => ({
  user: one(profiles, {
    fields: [guideProfiles.userId],
    references: [profiles.id],
  }),
  categories: many(guideCategories),
  languages: many(guideLanguages),
  services: many(guideServices),
  certifications: many(guideCertifications),
  identityDocuments: many(guideIdentityDocuments),
  portfolioImages: many(guidePortfolioImages),
  availability: many(guideAvailability),
  availabilityRules: many(guideAvailabilityRules),
  bookings: many(guideBookings),
  earnings: many(guideEarnings),
  payouts: many(guidePayouts),
  reviews: many(guideReviews),
  messageThreads: many(guideMessageThreads),
  adminActions: many(guideAdminActions),
}));

export const guideCategoriesRelations = relations(guideCategories, ({ one }) => ({
  guide: one(guideProfiles, {
    fields: [guideCategories.guideId],
    references: [guideProfiles.id],
  }),
}));

export const guideLanguagesRelations = relations(guideLanguages, ({ one }) => ({
  guide: one(guideProfiles, {
    fields: [guideLanguages.guideId],
    references: [guideProfiles.id],
  }),
}));

export const guideServicesRelations = relations(guideServices, ({ one, many }) => ({
  guide: one(guideProfiles, {
    fields: [guideServices.guideId],
    references: [guideProfiles.id],
  }),
  bookings: many(guideBookings),
}));

export const guideCertificationsRelations = relations(
  guideCertifications,
  ({ one }) => ({
    guide: one(guideProfiles, {
      fields: [guideCertifications.guideId],
      references: [guideProfiles.id],
    }),
    verifier: one(profiles, {
      fields: [guideCertifications.verifiedBy],
      references: [profiles.id],
    }),
  })
);

export const guideIdentityDocumentsRelations = relations(
  guideIdentityDocuments,
  ({ one }) => ({
    guide: one(guideProfiles, {
      fields: [guideIdentityDocuments.guideId],
      references: [guideProfiles.id],
    }),
  })
);

export const guidePortfolioImagesRelations = relations(
  guidePortfolioImages,
  ({ one }) => ({
    guide: one(guideProfiles, {
      fields: [guidePortfolioImages.guideId],
      references: [guideProfiles.id],
    }),
  })
);

export const guideAvailabilityRelations = relations(guideAvailability, ({ one }) => ({
  guide: one(guideProfiles, {
    fields: [guideAvailability.guideId],
    references: [guideProfiles.id],
  }),
  booking: one(guideBookings, {
    fields: [guideAvailability.bookingId],
    references: [guideBookings.id],
  }),
}));

export const guideAvailabilityRulesRelations = relations(
  guideAvailabilityRules,
  ({ one }) => ({
    guide: one(guideProfiles, {
      fields: [guideAvailabilityRules.guideId],
      references: [guideProfiles.id],
    }),
  })
);

export const guideBookingsRelations = relations(guideBookings, ({ one, many }) => ({
  guide: one(guideProfiles, {
    fields: [guideBookings.guideId],
    references: [guideProfiles.id],
  }),
  organizer: one(profiles, {
    fields: [guideBookings.organizerId],
    references: [profiles.id],
  }),
  service: one(guideServices, {
    fields: [guideBookings.serviceId],
    references: [guideServices.id],
  }),
  earning: one(guideEarnings),
  reviews: many(guideReviews),
  messageThreads: many(guideMessageThreads),
  dispute: one(guideDisputes),
  availabilityDays: many(guideAvailability),
}));

export const guideEarningsRelations = relations(guideEarnings, ({ one }) => ({
  guide: one(guideProfiles, {
    fields: [guideEarnings.guideId],
    references: [guideProfiles.id],
  }),
  booking: one(guideBookings, {
    fields: [guideEarnings.bookingId],
    references: [guideBookings.id],
  }),
}));

export const guidePayoutsRelations = relations(guidePayouts, ({ one }) => ({
  guide: one(guideProfiles, {
    fields: [guidePayouts.guideId],
    references: [guideProfiles.id],
  }),
}));

export const guideReviewsRelations = relations(guideReviews, ({ one }) => ({
  guide: one(guideProfiles, {
    fields: [guideReviews.guideId],
    references: [guideProfiles.id],
  }),
  booking: one(guideBookings, {
    fields: [guideReviews.bookingId],
    references: [guideBookings.id],
  }),
  reviewer: one(profiles, {
    fields: [guideReviews.reviewerId],
    references: [profiles.id],
  }),
}));

export const guideMessageThreadsRelations = relations(
  guideMessageThreads,
  ({ one, many }) => ({
    guide: one(guideProfiles, {
      fields: [guideMessageThreads.guideId],
      references: [guideProfiles.id],
    }),
    organizer: one(profiles, {
      fields: [guideMessageThreads.organizerId],
      references: [profiles.id],
    }),
    booking: one(guideBookings, {
      fields: [guideMessageThreads.bookingId],
      references: [guideBookings.id],
    }),
    messages: many(guideMessages),
  })
);

export const guideMessagesRelations = relations(guideMessages, ({ one }) => ({
  thread: one(guideMessageThreads, {
    fields: [guideMessages.threadId],
    references: [guideMessageThreads.id],
  }),
  sender: one(profiles, {
    fields: [guideMessages.senderId],
    references: [profiles.id],
  }),
}));

export const guideDisputesRelations = relations(guideDisputes, ({ one }) => ({
  booking: one(guideBookings, {
    fields: [guideDisputes.bookingId],
    references: [guideBookings.id],
  }),
  opener: one(profiles, {
    fields: [guideDisputes.openedBy],
    references: [profiles.id],
    relationName: 'disputeOpener',
  }),
  assignee: one(profiles, {
    fields: [guideDisputes.assignedTo],
    references: [profiles.id],
    relationName: 'disputeAssignee',
  }),
  resolver: one(profiles, {
    fields: [guideDisputes.resolvedBy],
    references: [profiles.id],
    relationName: 'disputeResolver',
  }),
}));

export const guideAdminActionsRelations = relations(guideAdminActions, ({ one }) => ({
  admin: one(profiles, {
    fields: [guideAdminActions.adminId],
    references: [profiles.id],
  }),
  guide: one(guideProfiles, {
    fields: [guideAdminActions.guideId],
    references: [guideProfiles.id],
  }),
}));

// ============================================
// TYPE EXPORTOK
// ============================================

export type GuideProfile = typeof guideProfiles.$inferSelect;
export type NewGuideProfile = typeof guideProfiles.$inferInsert;

export type GuideCategory = typeof guideCategories.$inferSelect;
export type NewGuideCategory = typeof guideCategories.$inferInsert;

export type GuideLanguage = typeof guideLanguages.$inferSelect;
export type NewGuideLanguage = typeof guideLanguages.$inferInsert;

export type GuideService = typeof guideServices.$inferSelect;
export type NewGuideService = typeof guideServices.$inferInsert;

export type GuideCertification = typeof guideCertifications.$inferSelect;
export type NewGuideCertification = typeof guideCertifications.$inferInsert;

export type GuideIdentityDocument = typeof guideIdentityDocuments.$inferSelect;
export type NewGuideIdentityDocument = typeof guideIdentityDocuments.$inferInsert;

export type GuidePortfolioImage = typeof guidePortfolioImages.$inferSelect;
export type NewGuidePortfolioImage = typeof guidePortfolioImages.$inferInsert;

export type GuideAvailabilityRecord = typeof guideAvailability.$inferSelect;
export type NewGuideAvailabilityRecord = typeof guideAvailability.$inferInsert;

export type GuideAvailabilityRule = typeof guideAvailabilityRules.$inferSelect;
export type NewGuideAvailabilityRule = typeof guideAvailabilityRules.$inferInsert;

export type GuideBooking = typeof guideBookings.$inferSelect;
export type NewGuideBooking = typeof guideBookings.$inferInsert;

export type GuideEarning = typeof guideEarnings.$inferSelect;
export type NewGuideEarning = typeof guideEarnings.$inferInsert;

export type GuidePayout = typeof guidePayouts.$inferSelect;
export type NewGuidePayout = typeof guidePayouts.$inferInsert;

export type GuideReview = typeof guideReviews.$inferSelect;
export type NewGuideReview = typeof guideReviews.$inferInsert;

export type GuideMessageThread = typeof guideMessageThreads.$inferSelect;
export type NewGuideMessageThread = typeof guideMessageThreads.$inferInsert;

export type GuideMessage = typeof guideMessages.$inferSelect;
export type NewGuideMessage = typeof guideMessages.$inferInsert;

export type GuideDispute = typeof guideDisputes.$inferSelect;
export type NewGuideDispute = typeof guideDisputes.$inferInsert;

export type GuideAdminAction = typeof guideAdminActions.$inferSelect;
export type NewGuideAdminAction = typeof guideAdminActions.$inferInsert;
