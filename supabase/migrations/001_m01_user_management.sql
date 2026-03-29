-- Part 1/4: M01 User Management
-- ============================================================================
-- M01 — User Management: PostgreSQL Database Schema
-- ============================================================================
-- Modul:       M01
-- Database:    Supabase PostgreSQL 16+
-- Encoding:    UTF-8
-- Verzió:      2.0.0
-- Dátum:       2026-02-17
-- Architektúra: v2 (Startup-Optimized Modular Monolith)
-- ============================================================================

BEGIN;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================================================
-- SHARED TYPES
-- ============================================================================

CREATE TYPE sync_status_t AS ENUM ('synced', 'pending_upload', 'pending_download', 'conflict');

-- ============================================================================
-- 1. ENUM TÍPUSOK
-- ============================================================================

CREATE TYPE subscription_tier_t AS ENUM (
  'free',         -- Kalandor (ingyenes)
  'pro',          -- Túravezető (€9.90/hó)
  'business',     -- Expedíció (€39.90/hó)
  'enterprise',   -- Bázistábor (egyéni)
  'community',    -- Nonprofit (ingyenes)
  'seasonal'      -- Szezonális (€5.90/hó, 3 hó min)
);

CREATE TYPE gender_t AS ENUM (
  'male',
  'female',
  'other',
  'prefer_not_to_say'
);

CREATE TYPE profile_visibility_t AS ENUM (
  'public',       -- Bárki láthatja
  'registered',   -- Csak regisztrált felhasználók
  'private'       -- Csak az illető
);

CREATE TYPE visibility_t AS ENUM (
  'public',       -- Mindenki számára látható
  'hidden'        -- Rejtett
);

CREATE TYPE phone_visibility_t AS ENUM (
  'trip_companions_only',  -- Csak túratársak
  'hidden'                 -- Rejtett
);

CREATE TYPE location_precision_t AS ENUM (
  'city_country',   -- Város + ország
  'country_only',   -- Csak ország
  'hidden'          -- Rejtett
);

CREATE TYPE trip_history_visibility_t AS ENUM (
  'public',         -- Nyilvános
  'followers_only', -- Csak követők
  'private'         -- Privát
);

CREATE TYPE skill_level_t AS ENUM (
  'beginner',       -- L1 — Kezdő
  'intermediate',   -- L2 — Haladó
  'advanced',       -- L3 — Tapasztalt
  'expert'          -- L4 — Szakértő
);

CREATE TYPE auth_provider_t AS ENUM (
  'email',
  'phone',
  'google',
  'facebook',
  'apple'
);

CREATE TYPE device_type_t AS ENUM (
  'web',
  'mobile',
  'tablet'
);

-- ============================================================================
-- 2. HELPER FUNCTIONS
-- ============================================================================

-- updated_at automatikus frissítés trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Egyedi slug generálás (URL-barát azonosító)
CREATE OR REPLACE FUNCTION generate_unique_slug(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
  v_slug TEXT;
  v_slug_exists BOOLEAN;
  v_counter INTEGER := 0;
BEGIN
  -- Alapvető slugification: kisbetű, ékezet eltávolítás, speciális karakterek cseréje
  v_slug := lower(trim(base_name));
  v_slug := translate(v_slug, 'áéíóöőúüűÁÉÍÓÖŐÚÜŰ', 'aeiooouuuaeiooouuu');
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '^-|-$', '', 'g');
  v_slug := left(v_slug, 50);

  -- Ha üres, fallback
  IF v_slug = '' OR v_slug IS NULL THEN
    v_slug := 'user';
  END IF;

  -- Egyediség ellenőrzés + számláló
  LOOP
    IF v_counter = 0 THEN
      SELECT EXISTS(SELECT 1 FROM profiles WHERE profiles.slug = v_slug) INTO v_slug_exists;
    ELSE
      SELECT EXISTS(SELECT 1 FROM profiles WHERE profiles.slug = v_slug || '-' || v_counter::TEXT) INTO v_slug_exists;
    END IF;

    IF NOT v_slug_exists THEN
      IF v_counter > 0 THEN
        v_slug := v_slug || '-' || v_counter::TEXT;
      END IF;
      RETURN v_slug;
    END IF;

    v_counter := v_counter + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. TÁBLÁK
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 profiles — Felhasználói profil (1:1 auth.users kiterjesztés)
-- ----------------------------------------------------------------------------
CREATE TABLE profiles (
  id                      UUID PRIMARY KEY,  -- = auth.users.id (FK nem kell, trigger kezeli)
  display_name            VARCHAR(100) NOT NULL,
  slug                    VARCHAR(60) NOT NULL,
  first_name              VARCHAR(50) NOT NULL DEFAULT '',
  last_name               VARCHAR(50) DEFAULT '',
  email                   VARCHAR(254),          -- NULL ha phone-only reg
  phone                   VARCHAR(20),           -- E.164 formátum
  avatar_url              TEXT,
  bio                     VARCHAR(500),
  location_city           VARCHAR(100),
  country_code            CHAR(2),               -- ISO 3166-1 alpha-2
  date_of_birth           DATE,
  gender                  gender_t,
  subscription_tier       subscription_tier_t NOT NULL DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,           -- NULL = free / aktív
  stripe_customer_id      VARCHAR(50),
  reputation_points       INTEGER NOT NULL DEFAULT 0,
  reputation_level        INTEGER NOT NULL DEFAULT 1,  -- 1-5
  profile_visibility      profile_visibility_t NOT NULL DEFAULT 'public',
  show_email              BOOLEAN NOT NULL DEFAULT false,
  show_phone              BOOLEAN NOT NULL DEFAULT false,
  preferred_language      VARCHAR(5) NOT NULL DEFAULT 'hu',
  preferred_currency      VARCHAR(3) NOT NULL DEFAULT 'EUR',
  timezone                VARCHAR(50),
  two_fa_enabled          BOOLEAN NOT NULL DEFAULT false,
  verified_organizer      BOOLEAN NOT NULL DEFAULT false,
  email_verified          BOOLEAN NOT NULL DEFAULT false,
  last_active_at          TIMESTAMPTZ,
  onboarding_completed    BOOLEAN NOT NULL DEFAULT false,
  sync_version            INTEGER NOT NULL DEFAULT 1,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT chk_profiles_reputation_level CHECK (reputation_level >= 1 AND reputation_level <= 5),
  CONSTRAINT chk_profiles_reputation_points CHECK (reputation_points >= 0),
  CONSTRAINT chk_profiles_country_code CHECK (country_code ~ '^[A-Z]{2}$' OR country_code IS NULL),
  CONSTRAINT chk_profiles_preferred_language CHECK (preferred_language IN ('hu', 'en', 'de', 'sk', 'hr', 'si', 'ro', 'cz')),
  CONSTRAINT chk_profiles_preferred_currency CHECK (preferred_currency IN ('EUR', 'HUF', 'CZK', 'HRK', 'RON'))
);

-- Megjegyzések
COMMENT ON TABLE profiles IS 'M01 — Felhasználói profil, auth.users kiterjesztése (1:1)';
COMMENT ON COLUMN profiles.id IS 'Megegyezik auth.users.id-val';
COMMENT ON COLUMN profiles.slug IS 'URL-barát egyedi azonosító (/u/john-doe)';
COMMENT ON COLUMN profiles.subscription_tier IS 'Aktuális előfizetési szint (M04 frissíti)';
COMMENT ON COLUMN profiles.reputation_points IS 'Reputációs pontok (M06 számolja)';
COMMENT ON COLUMN profiles.verified_organizer IS 'Auto jelvény: 5+ befejezett túra, 4.0+ átlag';
COMMENT ON COLUMN profiles.sync_version IS 'Offline sync verzió (optimistic locking)';

-- ----------------------------------------------------------------------------
-- 3.2 user_skills — Felhasználói készségek (kategóriánként 1)
-- ----------------------------------------------------------------------------
CREATE TABLE user_skills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL,  -- FK → M02.categories (cross-module)
  skill_level     skill_level_t NOT NULL DEFAULT 'beginner',
  years_experience INTEGER,
  certifications  TEXT[] DEFAULT '{}',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT uq_user_skills_user_category UNIQUE (user_id, category_id),
  CONSTRAINT chk_user_skills_years CHECK (years_experience IS NULL OR (years_experience >= 0 AND years_experience <= 50))
);

COMMENT ON TABLE user_skills IS 'M01 — Felhasználói készségek kategóriánként';
COMMENT ON COLUMN user_skills.category_id IS 'FK → M02.categories (cross-module, ON DELETE RESTRICT a service layerben)';

-- ----------------------------------------------------------------------------
-- 3.3 emergency_contacts — Vészhelyzeti kontaktok (max 3/felhasználó)
-- ----------------------------------------------------------------------------
CREATE TABLE emergency_contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  phone         VARCHAR(20) NOT NULL,  -- E.164
  relationship  VARCHAR(50) NOT NULL,  -- spouse/parent/sibling/friend/other
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_emergency_phone CHECK (phone ~ '^\+[1-9]\d{6,19}$'),
  CONSTRAINT chk_emergency_relationship CHECK (relationship IN ('spouse', 'parent', 'sibling', 'friend', 'other'))
);

COMMENT ON TABLE emergency_contacts IS 'M01 — Vészhelyzeti kontaktok (offline B, P0 prioritás)';

-- ----------------------------------------------------------------------------
-- 3.4 user_follows — Követési kapcsolatok (M:N self-referenciális)
-- ----------------------------------------------------------------------------
CREATE TABLE user_follows (
  follower_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT chk_user_follows_no_self CHECK (follower_id != following_id)
);

COMMENT ON TABLE user_follows IS 'M01 — Felhasználó követési kapcsolatok (self-referenciális M:N)';

-- ----------------------------------------------------------------------------
-- 3.5 user_sessions — Aktív munkamenetek
-- ----------------------------------------------------------------------------
CREATE TABLE user_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  refresh_token_hash  VARCHAR(255) NOT NULL,
  device_type         device_type_t NOT NULL DEFAULT 'web',
  device_name         VARCHAR(100),
  browser             VARCHAR(100),
  ip_address          INET,
  last_active_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_sessions IS 'M01 — Aktív felhasználói munkamenetek';
COMMENT ON COLUMN user_sessions.refresh_token_hash IS 'SHA-256 hash a refresh token-ből';
COMMENT ON COLUMN user_sessions.expires_at IS 'Lejárat: 30 nap (default), 90 nap (remember me)';

-- ----------------------------------------------------------------------------
-- 3.6 user_credentials — Multi-auth provider linking
-- ----------------------------------------------------------------------------
CREATE TABLE user_credentials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider          auth_provider_t NOT NULL,
  provider_id       VARCHAR(255) NOT NULL,
  credentials_json  JSONB,
  linked_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT uq_user_credentials_provider_id UNIQUE (provider, provider_id),
  CONSTRAINT uq_user_credentials_user_provider UNIQUE (user_id, provider)
);

COMMENT ON TABLE user_credentials IS 'M01 — Multi-auth provider összekapcsolás (email + Google + phone)';

-- ----------------------------------------------------------------------------
-- 3.7 user_privacy_settings — Adatvédelmi beállítások (1:1 profiles)
-- ----------------------------------------------------------------------------
CREATE TABLE user_privacy_settings (
  user_id                   UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  profile_visibility        profile_visibility_t NOT NULL DEFAULT 'public',
  email_visibility          visibility_t NOT NULL DEFAULT 'hidden',
  phone_visibility          phone_visibility_t NOT NULL DEFAULT 'hidden',
  location_precision        location_precision_t NOT NULL DEFAULT 'city_country',
  trip_history_visibility   trip_history_visibility_t NOT NULL DEFAULT 'public',
  online_status_visible     BOOLEAN NOT NULL DEFAULT true,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_privacy_settings IS 'M01 — Felhasználói adatvédelmi beállítások (1:1 profiles)';

-- ----------------------------------------------------------------------------
-- 3.8 user_adventure_interests — Kalandérdeklődések (M:N join tábla)
-- ----------------------------------------------------------------------------
CREATE TABLE user_adventure_interests (
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id   UUID NOT NULL,  -- FK → M02.categories (cross-module)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_id, category_id)
);

COMMENT ON TABLE user_adventure_interests IS 'M01 — Felhasználó kalandérdeklődései (M:N → M02.categories)';
COMMENT ON COLUMN user_adventure_interests.category_id IS 'FK → M02.categories (8 kalandkategória)';

-- ============================================================================
-- 4. INDEXEK
-- ============================================================================

-- profiles indexek
CREATE UNIQUE INDEX idx_profiles_slug ON profiles(slug);
CREATE INDEX idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;
CREATE INDEX idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX idx_profiles_country_code ON profiles(country_code) WHERE country_code IS NOT NULL;
CREATE INDEX idx_profiles_verified_organizer ON profiles(id) WHERE verified_organizer = true;
CREATE INDEX idx_profiles_not_deleted ON profiles(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_last_active ON profiles(last_active_at DESC NULLS LAST);

-- user_skills indexek
CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_user_skills_category_id ON user_skills(category_id);
CREATE INDEX idx_user_skills_level ON user_skills(skill_level);

-- emergency_contacts indexek
CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts(user_id);

-- user_follows indexek
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);

-- user_sessions indexek
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(refresh_token_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- user_credentials indexek
CREATE INDEX idx_user_credentials_user_id ON user_credentials(user_id);

-- user_adventure_interests indexek
CREATE INDEX idx_user_interests_user_id ON user_adventure_interests(user_id);
CREATE INDEX idx_user_interests_category_id ON user_adventure_interests(category_id);

-- ============================================================================
-- 5. TRIGGEREK
-- ============================================================================

-- profiles.updated_at automatikus frissítés
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- user_skills.updated_at automatikus frissítés
CREATE TRIGGER set_updated_at_user_skills
  BEFORE UPDATE ON user_skills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- user_privacy_settings.updated_at automatikus frissítés
CREATE TRIGGER set_updated_at_user_privacy
  BEFORE UPDATE ON user_privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. SUPABASE AUTH TRIGGER
-- ============================================================================

-- Automatikus profil létrehozás auth.users regisztrációkor
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    slug,
    first_name,
    last_name,
    avatar_url,
    phone
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      CASE WHEN NEW.email IS NOT NULL THEN split_part(NEW.email, '@', 1) ELSE 'User' END
    ),
    generate_unique_slug(
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        CASE WHEN NEW.email IS NOT NULL THEN split_part(NEW.email, '@', 1) ELSE 'user-' || left(NEW.id::TEXT, 8) END
      )
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'first_name',
      split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 1),
      ''
    ),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.phone
  );

  -- Alapértelmezett privacy beállítások létrehozása
  INSERT INTO public.user_privacy_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger auth.users INSERT-re
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_public ON profiles
  FOR SELECT USING (
    deleted_at IS NULL
    AND (profile_visibility = 'public' OR id = auth.uid())
  );

CREATE POLICY profiles_select_registered ON profiles
  FOR SELECT USING (
    deleted_at IS NULL
    AND profile_visibility = 'registered'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_delete_own ON profiles
  FOR DELETE USING (id = auth.uid());

CREATE POLICY profiles_insert_auth ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- user_skills
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_skills_select ON user_skills
  FOR SELECT USING (true);

CREATE POLICY user_skills_insert ON user_skills
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY user_skills_update ON user_skills
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_skills_delete ON user_skills
  FOR DELETE USING (user_id = auth.uid());

-- emergency_contacts
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY emergency_contacts_own ON emergency_contacts
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- user_follows
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_follows_select ON user_follows
  FOR SELECT USING (true);

CREATE POLICY user_follows_insert ON user_follows
  FOR INSERT WITH CHECK (follower_id = auth.uid());

CREATE POLICY user_follows_delete ON user_follows
  FOR DELETE USING (follower_id = auth.uid());

-- user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_sessions_own ON user_sessions
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- user_credentials
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_credentials_own ON user_credentials
  FOR SELECT USING (user_id = auth.uid());

-- user_privacy_settings
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_privacy_own ON user_privacy_settings
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- user_adventure_interests
ALTER TABLE user_adventure_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_interests_select ON user_adventure_interests
  FOR SELECT USING (true);

CREATE POLICY user_interests_insert ON user_adventure_interests
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY user_interests_delete ON user_adventure_interests
  FOR DELETE USING (user_id = auth.uid());

COMMIT;
