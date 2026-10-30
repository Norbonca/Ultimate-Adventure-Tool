-- Migration 050: a túra időzónája alapból a helyszín helyi ideje (M23, Norbert döntése 2026-10-30:
-- „mindig a túra helye szerinti helyi idő legyen az alap, és ezt jól láthatóan jelezzük mindenhol”).
--
-- Előzmény: a 036 a trips.timezone oszlopot 'UTC' alapértékkel vette fel, és élesben minden túra ezzel
-- maradt — a jelentkezési határidő ezért UTC-éjfélkor zárt, nem a helyszín éjfelén.
--
-- 1. Trigger: ha a szervező nem választott zónát (NULL/üres/'UTC'), a helyszín országának fő zónája
--    (ref_countries.primary_timezone) lesz a túra zónája. A trigger neve 'trg_a_…', hogy a 036-os
--    trg_set_trip_registration_deadline előtt fusson (a BEFORE triggerek névsorban futnak), így a
--    zárópillanat már a helyi zónával számolódik; ha csak az ország változik, itt számoljuk újra.
-- 2. Backfill: a meglévő 'UTC' zónájú túrák az országuk fő zónáját kapják (többzónás országnál a fő zóna;
--    eltérő helyszínt — pl. Teide → Atlantic/Canary — a szervező vagy admin állít).
-- Idempotens. Az M121 migrációja 051-től.

CREATE OR REPLACE FUNCTION public.set_trip_timezone_from_location()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_tz text;
BEGIN
  IF (NEW.timezone IS NULL OR btrim(NEW.timezone) = '' OR NEW.timezone = 'UTC')
     AND NEW.location_country IS NOT NULL THEN
    SELECT c.primary_timezone INTO v_tz
    FROM public.ref_countries c
    WHERE c.code = upper(NEW.location_country) AND c.is_active = true;
    IF v_tz IS NOT NULL THEN
      NEW.timezone := v_tz;
      IF NEW.registration_deadline_date IS NOT NULL THEN
        NEW.registration_deadline := ((NEW.registration_deadline_date + 1)::timestamp AT TIME ZONE NEW.timezone);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_a_set_trip_timezone_from_location ON public.trips;
CREATE TRIGGER trg_a_set_trip_timezone_from_location
BEFORE INSERT OR UPDATE OF timezone, location_country ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.set_trip_timezone_from_location();

COMMENT ON COLUMN public.trips.timezone IS
  'M23: a túra időzónája (IANA). Alapból a helyszín országának fő zónája (050-es trigger); a szervező felülírhatja. A jelentkezési határidő ennek a zónának a napja végén zár; az időpontok ebben a zónában értendők.';

-- Backfill
UPDATE public.trips t
SET timezone = c.primary_timezone
FROM public.ref_countries c
WHERE t.timezone = 'UTC'
  AND t.location_country IS NOT NULL
  AND c.code = upper(t.location_country)
  AND c.is_active = true
  AND c.primary_timezone IS NOT NULL;
