-- Migration 036: trips.timezone + registration_deadline_date
--
-- Hiba (TZ-01, M23 Calendar spec 4.2): a jelentkezési határidő a megadott nap ELEJÉN zárt.
-- A dátumválasztó 'YYYY-MM-DD' értéke nyersen került a TIMESTAMPTZ oszlopba (00:00 UTC),
-- a résztvevő-őr pedig `registration_deadline < now()` feltétellel zárt.
--
-- Javítás (Norbert döntése, 2026-09-15): a szervezés időzónáját a szervező állítja be,
-- alapértelmezés: UTC. A szervező napot ad meg; a határidő a megadott napot követő nap
-- 00:00-kor zár a túra időzónájában (kizárólagos felső határ), a felületen „<nap> 23:59-ig”.
--
-- Idempotens: IF NOT EXISTS, CREATE OR REPLACE, a backfill csak üres dátumú sorokat érint.
BEGIN;

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS registration_deadline_date date;

COMMENT ON COLUMN public.trips.timezone IS
  'M23: a szervezés időzónája (IANA azonosító, pl. Europe/Budapest). A szervező állítja be; alapértelmezés: UTC.';
COMMENT ON COLUMN public.trips.registration_deadline_date IS
  'M23: a szervező által megadott jelentkezési határnap. A registration_deadline ebből számolt zárópillanat: a következő nap 00:00 a trips.timezone szerint.';
COMMENT ON COLUMN public.trips.registration_deadline IS
  'Zárópillanat (kizárólagos felső határ). Ha a registration_deadline_date ki van töltve, a trg_set_trip_registration_deadline számolja.';

-- A zóna ellenőrzése és a zárópillanat számítása.
CREATE OR REPLACE FUNCTION public.set_trip_registration_deadline()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.timezone IS NULL OR length(trim(NEW.timezone)) = 0 THEN
    NEW.timezone := 'UTC';
  END IF;
  BEGIN
    PERFORM now() AT TIME ZONE NEW.timezone;
  EXCEPTION WHEN invalid_parameter_value THEN
    RAISE EXCEPTION 'invalid_timezone' USING ERRCODE = '22023';
  END;

  IF NEW.registration_deadline_date IS NOT NULL THEN
    NEW.registration_deadline := ((NEW.registration_deadline_date + 1)::timestamp AT TIME ZONE NEW.timezone);
  ELSIF TG_OP = 'UPDATE' AND OLD.registration_deadline_date IS NOT NULL THEN
    -- a szervező törölte a határnapot
    NEW.registration_deadline := NULL;
  END IF;
  -- Ha nincs határnap és korábban sem volt, a közvetlenül írt registration_deadline érintetlen marad.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_trip_registration_deadline ON public.trips;
CREATE TRIGGER trg_set_trip_registration_deadline
BEFORE INSERT OR UPDATE OF registration_deadline_date, timezone, registration_deadline ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.set_trip_registration_deadline();

-- Backfill: a meglévő határidők napja UTC szerint (a régi kliens 00:00 UTC-t írt a megadott napra).
-- A trigger a frissítéskor a következő nap 00:00 UTC-re állítja a zárópillanatot.
UPDATE public.trips
SET registration_deadline_date = (registration_deadline AT TIME ZONE 'UTC')::date
WHERE registration_deadline IS NOT NULL
  AND registration_deadline_date IS NULL;

-- A résztvevő-őr: a zárópillanat kizárólagos felső határ (<= now()). A függvény többi része
-- változatlanul a 031-es migrációból.
CREATE OR REPLACE FUNCTION public.guard_participant_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t public.trips; expected_status text;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.trip_id <> OLD.trip_id OR NEW.user_id <> OLD.user_id) THEN
    RAISE EXCEPTION 'participant_identity_immutable' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO t FROM public.trips WHERE id = NEW.trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'trip_not_found'; END IF;
  IF auth.role() = 'authenticated' AND t.organizer_id IS DISTINCT FROM auth.uid() THEN
    IF NEW.user_id IS DISTINCT FROM auth.uid() OR NEW.is_staff_seat
      OR NEW.crew_position_id IS NOT NULL OR NEW.checked_in OR NEW.checked_in_at IS NOT NULL
      OR NEW.paid_at IS NOT NULL OR NEW.rejection_reason IS NOT NULL OR NEW.skill_match IS NOT NULL THEN
      RAISE EXCEPTION 'participant_fields_forbidden' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.status::text = 'cancelled'
      AND OLD.status::text IN ('pending','approved','approved_pending_payment','waitlisted') THEN
      NEW.approved_at := OLD.approved_at;
      RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.status::text <> 'cancelled' THEN
      RAISE EXCEPTION 'participant_transition_forbidden' USING ERRCODE = '42501';
    END IF;
    IF t.deleted_at IS NOT NULL OR t.status::text NOT IN ('published','registration_open')
      OR t.visibility::text <> 'public'
      OR (t.registration_deadline IS NOT NULL AND t.registration_deadline <= now()) THEN
      RAISE EXCEPTION 'trip_not_accepting_applications' USING ERRCODE = '42501';
    END IF;
    expected_status := CASE WHEN t.require_approval THEN 'pending' ELSE 'approved' END;
    IF NEW.status::text <> expected_status THEN
      RAISE EXCEPTION 'participant_approval_required' USING ERRCODE = '42501';
    END IF;
    NEW.approved_at := CASE WHEN t.require_approval THEN NULL ELSE now() END;
    NEW.applied_at := now();
  END IF;
  IF length(NEW.application_text) > 5000 THEN RAISE EXCEPTION 'application_too_long'; END IF;
  RETURN NEW;
END;
$$;

COMMIT;
