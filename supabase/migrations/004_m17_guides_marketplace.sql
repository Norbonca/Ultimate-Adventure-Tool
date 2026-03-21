-- Part 4/4: M17 Local Guides Marketplace
-- ============================================
-- Local Guides Marketplace - Database Schema
-- ============================================
-- Modul: M17 - Local Guides Marketplace
-- Database: PostgreSQL 16+ (Supabase)
-- Encoding: UTF-8
-- Verzio: 2.0.0
-- Datum: 2026-02-19
-- ============================================
-- A Trevu platform helyi guide piactere:
--   - Guide profilok (professional, local expert, activity specialist)
--   - Guide kepresilesek es verifikacio
--   - Guide szolgaltatasok es arazsas
--   - Elrhetosegi naptar
--   - Foglalasi rendszer (booking lifecycle)
--   - Guide bevetelkezeles es kifizetesek (Stripe Connect)
--   - Guide ertekelesek meta (M06 kiterjesztes)
--   - Guide-szervezo uzenetvaltas
--   - Admin moderacio
-- ============================================

BEGIN;

-- ============================================
-- ENUM TIPUSOK
-- ============================================

-- Guide profil tipusok
CREATE TYPE guide_type_t AS ENUM (
  'professional',           -- Hivatasos turavezeto (kepesitest igazol)
  'local_expert',           -- Helyi szakerto (tapasztalat alapu)
  'activity_specialist'     -- Tevekenyseg-specialista (pl. termeszetfotos)
);

-- Guide profil statuszok
CREATE TYPE guide_status_t AS ENUM (
  'draft',                  -- Piszkozat (meg nem kuldve review-ra)
  'pending_review',         -- Admin review varakozas
  'active',                 -- Aktiv, keresheto a marketplace-en
  'suspended',              -- Felfuggesztett (admin altal)
  'banned'                  -- Veglegesen tiltott
);

-- Guide verifikacios statuszok
CREATE TYPE guide_verification_status_t AS ENUM (
  'unverified',             -- Nincs verifikacio (default)
  'pending',                -- Verifikacio folyamatban
  'verified',               -- Verifikalt (Verified Guide badge)
  'expired'                 -- Lejart kepesites
);

-- Kepesites tipusok
CREATE TYPE certification_type_t AS ENUM (
  'mountain_guide_uiaa',        -- Hegyivezeto UIAA
  'mountain_guide_ifmga',       -- Hegyivezeto IFMGA
  'sailing_instructor_rya',     -- Vitorlas oktato RYA
  'sailing_instructor_asa',     -- Vitorlas oktato ASA
  'diving_padi',                -- Buvar oktato PADI
  'diving_ssi',                 -- Buvar oktato SSI
  'wilderness_first_responder', -- Vadon elsoesegely
  'first_aid',                  -- Altalanos elsoesegely
  'ski_instructor',             -- Si oktato
  'kayak_instructor',           -- Kajak oktato
  'climbing_instructor',        -- Maszas oktato
  'surf_instructor',            -- Szorf oktato
  'cycling_guide',              -- Kerekpar vezeto
  'other'                       -- Egyeb (szabad szoveg)
);

-- Kepesites verifikacios statusz
CREATE TYPE certification_status_t AS ENUM (
  'pending',                -- Verifikacira var
  'verified',               -- Admin jovahagyta
  'rejected',               -- Admin elutasitotta
  'expired'                 -- Lejart
);

-- Szemelyazonosito dokumentum tipusok
CREATE TYPE identity_document_type_t AS ENUM (
  'id_card',                -- Szemelyi igazolvany
  'passport',               -- Utlevel
  'drivers_license'         -- Jogositvany
);

-- Szolgaltatas tipusok
CREATE TYPE guide_service_type_t AS ENUM (
  'half_day',               -- Felnapos (4-5 ora)
  'full_day',               -- Egesz napos (8-10 ora)
  'multi_day',              -- Tobbnapos
  'per_trip',               -- Teljes tura
  'hourly'                  -- Oras alapu
);

-- Nyelvtudasi szintek
CREATE TYPE language_proficiency_t AS ENUM (
  'native',                 -- Anyanyelvi
  'fluent',                 -- Folyekony
  'conversational'          -- Tarsalgasi szintu
);

-- Elrhetosegi statusz
CREATE TYPE availability_status_t AS ENUM (
  'available',              -- Elrheto (zold)
  'blocked',                -- Blokkolt (szurke)
  'booked'                  -- Foglalt (kek)
);

-- Elrhetosegi szabaly tipusok
CREATE TYPE availability_rule_type_t AS ENUM (
  'recurring_weekly',       -- Ismtetlodo heti (pl. kedd = blokkolt)
  'seasonal',               -- Szezonalis (pl. nov-marc = blokkolt)
  'one_time'                -- Egyszeri
);

-- Foglalasi statuszok
CREATE TYPE booking_status_t AS ENUM (
  'requested',              -- Szervezo kuldott foglalasi kerelmet
  'accepted',               -- Guide elfogadta (fizetes szukseges)
  'declined',               -- Guide elutasitotta
  'expired',                -- 24h timeout (guide nem valaszolt)
  'confirmed',              -- Fizetes sikeres, foglalt
  'active',                 -- Tura folyamatban
  'completed',              -- Teljesitett
  'cancelled',              -- Lemondott
  'disputed'                -- Vita nyitva
);

-- Foglalasi fizetes statuszok
CREATE TYPE booking_payment_status_t AS ENUM (
  'pending',                -- Varakozik (fizetes szukseges)
  'paid',                   -- Kifizetve (escrow)
  'refunded',               -- Teljes visszaterites
  'partially_refunded'      -- Reszleges visszaterites
);

-- Lemondas kezdemenyezoje
CREATE TYPE cancellation_actor_t AS ENUM (
  'organizer',              -- Szervezo mondta le
  'guide',                  -- Guide mondta le
  'admin',                  -- Admin mondta le
  'system'                  -- Rendszer (pl. timeout)
);

-- Guide bevetel statuszok
CREATE TYPE earning_status_t AS ENUM (
  'pending',                -- Escrow-ban (meg nem kiutalhato)
  'available',              -- Kiutalhato (escrow feloldva)
  'paid_out',               -- Kiutalva (Stripe transfer)
  'disputed'                -- Vita alatt
);

-- Guide kifizetes statuszok
CREATE TYPE guide_payout_status_t AS ENUM (
  'pending',                -- Osszegyujtve, varakozik feldolgozasra
  'processing',             -- Stripe Transfer inditva
  'completed',              -- Kiutalas sikeres
  'failed'                  -- Sikertelen (ujraproba szukseges)
);

-- Vita statuszok
CREATE TYPE dispute_status_t AS ENUM (
  'open',                   -- Nyitva
  'under_review',           -- Admin vizsgalja
  'resolved',               -- Megoldva
  'closed'                  -- Lezarva
);

-- Vita feloldas tipusok
CREATE TYPE dispute_resolution_t AS ENUM (
  'full_refund',            -- Teljes visszaterites a szervezonek
  'partial_refund',         -- Reszleges visszaterites
  'no_refund',              -- Nincs visszaterites
  'warning_guide',          -- Guide figyelmeztetese
  'warning_organizer'       -- Szervezo figyelmeztetese
);

-- ============================================
-- TABLAK
-- ============================================

-- ----------------------------------------
-- 1. guide_profiles - Guide profilok
-- ----------------------------------------
-- A Trevu guide piacter kozponti entitasa. Minden guide profil
-- egy M01 user kiterjesztese guide-specifikus adatokkal.
-- Egy usernek max 1 guide profilja lehet.
CREATE TABLE IF NOT EXISTS guide_profiles (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE RESTRICT,

  -- Profil alapadatok
  display_name                VARCHAR(80) NOT NULL,
  bio                         TEXT NOT NULL CHECK (char_length(bio) >= 50 AND char_length(bio) <= 2000),
  tagline                     VARCHAR(120) NOT NULL CHECK (char_length(tagline) >= 10),
  profile_photo_url           TEXT NOT NULL,

  -- Lokacio
  country                     VARCHAR(2) NOT NULL,     -- ISO 3166-1 alpha-2
  region                      VARCHAR(100) NOT NULL,
  city                        VARCHAR(100) NOT NULL,
  operating_radius_km         INTEGER NOT NULL DEFAULT 100 CHECK (operating_radius_km >= 10 AND operating_radius_km <= 500),
  location                    GEOGRAPHY(POINT, 4326),  -- PostGIS pont (guide bazis)

  -- Szaktudas
  guide_type                  guide_type_t NOT NULL DEFAULT 'local_expert',
  experience_years            INTEGER NOT NULL CHECK (experience_years >= 0 AND experience_years <= 60),
  max_group_size              INTEGER NOT NULL CHECK (max_group_size >= 1 AND max_group_size <= 100),

  -- Penznem
  currency                    VARCHAR(3) NOT NULL DEFAULT 'EUR',

  -- Statusz es verifikacio
  status                      guide_status_t NOT NULL DEFAULT 'draft',
  verification_status         guide_verification_status_t NOT NULL DEFAULT 'unverified',
  verified_at                 TIMESTAMPTZ,

  -- Stripe Connect
  stripe_connect_id           VARCHAR(100),   -- acct_XXXXXXXXXXXXX
  payout_enabled              BOOLEAN NOT NULL DEFAULT false,

  -- Denormalizalt statisztikak (cache-elt, hatterfeladat frissiti)
  average_rating              DECIMAL(3,2) CHECK (average_rating IS NULL OR (average_rating >= 1.0 AND average_rating <= 5.0)),
  total_reviews               INTEGER NOT NULL DEFAULT 0 CHECK (total_reviews >= 0),
  total_bookings              INTEGER NOT NULL DEFAULT 0 CHECK (total_bookings >= 0),
  completed_bookings          INTEGER NOT NULL DEFAULT 0 CHECK (completed_bookings >= 0),
  response_rate               DECIMAL(5,2) CHECK (response_rate IS NULL OR (response_rate >= 0 AND response_rate <= 100)),
  response_time_hours         DECIMAL(6,2),

  -- Platform jutalek (alapertelmezes: 12%, volume discount: 10%, premium: 8%)
  commission_rate             DECIMAL(4,2) NOT NULL DEFAULT 12.00
                              CHECK (commission_rate >= 0 AND commission_rate <= 30),

  -- Metadata
  metadata                    JSONB,        -- Rugalmas extra adatok

  -- Soft delete
  deleted_at                  TIMESTAMPTZ,

  -- Timestamps
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE guide_profiles IS 'M17: Guide profilok — professional, local_expert, activity_specialist';
COMMENT ON COLUMN guide_profiles.user_id IS 'M01 profiles FK — egy user max egy guide profil';
COMMENT ON COLUMN guide_profiles.location IS 'PostGIS POINT — guide bazis helye geospatial kereshez';
COMMENT ON COLUMN guide_profiles.commission_rate IS 'Platform jutalek %: standard 12%, volume 10%, premium 8%';
COMMENT ON COLUMN guide_profiles.stripe_connect_id IS 'Stripe Connected Account ID — kifizetesekhez';

-- Indexek
CREATE INDEX idx_guide_profiles_user ON guide_profiles(user_id);
CREATE INDEX idx_guide_profiles_status ON guide_profiles(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_guide_profiles_type ON guide_profiles(guide_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_guide_profiles_verification ON guide_profiles(verification_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_guide_profiles_country ON guide_profiles(country) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX idx_guide_profiles_country_region ON guide_profiles(country, region) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX idx_guide_profiles_rating ON guide_profiles(average_rating DESC NULLS LAST) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX idx_guide_profiles_stripe ON guide_profiles(stripe_connect_id) WHERE stripe_connect_id IS NOT NULL;
CREATE INDEX idx_guide_profiles_location ON guide_profiles USING GIST(location) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX idx_guide_profiles_active ON guide_profiles(id) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX idx_guide_profiles_pending ON guide_profiles(created_at) WHERE status = 'pending_review' AND deleted_at IS NULL;

-- ----------------------------------------
-- 2. guide_categories - Guide kategoriak
-- ----------------------------------------
-- Many-to-many: guide <-> M02 kategoriak
CREATE TABLE IF NOT EXISTS guide_categories (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id                    UUID NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,
  category_slug               VARCHAR(50) NOT NULL,     -- M02 kategoria slug (hiking, mountain, water, stb.)
  subcategory_slugs           TEXT[],                    -- Alkategoriak (alpine_hiking, via_ferrata, sailing, stb.)
  max_difficulty_level        INTEGER NOT NULL DEFAULT 3
                              CHECK (max_difficulty_level >= 1 AND max_difficulty_level <= 5),

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(guide_id, category_slug)
);

COMMENT ON TABLE guide_categories IS 'M17: Guide kategoriak — M02 kategoriakhoz kottes, alkategoriak, nehezsegi szint';
COMMENT ON COLUMN guide_categories.max_difficulty_level IS 'Milyen szintu csoportot tud vezetni: 1 (kezdo) - 5 (expert)';

CREATE INDEX idx_guide_categories_guide ON guide_categories(guide_id);
CREATE INDEX idx_guide_categories_slug ON guide_categories(category_slug);
CREATE INDEX idx_guide_categories_guide_slug ON guide_categories(guide_id, category_slug);

-- ----------------------------------------
-- 3. guide_languages - Guide nyelvtudas
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS guide_languages (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id                    UUID NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,
  language_code               VARCHAR(5) NOT NULL,      -- ISO 639-1 (hu, en, de, stb.)
  proficiency                 language_proficiency_t NOT NULL DEFAULT 'conversational',

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(guide_id, language_code)
);

COMMENT ON TABLE guide_languages IS 'M17: Guide nyelvtudas — nyelv + szint';

CREATE INDEX idx_guide_languages_guide ON guide_languages(guide_id);
CREATE INDEX idx_guide_languages_code ON guide_languages(language_code);

-- ----------------------------------------
-- 4. guide_services - Guide szolgaltatasok
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS guide_services (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id                    UUID NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,

  service_type                guide_service_type_t NOT NULL,
  name                        VARCHAR(100) NOT NULL,
  description                 TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  price_amount                DECIMAL(10,2) NOT NULL CHECK (price_amount >= 1.00 AND price_amount <= 9999.99),
  price_currency              VARCHAR(3) NOT NULL DEFAULT 'EUR',
  duration_hours              DECIMAL(6,2) CHECK (duration_hours IS NULL OR (duration_hours >= 0.5 AND duration_hours <= 720)),

  is_active                   BOOLEAN NOT NULL DEFAULT true,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE guide_services IS 'M17: Guide szolgaltatasok — tipusok es arazsas';
COMMENT ON COLUMN guide_services.duration_hours IS 'Szolgaltatas idotartama oraban (max 30 nap)';

CREATE INDEX idx_guide_services_guide ON guide_services(guide_id);
CREATE INDEX idx_guide_services_guide_active ON guide_services(guide_id) WHERE is_active = true;
CREATE INDEX idx_guide_services_type ON guide_services(service_type) WHERE is_active = true;

-- ----------------------------------------
-- 5. guide_certifications - Kepesitesek
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS guide_certifications (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id                    UUID NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,

  certification_type          certification_type_t NOT NULL,
  custom_type_name            VARCHAR(100),              -- 'other' tipushoz szabad szoveg
  issuing_organization        VARCHAR(100) NOT NULL,     -- "UIAA", "RYA", "PADI"
  certificate_number          VARCHAR(50),               -- Tanusitvany szam (nullable)
  issue_date                  DATE NOT NULL,
  expiry_date                 DATE,                      -- NULL = nem jar le

  -- Dokumentum (M08 Media)
  document_url                TEXT NOT NULL,              -- Feltoltott tanusitvany URL
  document_encrypted          BOOLEAN NOT NULL DEFAULT true,

  -- Verifikacio
  verification_status         certification_status_t NOT NULL DEFAULT 'pending',
  verified_at                 TIMESTAMPTZ,
  verified_by                 UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- Admin user
  rejection_reason            TEXT,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE guide_certifications IS 'M17: Guide kepesitesek — tanusitvanyfeltoltes es admin verifikacio';
COMMENT ON COLUMN guide_certifications.document_encrypted IS 'Dokumentum titkositott tarolasa (GDPR)';

CREATE INDEX idx_guide_certifications_guide ON guide_certifications(guide_id);
CREATE INDEX idx_guide_certifications_status ON guide_certifications(verification_status);
CREATE INDEX idx_guide_certifications_pending ON guide_certifications(created_at) WHERE verification_status = 'pending';
CREATE INDEX idx_guide_certifications_expiry ON guide_certifications(expiry_date) WHERE expiry_date IS NOT NULL AND verification_status = 'verified';

-- ----------------------------------------
-- 6. guide_identity_documents - Szemelyazonositok
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS guide_identity_documents (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id                    UUID NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,

  document_type               identity_document_type_t NOT NULL,
  document_url                TEXT NOT NULL,              -- Titkositett tarolas (M08)
  verified                    BOOLEAN NOT NULL DEFAULT false,

  -- GDPR: verifikacio utan 90 nappal automatikus torles
  auto_delete_at              TIMESTAMPTZ,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE guide_identity_documents IS 'M17: Szemelyazonosito dokumentumok — GDPR: 90 nap utan torles';

CREATE INDEX idx_guide_identity_docs_guide ON guide_identity_documents(guide_id);
CREATE INDEX idx_guide_identity_docs_autodelete ON guide_identity_documents(auto_delete_at) WHERE auto_delete_at IS NOT NULL;

-- ----------------------------------------
-- 7. guide_portfolio_images - Portfolio kepek
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS guide_portfolio_images (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id                    UUID NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,
  image_url                   TEXT NOT NULL,
  caption                     VARCHAR(200),
  sort_order                  INTEGER NOT NULL DEFAULT 0,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE guide_portfolio_images IS 'M17: Guide portfolio kepek — max 20/guide';

CREATE INDEX idx_guide_portfolio_guide ON guide_portfolio_images(guide_id);
CREATE INDEX idx_guide_portfolio_sort ON guide_portfolio_images(guide_id, sort_order);

-- ----------------------------------------
-- 8. guide_availability - Napi elrhetoseg
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS guide_availability (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id                    UUID NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,

  date                        DATE NOT NULL,
  status                      availability_status_t NOT NULL DEFAULT 'available',
  booking_id                  UUID,                      -- FK -> guide_bookings (ha booked)
  block_reason                VARCHAR(200),              -- Guide altal megadott ok

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(guide_id, date)
);

COMMENT ON TABLE guide_availability IS 'M17: Guide napi elrhetosegi naptar — available/blocked/booked';

CREATE INDEX idx_guide_availability_guide ON guide_availability(guide_id);
CREATE INDEX idx_guide_availability_guide_date ON guide_availability(guide_id, date);
CREATE INDEX idx_guide_availability_date_status ON guide_availability(date, status) WHERE status = 'available';
CREATE INDEX idx_guide_availability_booking ON guide_availability(booking_id) WHERE booking_id IS NOT NULL;

-- ----------------------------------------
-- 9. guide_availability_rules - Ismtetlodo szabalyok
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS guide_availability_rules (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id                    UUID NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,

  rule_type                   availability_rule_type_t NOT NULL,
  day_of_week                 INTEGER CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
                                                        -- 0=hetfo, 6=vasarnap (recurring_weekly)
  season_start                DATE,                      -- Szezon kezdete (seasonal)
  season_end                  DATE,                      -- Szezon vege (seasonal)
  status                      availability_status_t NOT NULL DEFAULT 'blocked',
  is_active                   BOOLEAN NOT NULL DEFAULT true,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: recurring_weekly-nek kell day_of_week, seasonal-nak kell season range
  CHECK (
    (rule_type = 'recurring_weekly' AND day_of_week IS NOT NULL)
    OR (rule_type = 'seasonal' AND season_start IS NOT NULL AND season_end IS NOT NULL)
    OR (rule_type = 'one_time')
  )
);

COMMENT ON TABLE guide_availability_rules IS 'M17: Ismtetlodo elrhetosegi szabalyok — heti, szezonalis, egyszeri';

CREATE INDEX idx_guide_avail_rules_guide ON guide_availability_rules(guide_id);
CREATE INDEX idx_guide_avail_rules_active ON guide_availability_rules(guide_id) WHERE is_active = true;

-- ----------------------------------------
-- 10. guide_bookings - Foglalasok
-- ----------------------------------------
-- A guide piacter kozponti tranzakcios tablaja: foglalasi kerelemtol a teljesitesig.
CREATE TABLE IF NOT EXISTS guide_bookings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number              VARCHAR(20) NOT NULL UNIQUE,  -- GB-YYYY-XXXXXX
  guide_id                    UUID NOT NULL REFERENCES guide_profiles(id) ON DELETE RESTRICT,
  organizer_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  trip_id                     UUID,                      -- FK -> trips (nullable — onallo foglalas is lehetseges)
  service_id                  UUID NOT NULL REFERENCES guide_services(id) ON DELETE RESTRICT,

  -- Szolgaltatas reszletek
  service_type                guide_service_type_t NOT NULL,
  start_date                  DATE NOT NULL,
  end_date                    DATE NOT NULL,
  participant_count           INTEGER NOT NULL CHECK (participant_count >= 1),
  special_requests            TEXT CHECK (special_requests IS NULL OR char_length(special_requests) <= 1000),

  -- Arazsas
  guide_fee                   DECIMAL(10,2) NOT NULL CHECK (guide_fee > 0),
  platform_fee                DECIMAL(10,2) NOT NULL CHECK (platform_fee >= 0),
  total_amount                DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
  currency                    VARCHAR(3) NOT NULL DEFAULT 'EUR',

  -- Fizetes
  payment_status              booking_payment_status_t NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id    VARCHAR(200),
  stripe_checkout_session_id  VARCHAR(200),
  escrow_released             BOOLEAN NOT NULL DEFAULT false,
  escrow_released_at          TIMESTAMPTZ,

  -- Statusz
  status                      booking_status_t NOT NULL DEFAULT 'requested',

  -- Lemondas
  cancelled_by                cancellation_actor_t,
  cancellation_reason         TEXT,
  cancelled_at                TIMESTAMPTZ,
  refund_amount               DECIMAL(10,2),
  refund_percent              DECIMAL(5,2),              -- Visszaterites %-ban

  -- Idopontok
  requested_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at                 TIMESTAMPTZ,
  declined_at                 TIMESTAMPTZ,
  confirmed_at                TIMESTAMPTZ,               -- Fizetes utan
  completed_at                TIMESTAMPTZ,
  expires_at                  TIMESTAMPTZ NOT NULL,       -- 24h auto-expire

  -- Timestamps
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraintek
  CHECK (end_date >= start_date),
  CHECK (total_amount >= guide_fee)
);

COMMENT ON TABLE guide_bookings IS 'M17: Guide foglalasok — kerelemtol a teljesitesig';
COMMENT ON COLUMN guide_bookings.booking_number IS 'Egyedi foglalasi szam: GB-YYYY-XXXXXX formatum';
COMMENT ON COLUMN guide_bookings.escrow_released IS 'Escrow feloldas: true ha a guide-nak kifizethetove valt';
COMMENT ON COLUMN guide_bookings.expires_at IS 'Foglalasi kerelem lejarat: 24 ora (guide valaszide)';

-- Booking number szekvencia
CREATE SEQUENCE IF NOT EXISTS guide_booking_number_seq START WITH 1;

CREATE INDEX idx_guide_bookings_guide ON guide_bookings(guide_id);
CREATE INDEX idx_guide_bookings_organizer ON guide_bookings(organizer_id);
CREATE INDEX idx_guide_bookings_trip ON guide_bookings(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX idx_guide_bookings_status ON guide_bookings(status);
CREATE INDEX idx_guide_bookings_guide_status ON guide_bookings(guide_id, status);
CREATE INDEX idx_guide_bookings_organizer_status ON guide_bookings(organizer_id, status);
CREATE INDEX idx_guide_bookings_dates ON guide_bookings(start_date, end_date);
CREATE INDEX idx_guide_bookings_payment_status ON guide_bookings(payment_status);
CREATE INDEX idx_guide_bookings_expires ON guide_bookings(expires_at) WHERE status = 'requested';
CREATE INDEX idx_guide_bookings_escrow ON guide_bookings(id) WHERE escrow_released = false AND status = 'completed';
CREATE INDEX idx_guide_bookings_stripe_pi ON guide_bookings(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX idx_guide_bookings_stripe_session ON guide_bookings(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX idx_guide_bookings_number ON guide_bookings(booking_number);

-- ----------------------------------------
-- 11. guide_earnings - Guide bevetelkezeles
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS guide_earnings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id                    UUID NOT NULL REFERENCES guide_profiles(id) ON DELETE RESTRICT,
  booking_id                  UUID NOT NULL REFERENCES guide_bookings(id) ON DELETE RESTRICT,

  gross_amount                DECIMAL(10,2) NOT NULL CHECK (gross_amount > 0),
  platform_fee                DECIMAL(10,2) NOT NULL CHECK (platform_fee >= 0),
  net_amount                  DECIMAL(10,2) NOT NULL CHECK (net_amount > 0),
  currency                    VARCHAR(3) NOT NULL DEFAULT 'EUR',

  status                      earning_status_t NOT NULL DEFAULT 'pending',
  available_at                TIMESTAMPTZ,               -- Mikor valik kiutalhatova (escrow release)

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(booking_id)          -- Egy foglalashoz egy bevetel rekord
);

COMMENT ON TABLE guide_earnings IS 'M17: Guide bevetelkezeles — escrow es kifizetes nyilvantartas';

CREATE INDEX idx_guide_earnings_guide ON guide_earnings(guide_id);
CREATE INDEX idx_guide_earnings_status ON guide_earnings(status);
CREATE INDEX idx_guide_earnings_guide_status ON guide_earnings(guide_id, status);
CREATE INDEX idx_guide_earnings_available ON guide_earnings(available_at) WHERE status = 'available';
CREATE INDEX idx_guide_earnings_guide_pending ON guide_earnings(guide_id) WHERE status = 'pending';

-- ----------------------------------------
-- 12. guide_payouts - Guide kifizetesek
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS guide_payouts (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id                    UUID NOT NULL REFERENCES guide_profiles(id) ON DELETE RESTRICT,

  amount                      DECIMAL(10,2) NOT NULL CHECK (amount >= 50.00),  -- Min EUR 50 kifizetes
  currency                    VARCHAR(3) NOT NULL DEFAULT 'EUR',
  stripe_transfer_id          VARCHAR(200),

  status                      guide_payout_status_t NOT NULL DEFAULT 'pending',
  failure_reason              TEXT,
  retry_count                 INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0 AND retry_count <= 3),

  -- Erintett tranzakciok
  earning_ids                 UUID[] NOT NULL,            -- Guide earnings ID-k ebben a kifizetesben

  initiated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at                TIMESTAMPTZ,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE guide_payouts IS 'M17: Guide kifizetesek — Stripe Connect Transfer (min EUR 50)';

CREATE INDEX idx_guide_payouts_guide ON guide_payouts(guide_id);
CREATE INDEX idx_guide_payouts_status ON guide_payouts(status);
CREATE INDEX idx_guide_payouts_guide_status ON guide_payouts(guide_id, status);
CREATE INDEX idx_guide_payouts_stripe ON guide_payouts(stripe_transfer_id) WHERE stripe_transfer_id IS NOT NULL;
CREATE INDEX idx_guide_payouts_pending ON guide_payouts(initiated_at) WHERE status = 'pending';

-- ----------------------------------------
-- 13. guide_reviews - Guide ertekelesek
-- ----------------------------------------
-- M06 Reviews & Ratings kiterjesztese guide-specifikus dimenziokkal
CREATE TABLE IF NOT EXISTS guide_reviews (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id                    UUID NOT NULL REFERENCES guide_profiles(id) ON DELETE RESTRICT,
  booking_id                  UUID NOT NULL REFERENCES guide_bookings(id) ON DELETE RESTRICT,
  reviewer_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  -- Ertkelesi dimenziok (1-5 csillag)
  expertise_rating            INTEGER NOT NULL CHECK (expertise_rating >= 1 AND expertise_rating <= 5),
  communication_rating        INTEGER NOT NULL CHECK (communication_rating >= 1 AND communication_rating <= 5),
  punctuality_rating          INTEGER NOT NULL CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  safety_rating               INTEGER NOT NULL CHECK (safety_rating >= 1 AND safety_rating <= 5),
  value_rating                INTEGER NOT NULL CHECK (value_rating >= 1 AND value_rating <= 5),

  -- Atlagos ertekeles (szamitott)
  overall_rating              DECIMAL(3,2) NOT NULL,     -- (sum of 5) / 5

  -- Szoveges review
  review_text                 TEXT CHECK (review_text IS NULL OR char_length(review_text) <= 1000),

  -- Guide valasz
  guide_response              TEXT CHECK (guide_response IS NULL OR char_length(guide_response) <= 500),
  guide_responded_at          TIMESTAMPTZ,

  -- Moderacio
  is_visible                  BOOLEAN NOT NULL DEFAULT true,
  moderated_by                UUID REFERENCES profiles(id) ON DELETE SET NULL,
  moderated_at                TIMESTAMPTZ,
  moderation_reason           TEXT,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(booking_id, reviewer_id)  -- Egy foglalashoz egy review / reviewer
);

COMMENT ON TABLE guide_reviews IS 'M17: Guide ertekelesek — M06 kiterjesztes, 5 dimenzio, anonim';

CREATE INDEX idx_guide_reviews_guide ON guide_reviews(guide_id);
CREATE INDEX idx_guide_reviews_booking ON guide_reviews(booking_id);
CREATE INDEX idx_guide_reviews_reviewer ON guide_reviews(reviewer_id);
CREATE INDEX idx_guide_reviews_guide_visible ON guide_reviews(guide_id) WHERE is_visible = true;
CREATE INDEX idx_guide_reviews_guide_rating ON guide_reviews(guide_id, overall_rating) WHERE is_visible = true;

-- ----------------------------------------
-- 14. guide_message_threads - Uzenet szalak
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS guide_message_threads (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id                    UUID NOT NULL REFERENCES guide_profiles(id) ON DELETE RESTRICT,
  organizer_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  booking_id                  UUID REFERENCES guide_bookings(id) ON DELETE SET NULL,

  last_message_at             TIMESTAMPTZ,
  guide_unread_count          INTEGER NOT NULL DEFAULT 0 CHECK (guide_unread_count >= 0),
  organizer_unread_count      INTEGER NOT NULL DEFAULT 0 CHECK (organizer_unread_count >= 0),

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(guide_id, organizer_id, booking_id)
);

COMMENT ON TABLE guide_message_threads IS 'M17: Guide-szervezo uzenet szalak — foglalasi kontextus';

CREATE INDEX idx_guide_msg_threads_guide ON guide_message_threads(guide_id);
CREATE INDEX idx_guide_msg_threads_organizer ON guide_message_threads(organizer_id);
CREATE INDEX idx_guide_msg_threads_booking ON guide_message_threads(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX idx_guide_msg_threads_last_msg ON guide_message_threads(last_message_at DESC);

-- ----------------------------------------
-- 15. guide_messages - Uzenetek
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS guide_messages (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id                   UUID NOT NULL REFERENCES guide_message_threads(id) ON DELETE CASCADE,
  sender_id                   UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  content                     TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 2000),
  attachment_url              TEXT,                       -- Csatolmany (M08)

  read_at                     TIMESTAMPTZ,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE guide_messages IS 'M17: Guide uzenetvaltas — szoveg + csatolmany';

CREATE INDEX idx_guide_messages_thread ON guide_messages(thread_id);
CREATE INDEX idx_guide_messages_thread_created ON guide_messages(thread_id, created_at);
CREATE INDEX idx_guide_messages_sender ON guide_messages(sender_id);
CREATE INDEX idx_guide_messages_unread ON guide_messages(thread_id) WHERE read_at IS NULL;

-- ----------------------------------------
-- 16. guide_disputes - Vitak
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS guide_disputes (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id                  UUID NOT NULL REFERENCES guide_bookings(id) ON DELETE RESTRICT,
  opened_by                   UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  reason                      TEXT NOT NULL CHECK (char_length(reason) >= 10),
  status                      dispute_status_t NOT NULL DEFAULT 'open',

  -- Admin elbiralasa
  assigned_to                 UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolution                  dispute_resolution_t,
  resolution_notes            TEXT,
  resolved_at                 TIMESTAMPTZ,
  resolved_by                 UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Penzugyi hatas
  refund_amount               DECIMAL(10,2),

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(booking_id)           -- Egy foglalashoz max 1 vita
);

COMMENT ON TABLE guide_disputes IS 'M17: Foglalasi vitak — admin elbiralasu vitakezeles';

CREATE INDEX idx_guide_disputes_booking ON guide_disputes(booking_id);
CREATE INDEX idx_guide_disputes_status ON guide_disputes(status);
CREATE INDEX idx_guide_disputes_open ON guide_disputes(created_at) WHERE status IN ('open', 'under_review');
CREATE INDEX idx_guide_disputes_assigned ON guide_disputes(assigned_to) WHERE status = 'under_review';

-- ----------------------------------------
-- 17. guide_admin_actions - Admin audit log
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS guide_admin_actions (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id                    UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  guide_id                    UUID NOT NULL REFERENCES guide_profiles(id) ON DELETE RESTRICT,

  action                      VARCHAR(50) NOT NULL,       -- activate, reject, suspend, ban, verify, unverify, resolve_dispute
  reason                      TEXT,
  previous_status             VARCHAR(50),
  new_status                  VARCHAR(50),
  metadata                    JSONB,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE guide_admin_actions IS 'M17: Admin audit log — minden admin muvelet naplozva';

CREATE INDEX idx_guide_admin_actions_guide ON guide_admin_actions(guide_id);
CREATE INDEX idx_guide_admin_actions_admin ON guide_admin_actions(admin_id);
CREATE INDEX idx_guide_admin_actions_action ON guide_admin_actions(action);
CREATE INDEX idx_guide_admin_actions_created ON guide_admin_actions(created_at DESC);

-- ============================================
-- TRIGGEREK
-- ============================================

-- Triggerek minden tablara ahol van updated_at (update_updated_at_column fuggveny mar letezik M01-ben)
CREATE TRIGGER set_updated_at_guide_profiles
  BEFORE UPDATE ON guide_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_guide_services
  BEFORE UPDATE ON guide_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_guide_certifications
  BEFORE UPDATE ON guide_certifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_guide_availability
  BEFORE UPDATE ON guide_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_guide_bookings
  BEFORE UPDATE ON guide_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_guide_earnings
  BEFORE UPDATE ON guide_earnings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_guide_payouts
  BEFORE UPDATE ON guide_payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_guide_reviews
  BEFORE UPDATE ON guide_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_guide_disputes
  BEFORE UPDATE ON guide_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Minden tabla RLS engedelyezese
ALTER TABLE guide_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_identity_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_portfolio_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_admin_actions ENABLE ROW LEVEL SECURITY;

-- ---- guide_profiles ----

-- Publikus: aktiv guide profilok olvashatoak barkinek
CREATE POLICY "Active guide profiles are public"
  ON guide_profiles FOR SELECT
  USING (status = 'active' AND deleted_at IS NULL);

-- Guide olvashatja sajat profiljat (barmely statusz)
CREATE POLICY "Guides can read own profile"
  ON guide_profiles FOR SELECT
  USING (user_id = auth.uid());

-- Guide modosithatja sajat profiljat
CREATE POLICY "Guides can update own profile"
  ON guide_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Regisztralt user letrehozhat guide profilt
CREATE POLICY "Authenticated users can create guide profile"
  ON guide_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ---- guide_categories / guide_languages / guide_services ----

-- Publikus olvasas aktiv guide-ok adataira
CREATE POLICY "Public can read active guide categories"
  ON guide_categories FOR SELECT
  USING (guide_id IN (SELECT id FROM guide_profiles WHERE status = 'active' AND deleted_at IS NULL));

CREATE POLICY "Guides can manage own categories"
  ON guide_categories FOR ALL
  USING (guide_id IN (SELECT id FROM guide_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public can read active guide languages"
  ON guide_languages FOR SELECT
  USING (guide_id IN (SELECT id FROM guide_profiles WHERE status = 'active' AND deleted_at IS NULL));

CREATE POLICY "Guides can manage own languages"
  ON guide_languages FOR ALL
  USING (guide_id IN (SELECT id FROM guide_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public can read active guide services"
  ON guide_services FOR SELECT
  USING (guide_id IN (SELECT id FROM guide_profiles WHERE status = 'active' AND deleted_at IS NULL));

CREATE POLICY "Guides can manage own services"
  ON guide_services FOR ALL
  USING (guide_id IN (SELECT id FROM guide_profiles WHERE user_id = auth.uid()));

-- ---- guide_certifications ----

-- Publikus: verified kepesitesek lathatok
CREATE POLICY "Public can read verified certifications"
  ON guide_certifications FOR SELECT
  USING (verification_status = 'verified' AND guide_id IN (SELECT id FROM guide_profiles WHERE status = 'active'));

-- Guide olvashatja/kezelheti sajat kepesiteseit
CREATE POLICY "Guides can manage own certifications"
  ON guide_certifications FOR ALL
  USING (guide_id IN (SELECT id FROM guide_profiles WHERE user_id = auth.uid()));

-- ---- guide_identity_documents ----

-- Csak a guide olvashatja sajat dokumentumait
CREATE POLICY "Guides can manage own identity documents"
  ON guide_identity_documents FOR ALL
  USING (guide_id IN (SELECT id FROM guide_profiles WHERE user_id = auth.uid()));

-- ---- guide_portfolio_images ----

CREATE POLICY "Public can read active guide portfolio"
  ON guide_portfolio_images FOR SELECT
  USING (guide_id IN (SELECT id FROM guide_profiles WHERE status = 'active' AND deleted_at IS NULL));

CREATE POLICY "Guides can manage own portfolio"
  ON guide_portfolio_images FOR ALL
  USING (guide_id IN (SELECT id FROM guide_profiles WHERE user_id = auth.uid()));

-- ---- guide_availability ----

-- Publikus: aktiv guide-ok elrhetosege lathato
CREATE POLICY "Public can read active guide availability"
  ON guide_availability FOR SELECT
  USING (guide_id IN (SELECT id FROM guide_profiles WHERE status = 'active' AND deleted_at IS NULL));

CREATE POLICY "Guides can manage own availability"
  ON guide_availability FOR ALL
  USING (guide_id IN (SELECT id FROM guide_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Guides can manage own availability rules"
  ON guide_availability_rules FOR ALL
  USING (guide_id IN (SELECT id FROM guide_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public can read active guide availability rules"
  ON guide_availability_rules FOR SELECT
  USING (guide_id IN (SELECT id FROM guide_profiles WHERE status = 'active' AND deleted_at IS NULL));

-- ---- guide_bookings ----

-- Guide es szervezo olvashatjak sajat foglalasaikat
CREATE POLICY "Guides can read own bookings"
  ON guide_bookings FOR SELECT
  USING (guide_id IN (SELECT id FROM guide_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Organizers can read own bookings"
  ON guide_bookings FOR SELECT
  USING (organizer_id = auth.uid());

-- Szervezo letrehozhat foglalast
CREATE POLICY "Organizers can create bookings"
  ON guide_bookings FOR INSERT
  WITH CHECK (organizer_id = auth.uid());

-- Guide frissitheti sajat foglalasait (accept/decline)
CREATE POLICY "Guides can update own bookings"
  ON guide_bookings FOR UPDATE
  USING (guide_id IN (SELECT id FROM guide_profiles WHERE user_id = auth.uid()));

-- Szervezo frissitheti sajat foglalasait (cancel)
CREATE POLICY "Organizers can update own bookings"
  ON guide_bookings FOR UPDATE
  USING (organizer_id = auth.uid());

-- ---- guide_earnings / guide_payouts ----

CREATE POLICY "Guides can read own earnings"
  ON guide_earnings FOR SELECT
  USING (guide_id IN (SELECT id FROM guide_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Guides can read own payouts"
  ON guide_payouts FOR SELECT
  USING (guide_id IN (SELECT id FROM guide_profiles WHERE user_id = auth.uid()));

-- ---- guide_reviews ----

-- Publikus: lathato ertekelesek
CREATE POLICY "Public can read visible reviews"
  ON guide_reviews FOR SELECT
  USING (is_visible = true);

-- Reviewer letrehozhat ertekelest
CREATE POLICY "Reviewers can create reviews"
  ON guide_reviews FOR INSERT
  WITH CHECK (reviewer_id = auth.uid());

-- Guide valaszolhat sajat ertekelesere
CREATE POLICY "Guides can respond to own reviews"
  ON guide_reviews FOR UPDATE
  USING (guide_id IN (SELECT id FROM guide_profiles WHERE user_id = auth.uid()));

-- ---- guide_message_threads / guide_messages ----

CREATE POLICY "Participants can read own threads"
  ON guide_message_threads FOR SELECT
  USING (
    organizer_id = auth.uid()
    OR guide_id IN (SELECT id FROM guide_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Participants can read thread messages"
  ON guide_messages FOR SELECT
  USING (
    thread_id IN (
      SELECT id FROM guide_message_threads
      WHERE organizer_id = auth.uid()
      OR guide_id IN (SELECT id FROM guide_profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send messages"
  ON guide_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- ---- guide_disputes ----

CREATE POLICY "Dispute participants can read own disputes"
  ON guide_disputes FOR SELECT
  USING (
    opened_by = auth.uid()
    OR booking_id IN (
      SELECT id FROM guide_bookings
      WHERE organizer_id = auth.uid()
      OR guide_id IN (SELECT id FROM guide_profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can open disputes"
  ON guide_disputes FOR INSERT
  WITH CHECK (opened_by = auth.uid());

-- ---- guide_admin_actions ----
-- Csak admin olvashatja (service_role-on keresztul)
-- Nincs user-level RLS policy — admin a service role-on keresztul er hozza

-- ============================================
-- FUGGVENYEK
-- ============================================

-- Booking number generalo
CREATE OR REPLACE FUNCTION generate_guide_booking_number()
RETURNS TEXT AS $$
DECLARE
  seq_val INTEGER;
  year_str TEXT;
BEGIN
  seq_val := nextval('guide_booking_number_seq');
  year_str := to_char(NOW(), 'YYYY');
  RETURN 'GB-' || year_str || '-' || lpad(seq_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto booking number
CREATE OR REPLACE FUNCTION set_guide_booking_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_number IS NULL OR NEW.booking_number = '' THEN
    NEW.booking_number := generate_guide_booking_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_guide_booking_number
  BEFORE INSERT ON guide_bookings
  FOR EACH ROW EXECUTE FUNCTION set_guide_booking_number();

-- Overall rating szamitas trigger
CREATE OR REPLACE FUNCTION calculate_guide_overall_rating()
RETURNS TRIGGER AS $$
BEGIN
  NEW.overall_rating := ROUND(
    (NEW.expertise_rating + NEW.communication_rating + NEW.punctuality_rating +
     NEW.safety_rating + NEW.value_rating)::DECIMAL / 5.0, 2
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_overall_rating
  BEFORE INSERT OR UPDATE ON guide_reviews
  FOR EACH ROW EXECUTE FUNCTION calculate_guide_overall_rating();

COMMIT;
