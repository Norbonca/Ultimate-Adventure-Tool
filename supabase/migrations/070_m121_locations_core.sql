-- 070 — M121 Location Service, első szelet: locations + trip_locations (2026-11-01). Idempotens.
-- Spec: modules/12_Map_Service/121_Location_Service/01_Funkcionalis_Specifikacio.md §5.1, §5.2, §5.5.
-- Első fogyasztó: M021 Menetrend — helyszín a mérföldkőhöz és a feladathoz (Norbert, 2026-11-01).
-- Számozás: az M121 070-től (MIGRATION_PROTOCOL). Nem függ a 058–069-től.
--
-- Eltérések a spectől (indoklással, a spec §5.2/§5.5 jegyzetében is):
--   (a) trip_locations.milestone_id / task_id ON DELETE CASCADE (spec: SET NULL) — a kötés a mérföldkő
--       nélkül értelmetlen; maga a hely (locations sor) a szervező könyvtárában megmarad.
--   (b) egy mérföldkőhöz és egy feladathoz legfeljebb egy kötés (V1, részleges egyedi index).
--   (c) a jogosultság a timeline-táblák mintáját követi: is_trip_organizer() / is_trip_participant()
--       (022), nem a trips-al-lekérdezést — így nincs RLS-rekurzió, és a soft-delete-et is figyeli.
--   (d) ÚJ szabály a locations táblán: olvasható, ha a hívó lát rá mutató trip_locations sort
--       (a spec 5.5 csak saját és publikus olvasást ad — a résztvevő különben nem látná a helyet).

-- 1. Hely
CREATE TABLE IF NOT EXISTS public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name varchar(300) NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 300),
  name_localized jsonb DEFAULT '{}',
  description text,
  description_localized jsonb DEFAULT '{}',
  location_type varchar(30) NOT NULL DEFAULT 'poi',
  latitude numeric(10,7) CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude numeric(10,7) CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  geo extensions.geography(Point, 4326) GENERATED ALWAYS AS (
    CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
      THEN extensions.st_setsrid(extensions.st_makepoint(longitude::double precision, latitude::double precision), 4326)::extensions.geography
      ELSE NULL
    END
  ) STORED,
  elevation_m integer,
  accuracy_m numeric(6,1),
  address_line1 varchar(300),
  address_line2 varchar(300),
  city varchar(100),
  region varchar(100),
  postal_code varchar(20),
  country_code char(2),
  formatted_address text,
  phone varchar(30),
  email varchar(254),
  website text,
  metadata jsonb DEFAULT '{}',
  geocode_source varchar(30),
  geocode_precision varchar(10),
  geocode_place_id varchar(300),
  geocoded_at timestamptz,
  geocode_raw jsonb,
  photos jsonb DEFAULT '[]',
  icon varchar(50),
  color varchar(7),
  is_public boolean NOT NULL DEFAULT false,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT locations_coords_paired CHECK ((latitude IS NULL) = (longitude IS NULL)),
  CONSTRAINT locations_precision_valid CHECK (geocode_precision IS NULL
    OR geocode_precision IN ('country','region','city','place','exact'))
);
CREATE INDEX IF NOT EXISTS idx_locations_user ON public.locations(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_locations_type ON public.locations(location_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_locations_geo ON public.locations USING gist(geo) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_locations_country ON public.locations(country_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_locations_public ON public.locations(is_public) WHERE deleted_at IS NULL AND is_public = true;
COMMENT ON TABLE public.locations IS
  'M121: egységes hely (név, koordináta, cím, geokódolási forrás). Tulajdonosa a létrehozó; túrához a trip_locations köti.';

DROP TRIGGER IF EXISTS set_updated_at_locations ON public.locations;
CREATE TRIGGER set_updated_at_locations BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Hely ↔ túra (kontextussal)
CREATE TABLE IF NOT EXISTS public.trip_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  context varchar(30) NOT NULL CHECK (context IN ('area','start','end','meeting_point','accommodation',
    'transport_hub','daily_start','daily_end','waypoint','supply','emergency','extra_program','parking','custom')),
  itinerary_day_id uuid REFERENCES public.trip_itinerary_days(id) ON DELETE SET NULL,
  milestone_id uuid REFERENCES public.trip_milestones(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.trip_tasks(id) ON DELETE CASCADE,
  label varchar(200),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 500),
  arrival_time time,
  departure_time time,
  day_number integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_trip_location UNIQUE (trip_id, location_id, context, itinerary_day_id)
);
CREATE INDEX IF NOT EXISTS idx_trip_locations_trip ON public.trip_locations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_locations_location ON public.trip_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_trip_locations_day ON public.trip_locations(itinerary_day_id);
CREATE INDEX IF NOT EXISTS idx_trip_locations_context ON public.trip_locations(trip_id, context);
CREATE UNIQUE INDEX IF NOT EXISTS uq_trip_area ON public.trip_locations(trip_id) WHERE context = 'area';
CREATE UNIQUE INDEX IF NOT EXISTS uq_trip_start ON public.trip_locations(trip_id) WHERE context = 'start';
CREATE UNIQUE INDEX IF NOT EXISTS uq_trip_end ON public.trip_locations(trip_id) WHERE context = 'end';
CREATE UNIQUE INDEX IF NOT EXISTS uq_trip_locations_milestone ON public.trip_locations(milestone_id) WHERE milestone_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_trip_locations_task ON public.trip_locations(task_id) WHERE task_id IS NOT NULL;
COMMENT ON TABLE public.trip_locations IS
  'M121: hely ↔ túra kötés kontextussal; opcionálisan napi programhoz, mérföldkőhöz (M021) vagy feladathoz.';

-- 3. Integritás: a kötött mérföldkő / feladat ugyanabba a túrába tartozzon, és a hely a hívóé vagy publikus
--    legyen (különben egy idegen privát hely UUID-ját is be lehetne kötni). SECURITY DEFINER: a hivatkozott
--    sorok RLS nélkül olvasandók; a hívó jogát a trip_locations RLS-e már ellenőrizte.
CREATE OR REPLACE FUNCTION public.guard_trip_location_refs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.milestone_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM trip_milestones m WHERE m.id = NEW.milestone_id AND m.trip_id = NEW.trip_id) THEN
    RAISE EXCEPTION 'trip_locations: a mérföldkő nem ehhez a túrához tartozik' USING ERRCODE = '23514';
  END IF;
  IF NEW.task_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM trip_tasks t WHERE t.id = NEW.task_id AND t.trip_id = NEW.trip_id) THEN
    RAISE EXCEPTION 'trip_locations: a feladat nem ehhez a túrához tartozik' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM locations l WHERE l.id = NEW.location_id AND l.deleted_at IS NULL
      AND (l.created_by = auth.uid() OR l.is_public OR auth.uid() IS NULL)) THEN
    RAISE EXCEPTION 'trip_locations: a hely nem használható' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.guard_trip_location_refs() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_trip_location_refs ON public.trip_locations;
CREATE TRIGGER guard_trip_location_refs BEFORE INSERT OR UPDATE OF trip_id, location_id, milestone_id, task_id
  ON public.trip_locations FOR EACH ROW EXECUTE FUNCTION public.guard_trip_location_refs();

-- 4. RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS locations_own ON public.locations;
CREATE POLICY locations_own ON public.locations FOR ALL TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS locations_public_read ON public.locations;
CREATE POLICY locations_public_read ON public.locations FOR SELECT
  USING (is_public = true AND deleted_at IS NULL);

-- (d) a trip_locations RLS-e a részlekérdezésben is érvényes: csak az a kötés számít, amelyet a hívó lát.
DROP POLICY IF EXISTS locations_via_trip_read ON public.locations;
CREATE POLICY locations_via_trip_read ON public.locations FOR SELECT
  USING (deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM public.trip_locations tl WHERE tl.location_id = locations.id));

DROP POLICY IF EXISTS trip_locations_organizer ON public.trip_locations;
CREATE POLICY trip_locations_organizer ON public.trip_locations FOR ALL TO authenticated
  USING (is_trip_organizer(trip_id))
  WITH CHECK (is_trip_organizer(trip_id));

DROP POLICY IF EXISTS trip_locations_participant_read ON public.trip_locations;
CREATE POLICY trip_locations_participant_read ON public.trip_locations FOR SELECT TO authenticated
  USING (is_trip_participant(trip_id));

DROP POLICY IF EXISTS trip_locations_public_area ON public.trip_locations;
CREATE POLICY trip_locations_public_area ON public.trip_locations FOR SELECT
  USING (context = 'area' AND EXISTS (
    SELECT 1 FROM public.trips t WHERE t.id = trip_locations.trip_id
      AND t.status = 'published' AND t.visibility = 'public' AND t.deleted_at IS NULL));

-- 5. Jogok (Supabase: az anon külön visszavonandó — SEC-018)
REVOKE ALL ON TABLE public.locations, public.trip_locations FROM anon;
GRANT SELECT ON TABLE public.locations, public.trip_locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.locations, public.trip_locations TO authenticated;
