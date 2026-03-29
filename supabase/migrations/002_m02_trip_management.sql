-- Part 2/4: M02 Trip Management
-- Trip management database schema for the Ultimate Adventure Tool MVP
-- Includes: Categories, trip details, participants, itinerary, POIs, templates

BEGIN;

-- ============================================
-- 1. ENUM TYPES
-- ============================================

CREATE TYPE category_status_t AS ENUM (
  'active', 'draft', 'deprecated'
);

CREATE TYPE trip_status_t AS ENUM (
  'draft', 'published', 'registration_open', 'active', 'completed', 'cancelled', 'archived'
);

CREATE TYPE trip_visibility_t AS ENUM (
  'public', 'followers_only', 'private'
);

CREATE TYPE participant_status_t AS ENUM (
  'pending', 'approved', 'approved_pending_payment', 'participant', 'rejected', 'waitlisted', 'cancelled'
);

CREATE TYPE skill_match_t AS ENUM (
  'qualified', 'skill_needed', 'exceeds'
);

CREATE TYPE crew_skill_level_t AS ENUM (
  'any', 'intermediate', 'advanced', 'expert'
);

CREATE TYPE poi_type_t AS ENUM (
  'stop', 'camp', 'viewpoint', 'activity', 'danger', 'custom'
);

CREATE TYPE cancel_reason_t AS ENUM (
  'organizer_decision', 'insufficient_participants', 'weather', 'safety', 'force_majeure'
);

-- ============================================
-- 2. TABLES
-- ============================================

-- 2.1 categories — Adventure categories (8 fixed)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  name_localized JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  description_localized JSONB,
  icon_name VARCHAR(50) NOT NULL,
  color_hex VARCHAR(7) NOT NULL,
  status category_status_t NOT NULL DEFAULT 'active',
  display_order INTEGER NOT NULL,
  parameter_schema JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE categories IS 'M02: 8 adventure categories - authoritative source for all modules';
COMMENT ON COLUMN categories.name IS 'English system name (Hiking, Mountain, etc.)';
COMMENT ON COLUMN categories.name_localized IS 'Localized names: {hu:"Túrázás", en:"Hiking", de:"Wandern"}';
COMMENT ON COLUMN categories.parameter_schema IS 'JSON Schema for category-specific trip fields';

CREATE INDEX idx_categories_status ON categories(status);
CREATE INDEX idx_categories_order ON categories(display_order);

-- 2.2 sub_disciplines — Subcategories
CREATE TABLE IF NOT EXISTS sub_disciplines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  name_localized JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  status category_status_t NOT NULL DEFAULT 'active',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_sub_disciplines_category_name UNIQUE (category_id, name)
);

COMMENT ON TABLE sub_disciplines IS 'M02: Subcategories per category (appear as skills in M01)';

CREATE INDEX idx_sub_disciplines_category ON sub_disciplines(category_id);
CREATE INDEX idx_sub_disciplines_status ON sub_disciplines(status);

-- 2.3 environments — Terrain types / Environments
CREATE TABLE IF NOT EXISTS environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_discipline_id UUID NOT NULL REFERENCES sub_disciplines(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  name_localized JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE environments IS 'M02: Environments per subcategory (e.g., Forest trails, Alpine meadow)';

CREATE INDEX idx_environments_sub_discipline ON environments(sub_discipline_id);

-- 2.4 experience_level_descriptions — Level descriptions
CREATE TABLE IF NOT EXISTS experience_level_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  label VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  description_localized JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_exp_level_category UNIQUE (category_id, level),
  CONSTRAINT chk_exp_level_range CHECK (level >= 1 AND level <= 5)
);

COMMENT ON TABLE experience_level_descriptions IS 'M02: Category-specific experience level descriptions (L1 Beginner → L5 Elite)';

-- 2.5 trips — Trips (central entity)
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  org_id UUID,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  sub_discipline_id UUID REFERENCES sub_disciplines(id) ON DELETE SET NULL,

  -- Basic Info
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(250) NOT NULL,
  short_description VARCHAR(280),
  description TEXT NOT NULL,
  cover_image_url TEXT,

  -- Difficulty & Location
  difficulty INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  meeting_point VARCHAR(200),
  meeting_point_geo GEOGRAPHY(Point, 4326),
  location_country CHAR(2) NOT NULL,
  location_region VARCHAR(100),
  location_city VARCHAR(100),
  country_codes CHAR(2)[] DEFAULT '{}',

  -- Participants
  max_participants INTEGER NOT NULL,
  min_participants INTEGER NOT NULL DEFAULT 1,
  current_participants INTEGER NOT NULL DEFAULT 0,

  -- Pricing
  price_amount DECIMAL(10,2),
  price_currency VARCHAR(3) DEFAULT 'EUR',
  price_includes TEXT,
  price_excludes TEXT,
  is_cost_sharing BOOLEAN NOT NULL DEFAULT true,

  -- Category-specific
  category_details JSONB,
  tags TEXT[] DEFAULT '{}',
  language VARCHAR(5) NOT NULL DEFAULT 'hu',

  -- Lifecycle
  status trip_status_t NOT NULL DEFAULT 'draft',
  visibility trip_visibility_t NOT NULL DEFAULT 'public',
  require_approval BOOLEAN NOT NULL DEFAULT true,
  auto_accept BOOLEAN NOT NULL DEFAULT false,
  registration_deadline TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason VARCHAR(50),

  -- Template
  template_id UUID,

  -- Sync & Timestamps
  sync_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT uq_trips_slug UNIQUE (slug),
  CONSTRAINT chk_trips_difficulty CHECK (difficulty >= 1 AND difficulty <= 5),
  CONSTRAINT chk_trips_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_trips_participants CHECK (max_participants >= min_participants AND max_participants >= 2),
  CONSTRAINT chk_trips_price CHECK (price_amount IS NULL OR price_amount > 0),
  CONSTRAINT chk_trips_current_participants CHECK (current_participants >= 0)
);

-- FK to organizations deferred (M16 not yet deployed)
COMMENT ON TABLE trips IS 'M02: Central platform entity - full trip lifecycle management';
COMMENT ON COLUMN trips.category_details IS 'Category-specific JSON fields (hiking: elevation, water: vessel, etc.)';
COMMENT ON COLUMN trips.current_participants IS 'Denormalized counter - updated by trigger';
COMMENT ON COLUMN trips.cancelled_reason IS 'organizer_decision/insufficient_participants/weather/safety/force_majeure';

CREATE UNIQUE INDEX idx_trips_slug ON trips(slug);
CREATE INDEX idx_trips_organizer ON trips(organizer_id);
CREATE INDEX idx_trips_category ON trips(category_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_dates ON trips(start_date, end_date);
CREATE INDEX idx_trips_country ON trips(location_country);
CREATE INDEX idx_trips_geo ON trips USING GIST(meeting_point_geo);
CREATE INDEX idx_trips_visibility ON trips(status, visibility) WHERE deleted_at IS NULL;
CREATE INDEX idx_trips_org ON trips(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX idx_trips_not_deleted ON trips(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_trips_published ON trips(published_at DESC) WHERE status = 'published' AND deleted_at IS NULL;

-- 2.6 trip_crew_positions — Crew Positions
CREATE TABLE IF NOT EXISTS trip_crew_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  role_name VARCHAR(100) NOT NULL,
  description TEXT,
  required_skill_category UUID REFERENCES categories(id) ON DELETE SET NULL,
  required_skill_level crew_skill_level_t NOT NULL DEFAULT 'any',
  spots INTEGER NOT NULL,
  filled_spots INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_crew_position_trip_role UNIQUE (trip_id, role_name),
  CONSTRAINT chk_crew_spots CHECK (spots >= 1 AND spots <= 50),
  CONSTRAINT chk_crew_filled CHECK (filled_spots >= 0 AND filled_spots <= spots)
);

COMMENT ON TABLE trip_crew_positions IS 'M02: Organizer-defined crew roles with skill requirements';

CREATE INDEX idx_crew_positions_trip ON trip_crew_positions(trip_id);

-- 2.7 trip_participants — Participants & Applicants
CREATE TABLE IF NOT EXISTS trip_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  crew_position_id UUID REFERENCES trip_crew_positions(id) ON DELETE SET NULL,

  -- Application
  status participant_status_t NOT NULL DEFAULT 'pending',
  application_text TEXT,
  skill_match skill_match_t,
  rejection_reason TEXT,

  -- Timestamps
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  checked_in BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMPTZ,

  -- Offline sync
  local_id UUID,
  sync_status sync_status_t NOT NULL DEFAULT 'synced',
  sync_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_trip_participant UNIQUE (trip_id, user_id)
);

COMMENT ON TABLE trip_participants IS 'M02: Complete application lifecycle - Interested → Registered → Approved → Paid → Participant';

CREATE INDEX idx_participants_trip ON trip_participants(trip_id);
CREATE INDEX idx_participants_user ON trip_participants(user_id);
CREATE INDEX idx_participants_status ON trip_participants(trip_id, status);
CREATE INDEX idx_participants_sync ON trip_participants(sync_status) WHERE sync_status != 'synced';

-- 2.8 trip_itinerary_days — Itinerary Days
CREATE TABLE IF NOT EXISTS trip_itinerary_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  title VARCHAR(200),
  description TEXT,
  date DATE,
  start_location VARCHAR(200),
  end_location VARCHAR(200),
  distance_km DECIMAL(6,1),
  elevation_gain_m INTEGER,
  estimated_hours DECIMAL(4,1),
  route_geojson JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_itinerary_day UNIQUE (trip_id, day_number),
  CONSTRAINT chk_day_number CHECK (day_number >= 1 AND day_number <= 90)
);

COMMENT ON TABLE trip_itinerary_days IS 'M02: Day-by-day itinerary planning';

CREATE INDEX idx_itinerary_days_trip ON trip_itinerary_days(trip_id);

-- 2.9 trip_pois — Points of Interest
CREATE TABLE IF NOT EXISTS trip_pois (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  itinerary_day_id UUID REFERENCES trip_itinerary_days(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  poi_type poi_type_t NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  geo GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude::double precision, latitude::double precision), 4326)::geography
  ) STORED,
  marker_color VARCHAR(7),
  icon VARCHAR(50),
  sort_order INTEGER NOT NULL DEFAULT 0,
  elevation_m INTEGER,
  photos JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE trip_pois IS 'M02: Points of interest linked to itinerary days (POI)';
COMMENT ON COLUMN trip_pois.geo IS 'Auto-generated PostGIS point from lat/lng';
COMMENT ON COLUMN trip_pois.photos IS 'Array: [{url, thumbnail_url, caption}]';

CREATE INDEX idx_pois_trip ON trip_pois(trip_id);
CREATE INDEX idx_pois_day ON trip_pois(itinerary_day_id);
CREATE INDEX idx_pois_geo ON trip_pois USING GIST(geo);

-- 2.10 trip_templates — Trip Templates
CREATE TABLE IF NOT EXISTS trip_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  template_data JSONB NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  status category_status_t NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE trip_templates IS 'M02: Reusable trip templates (private and public)';
COMMENT ON COLUMN trip_templates.template_data IS 'Pre-filled trip structure (wizard Step 2-4 data, without dates)';

CREATE INDEX idx_templates_category ON trip_templates(category_id);
CREATE INDEX idx_templates_creator ON trip_templates(creator_id);
CREATE INDEX idx_templates_public ON trip_templates(is_public, status) WHERE is_public = true;
CREATE INDEX idx_templates_featured ON trip_templates(is_featured) WHERE is_featured = true AND status = 'active';

-- ============================================
-- 3. TRIGGERS
-- ============================================

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at_categories
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_sub_disciplines
  BEFORE UPDATE ON sub_disciplines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_experience_levels
  BEFORE UPDATE ON experience_level_descriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_trips
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_itinerary_days
  BEFORE UPDATE ON trip_itinerary_days
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_participants
  BEFORE UPDATE ON trip_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_templates
  BEFORE UPDATE ON trip_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Participant count trigger
CREATE OR REPLACE FUNCTION update_trip_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE trips SET current_participants = (
      SELECT COUNT(*) FROM trip_participants
      WHERE trip_id = NEW.trip_id
        AND status IN ('approved', 'approved_pending_payment', 'participant')
    ) WHERE id = NEW.trip_id;
  END IF;

  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.trip_id != NEW.trip_id) THEN
    UPDATE trips SET current_participants = (
      SELECT COUNT(*) FROM trip_participants
      WHERE trip_id = OLD.trip_id
        AND status IN ('approved', 'approved_pending_payment', 'participant')
    ) WHERE id = OLD.trip_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_participant_count
  AFTER INSERT OR UPDATE OR DELETE ON trip_participants
  FOR EACH ROW EXECUTE FUNCTION update_trip_participant_count();

-- Slug generation helper
CREATE OR REPLACE FUNCTION generate_trip_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Normalize: lowercase, replace non-alphanumeric with hyphens, trim
  base_slug := regexp_replace(
    lower(unaccent(title)),
    '[^a-z0-9]+', '-', 'g'
  );
  base_slug := trim(both '-' from base_slug);
  base_slug := left(base_slug, 200);

  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM trips WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Categories: public read, admin write
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY categories_select ON categories FOR SELECT USING (true);
CREATE POLICY categories_admin ON categories FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Sub-disciplines: public read, admin write
ALTER TABLE sub_disciplines ENABLE ROW LEVEL SECURITY;
CREATE POLICY sub_disciplines_select ON sub_disciplines FOR SELECT USING (true);
CREATE POLICY sub_disciplines_admin ON sub_disciplines FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Environments: public read, admin write
ALTER TABLE environments ENABLE ROW LEVEL SECURITY;
CREATE POLICY environments_select ON environments FOR SELECT USING (true);
CREATE POLICY environments_admin ON environments FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Experience levels: public read, admin write
ALTER TABLE experience_level_descriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY exp_level_select ON experience_level_descriptions FOR SELECT USING (true);
CREATE POLICY exp_level_admin ON experience_level_descriptions FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Trips: complex policies
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY trips_select_public ON trips FOR SELECT
  USING (deleted_at IS NULL AND visibility = 'public'
    AND status IN ('published', 'registration_open', 'active', 'completed'));

CREATE POLICY trips_select_organizer ON trips FOR SELECT
  USING (deleted_at IS NULL AND organizer_id = auth.uid());

CREATE POLICY trips_select_participant ON trips FOR SELECT
  USING (deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM trip_participants tp
    WHERE tp.trip_id = trips.id AND tp.user_id = auth.uid()
      AND tp.status IN ('approved', 'approved_pending_payment', 'participant')
  ));

CREATE POLICY trips_insert ON trips FOR INSERT
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY trips_update ON trips FOR UPDATE
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY trips_delete ON trips FOR DELETE
  USING (organizer_id = auth.uid());

-- Crew positions: public read, organizer write
ALTER TABLE trip_crew_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY crew_select ON trip_crew_positions FOR SELECT USING (true);
CREATE POLICY crew_modify ON trip_crew_positions FOR ALL
  USING (EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_crew_positions.trip_id AND t.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_crew_positions.trip_id AND t.organizer_id = auth.uid()));

-- Participants: organizer sees all, user sees own + fellow participants
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY participants_select_organizer ON trip_participants FOR SELECT
  USING (EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_participants.trip_id AND t.organizer_id = auth.uid()));

CREATE POLICY participants_select_own ON trip_participants FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY participants_select_fellow ON trip_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trip_participants tp
    WHERE tp.trip_id = trip_participants.trip_id AND tp.user_id = auth.uid()
      AND tp.status IN ('approved', 'participant')
  ));

CREATE POLICY participants_insert ON trip_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY participants_update_organizer ON trip_participants FOR UPDATE
  USING (EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_participants.trip_id AND t.organizer_id = auth.uid()));

CREATE POLICY participants_update_own ON trip_participants FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Itinerary: public read, organizer write
ALTER TABLE trip_itinerary_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY itinerary_select ON trip_itinerary_days FOR SELECT USING (true);
CREATE POLICY itinerary_modify ON trip_itinerary_days FOR ALL
  USING (EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_itinerary_days.trip_id AND t.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_itinerary_days.trip_id AND t.organizer_id = auth.uid()));

-- POIs: public read, organizer write
ALTER TABLE trip_pois ENABLE ROW LEVEL SECURITY;
CREATE POLICY pois_select ON trip_pois FOR SELECT USING (true);
CREATE POLICY pois_modify ON trip_pois FOR ALL
  USING (EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_pois.trip_id AND t.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM trips t WHERE t.id = trip_pois.trip_id AND t.organizer_id = auth.uid()));

-- Templates: public read, own modify
ALTER TABLE trip_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY templates_select_public ON trip_templates FOR SELECT
  USING (is_public = true AND status = 'active');
CREATE POLICY templates_select_own ON trip_templates FOR SELECT
  USING (creator_id = auth.uid());
CREATE POLICY templates_modify_own ON trip_templates FOR ALL
  USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

-- ============================================
-- 5. SEED DATA — 8 Categories
-- ============================================

INSERT INTO categories (id, name, name_localized, description, icon_name, color_hex, status, display_order) VALUES
  (gen_random_uuid(), 'Hiking', '{"hu":"Túrázás","en":"Hiking","de":"Wandern","sk":"Turistika","hr":"Planinarenje","ro":"Drumeție"}',
    'Explore trails and paths in nature', 'footprints', '#22C55E', 'active', 1),
  (gen_random_uuid(), 'Mountain', '{"hu":"Hegymászás","en":"Mountain","de":"Bergsteigen","sk":"Horolezectvo","hr":"Planinarstvo","ro":"Alpinism"}',
    'Climbing and mountaineering adventures', 'mountain', '#F97316', 'active', 2),
  (gen_random_uuid(), 'Water Sports', '{"hu":"Vízi sportok","en":"Water Sports","de":"Wassersport","sk":"Vodné športy","hr":"Vodeni sportovi","ro":"Sporturi nautice"}',
    'Sailing, kayaking, surfing and more', 'waves', '#3B82F6', 'active', 3),
  (gen_random_uuid(), 'Cycling', '{"hu":"Kerékpározás","en":"Cycling","de":"Radfahren","sk":"Cyklistika","hr":"Biciklizam","ro":"Ciclism"}',
    'Road, mountain and gravel cycling', 'bike', '#EAB308', 'active', 4),
  (gen_random_uuid(), 'Running', '{"hu":"Futás","en":"Running","de":"Laufen","sk":"Beh","hr":"Trčanje","ro":"Alergare"}',
    'Trail running, ultra and road races', 'timer', '#EF4444', 'active', 5),
  (gen_random_uuid(), 'Winter Sports', '{"hu":"Téli sportok","en":"Winter Sports","de":"Wintersport","sk":"Zimné športy","hr":"Zimski sportovi","ro":"Sporturi de iarnă"}',
    'Ski touring, backcountry and snowshoeing', 'snowflake', '#06B6D4', 'active', 6),
  (gen_random_uuid(), 'Expedition', '{"hu":"Expedíció","en":"Expedition","de":"Expedition","sk":"Expedícia","hr":"Ekspedicija","ro":"Expediție"}',
    'Multi-day wilderness and extreme adventures', 'compass', '#8B5CF6', 'active', 7),
  (gen_random_uuid(), 'Motorsport', '{"hu":"Motorsport","en":"Motorsport","de":"Motorsport","sk":"Motoršport","hr":"Motosport","ro":"Motorsport"}',
    'Motorcycle touring, enduro and off-road', 'gauge', '#B91C1C', 'active', 8)
ON CONFLICT DO NOTHING;

COMMIT;
