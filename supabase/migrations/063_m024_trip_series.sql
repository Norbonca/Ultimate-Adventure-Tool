-- 063 — M024 Túrasorozat: több időpont, minden időpont önálló túra (2026-11-01). Idempotens.
-- Spec: modules/02_Trip_Management/024_Trip_Series/00_Uzleti_Specifikacio.md (BR-M024-001…008, K-1…K-11).
-- Számozás: a gap terv 063-as fenntartása (a CI `db push --include-all`-lal fut, sorrenden kívül is alkalmazható).
--
-- Modell: trip_series (a sorozat) + trips.series_id (NULL = önálló túra). A sorozatnak nincs saját tartalma
-- a címen kívül: minden időpont teljes, önálló túra (jelentkezők, létszám, ár, elszámolás külön). Az összevonás
-- kizárólag megjelenítési szabály (Discover-kártya), az adatbázisban nincs „szülő túra”.

-- 1. Sorozat
CREATE TABLE IF NOT EXISTS public.trip_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trip_series_organizer_idx ON public.trip_series (organizer_id);
COMMENT ON TABLE public.trip_series IS
  'M024: túrasorozat. Csak csoportosít; minden időpont önálló trips-sor (trips.series_id). A Discover-kártya vonja össze.';

DROP TRIGGER IF EXISTS set_updated_at_trip_series ON public.trip_series;
CREATE TRIGGER set_updated_at_trip_series BEFORE UPDATE ON public.trip_series
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Túra → sorozat
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS series_id uuid NULL
  REFERENCES public.trip_series(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS trips_series_id_idx ON public.trips (series_id) WHERE series_id IS NOT NULL;
COMMENT ON COLUMN public.trips.series_id IS
  'M024: a túrasorozat, amelybe ez az időpont tartozik. NULL = önálló túra. Csak a túra szervezőjének sorozata lehet.';

-- 3. Integritás: egy túra csak a saját szervezőjének sorozatába tartozhat (különben bárki „becsatolhatná”
--    a saját túráját egy idegen sorozat kártyájára). A trips UPDATE-szabály csak a túra tulajdonosát nézi,
--    a hivatkozott sorozatét nem — ezt a trigger pótolja. SECURITY DEFINER: a sorozat sora RLS nélkül olvasandó.
CREATE OR REPLACE FUNCTION public.guard_trip_series_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.series_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.trip_series s WHERE s.id = NEW.series_id AND s.organizer_id = NEW.organizer_id
  ) THEN
    RAISE EXCEPTION 'trip_series_owner_mismatch' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.guard_trip_series_owner() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_trip_series_owner ON public.trips;
CREATE TRIGGER trg_guard_trip_series_owner BEFORE INSERT OR UPDATE OF series_id, organizer_id ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.guard_trip_series_owner();

-- 4. RLS — a sorozat címe nyilvános adat (a nyilvános túrák kártyáján látszik); írni csak a szervező.
ALTER TABLE public.trip_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trip_series_select ON public.trip_series;
CREATE POLICY trip_series_select ON public.trip_series FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS trip_series_insert ON public.trip_series;
CREATE POLICY trip_series_insert ON public.trip_series FOR INSERT TO authenticated
  WITH CHECK (organizer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS trip_series_update ON public.trip_series;
CREATE POLICY trip_series_update ON public.trip_series FOR UPDATE TO authenticated
  USING (organizer_id = (SELECT auth.uid())) WITH CHECK (organizer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS trip_series_delete ON public.trip_series;
CREATE POLICY trip_series_delete ON public.trip_series FOR DELETE TO authenticated
  USING (organizer_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.trip_series FROM anon;
GRANT SELECT ON TABLE public.trip_series TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.trip_series TO authenticated;

-- 5. Új időpont (BR-M024-006): a forrástúra másolata új dátummal, ugyanabban a sorozatban, PISZKOZATKÉNT.
--    Másol: leírás, részletek, kategória, helyszín, nehézség, képek, beállítások, program (napok + POI-k,
--    a napok dátuma az új kezdéshez tolva). Nem másol: jelentkezők, stáb (pozíciók, ülőhelyek betöltése),
--    költségek és elszámolás, menetrend (fázisok, mérföldkövek), közzététel. Ha a forrás még nem sorozat
--    tagja, a függvény létrehozza a sorozatot és a forrást is beleteszi.
--    SECURITY INVOKER: minden írás a hívó RLS-ével megy (trips_insert, itinerary_modify, pois_modify).
CREATE OR REPLACE FUNCTION public.add_trip_series_date(
  p_trip_id uuid,
  p_start_date date,
  p_end_date date,
  p_max_participants integer,
  p_price_amount numeric,
  p_registration_deadline date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  src public.trips%ROWTYPE;
  v_series uuid;
  v_new uuid;
  v_shift integer;
  d record;
  v_day uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'invalid_dates' USING ERRCODE = '22023';
  END IF;
  IF p_max_participants IS NULL OR p_max_participants < 1 OR p_max_participants > 1000 THEN
    RAISE EXCEPTION 'invalid_max_participants' USING ERRCODE = '22023';
  END IF;
  IF p_price_amount IS NOT NULL AND p_price_amount < 0 THEN
    RAISE EXCEPTION 'invalid_price' USING ERRCODE = '22023';
  END IF;
  IF p_registration_deadline IS NOT NULL AND p_registration_deadline > p_start_date THEN
    RAISE EXCEPTION 'invalid_deadline' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO src FROM public.trips
   WHERE id = p_trip_id AND organizer_id = v_uid AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'trip_not_found' USING ERRCODE = '42501';
  END IF;

  v_series := src.series_id;
  IF v_series IS NULL THEN
    INSERT INTO public.trip_series (organizer_id, title) VALUES (v_uid, left(src.title, 300))
      RETURNING id INTO v_series;
    UPDATE public.trips SET series_id = v_series WHERE id = src.id;
  END IF;

  INSERT INTO public.trips (
    organizer_id, org_id, category_id, sub_discipline_id, title, slug, short_description, description,
    cover_image_url, cover_image_source, card_image_url, card_image_source, difficulty,
    start_date, end_date, meeting_point, meeting_point_geo, location_country, location_region, location_city,
    country_codes, location_lat, location_lng, location_geocoded_at, location_geocode_source, timezone,
    max_participants, min_participants, staff_seats, price_amount, price_currency, price_includes, price_excludes,
    is_cost_sharing, category_details, tags, language, visibility, require_approval, auto_accept,
    registration_deadline_date, show_on_landing, template_id, settlement_currency, fx_mode,
    expenses_participants_can_add, series_id, status
  ) VALUES (
    src.organizer_id, src.org_id, src.category_id, src.sub_discipline_id, src.title,
    left(public.generate_trip_slug(src.title), 190) || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6),
    src.short_description, src.description,
    src.cover_image_url, src.cover_image_source, src.card_image_url, src.card_image_source, src.difficulty,
    p_start_date, p_end_date, src.meeting_point, src.meeting_point_geo, src.location_country, src.location_region,
    src.location_city, src.country_codes, src.location_lat, src.location_lng, src.location_geocoded_at,
    src.location_geocode_source, src.timezone,
    p_max_participants, LEAST(src.min_participants, p_max_participants), src.staff_seats,
    p_price_amount, src.price_currency, src.price_includes, src.price_excludes,
    src.is_cost_sharing, src.category_details, src.tags, src.language, src.visibility, src.require_approval,
    src.auto_accept, p_registration_deadline, src.show_on_landing, src.template_id, src.settlement_currency,
    src.fx_mode, src.expenses_participants_can_add, v_series, 'draft'
  ) RETURNING id INTO v_new;

  -- Program: a napok dátuma az új kezdéshez tolva; a POI-k a megfelelő új naphoz kötve.
  v_shift := CASE WHEN src.start_date IS NULL THEN NULL ELSE p_start_date - src.start_date END;
  FOR d IN SELECT * FROM public.trip_itinerary_days WHERE trip_id = src.id ORDER BY day_number LOOP
    INSERT INTO public.trip_itinerary_days (
      trip_id, day_number, title, description, date, start_location, end_location, distance_km,
      elevation_gain_m, estimated_hours, route_geojson, latitude, longitude
    ) VALUES (
      v_new, d.day_number, d.title, d.description,
      CASE WHEN d.date IS NULL OR v_shift IS NULL THEN NULL ELSE d.date + v_shift END,
      d.start_location, d.end_location, d.distance_km, d.elevation_gain_m, d.estimated_hours, d.route_geojson,
      d.latitude, d.longitude
    ) RETURNING id INTO v_day;

    INSERT INTO public.trip_pois (
      trip_id, itinerary_day_id, name, description, poi_type, latitude, longitude, marker_color, icon,
      sort_order, elevation_m, photos, metadata, geo
    )
    SELECT v_new, v_day, p.name, p.description, p.poi_type, p.latitude, p.longitude, p.marker_color, p.icon,
           p.sort_order, p.elevation_m, p.photos, p.metadata, p.geo
      FROM public.trip_pois p WHERE p.trip_id = src.id AND p.itinerary_day_id = d.id;
  END LOOP;

  -- Naphoz nem kötött POI-k.
  INSERT INTO public.trip_pois (
    trip_id, itinerary_day_id, name, description, poi_type, latitude, longitude, marker_color, icon,
    sort_order, elevation_m, photos, metadata, geo
  )
  SELECT v_new, NULL, p.name, p.description, p.poi_type, p.latitude, p.longitude, p.marker_color, p.icon,
         p.sort_order, p.elevation_m, p.photos, p.metadata, p.geo
    FROM public.trip_pois p WHERE p.trip_id = src.id AND p.itinerary_day_id IS NULL;

  RETURN v_new;
END;
$$;
COMMENT ON FUNCTION public.add_trip_series_date(uuid, date, date, integer, numeric, date) IS
  'M024 BR-M024-006: új időpont a forrástúra másolataként, piszkozatként, ugyanabban a sorozatban. SECURITY INVOKER.';

-- Supabase-en a REVOKE FROM PUBLIC önmagában hatástalan (SEC-018): az anon szerepet külön kell visszavonni.
REVOKE EXECUTE ON FUNCTION public.add_trip_series_date(uuid, date, date, integer, numeric, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_trip_series_date(uuid, date, date, integer, numeric, date) TO authenticated;

-- 6. Az üres sorozat takarítása leválasztás / törlés után: ha a sorozatban legfeljebb egy túra marad,
--    a sorozat megszűnik (K-11: egy időpontú sorozat úgyis normál kártya). A trigger SECURITY DEFINER,
--    mert a megmaradó túra lehet nem látható a hívónak (pl. törölt) — csak a series_id-t nullázza.
CREATE OR REPLACE FUNCTION public.cleanup_trip_series()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old uuid := OLD.series_id;
BEGIN
  IF v_old IS NULL THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.series_id IS NOT DISTINCT FROM v_old AND NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at THEN
      RETURN NULL;
    END IF;
  END IF;
  IF (SELECT count(*) FROM public.trips WHERE series_id = v_old AND deleted_at IS NULL) <= 1 THEN
    UPDATE public.trips SET series_id = NULL WHERE series_id = v_old;
    DELETE FROM public.trip_series WHERE id = v_old;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cleanup_trip_series() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cleanup_trip_series ON public.trips;
CREATE TRIGGER trg_cleanup_trip_series AFTER UPDATE OF series_id, deleted_at OR DELETE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_trip_series();
