-- Migration 041: fiók törlése (US-M01-017, UC-M01-003) és túra törlése / lemondása (US-M02-015, BR-M02-009)
--
-- Hiba (Norbert, 2026-09-15): „a felhasználó nem tudja törölni magát”, „a felhasználó nem tudja törölni a túráját”.
-- Design: D01 `RbzSn` + `kHbUE` (fiók), D02 `v54yy` + `m5cJrw` + `XKV28` dangerSec (túra).
--
-- Fiók: a törlés kérése azonnal inaktívvá teszi a profilt (deleted_at), 30 napos türelmi idővel
--   (deletion_requested_at, deletion_scheduled_for). A türelmi időben belépve visszaállítható.
--   Az admin tiltás továbbra is csak deleted_at — a deletion_requested_at különbözteti meg,
--   ezért tiltott felhasználó nem „állíthatja vissza” magát.
-- Túra: piszkozat → végleges törlés; publikált, aktív jelentkező nélkül → soft delete, 30 napig
--   visszaállítható; aktív jelentkezővel → lemondás kötelező okkal, a jelentkezések lezárulnak.
-- Lejárat: purge_expired_deletions() — csak service_role futtathatja; az ütemezése külön döntés.
--
-- Biztonsági javítás: a guard_profile_system_fields eddig nem védte a deleted_at mezőt, így a
-- profiles_update_own policy mellett egy tiltott felhasználó saját maga törölhette a tiltását.
--
-- Idempotens: IF NOT EXISTS, CREATE OR REPLACE, DROP POLICY IF EXISTS.
BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deletion_scheduled_for timestamptz;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS cancellation_message text;

COMMENT ON COLUMN public.profiles.deletion_requested_at IS
  'US-M01-017: a felhasználó ekkor kérte a fiókja törlését. NULL + deleted_at = admin tiltás.';
COMMENT ON COLUMN public.profiles.deletion_scheduled_for IS
  'US-M01-017: a türelmi idő vége (kérés + 30 nap); ezután a purge_expired_deletions() anonimizál.';
COMMENT ON COLUMN public.trips.cancellation_message IS
  'BR-M02-009: a szervező opcionális üzenete a jelentkezőknek lemondáskor (max. 2000 karakter).';

CREATE INDEX IF NOT EXISTS idx_profiles_deletion_scheduled
  ON public.profiles (deletion_scheduled_for) WHERE deletion_requested_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trips_soft_deleted
  ON public.trips (deleted_at) WHERE deleted_at IS NOT NULL;

-- ── A profil rendszermezői: a deleted_at és a törlési mezők is csak szerveroldalon írhatók ──
CREATE OR REPLACE FUNCTION public.guard_profile_system_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.subscription_tier::text <> 'free'
        OR NEW.subscription_expires_at IS NOT NULL OR NEW.stripe_customer_id IS NOT NULL
        OR NEW.reputation_points <> 0 OR NEW.reputation_level <> 1
        OR NEW.verified_organizer OR NEW.email_verified OR NEW.two_fa_enabled
        OR NEW.deleted_at IS NOT NULL OR NEW.deletion_requested_at IS NOT NULL
        OR NEW.deletion_scheduled_for IS NOT NULL THEN
        RAISE EXCEPTION 'profile_system_fields_read_only' USING ERRCODE = '42501';
      END IF;
    ELSIF ROW(NEW.subscription_tier, NEW.subscription_expires_at, NEW.stripe_customer_id,
        NEW.reputation_points, NEW.reputation_level, NEW.verified_organizer,
        NEW.email_verified, NEW.two_fa_enabled,
        NEW.deleted_at, NEW.deletion_requested_at, NEW.deletion_scheduled_for)
      IS DISTINCT FROM ROW(OLD.subscription_tier, OLD.subscription_expires_at, OLD.stripe_customer_id,
        OLD.reputation_points, OLD.reputation_level, OLD.verified_organizer,
        OLD.email_verified, OLD.two_fa_enabled,
        OLD.deleted_at, OLD.deletion_requested_at, OLD.deletion_scheduled_for) THEN
      RAISE EXCEPTION 'profile_system_fields_read_only' USING ERRCODE = '42501';
    END IF;
    -- Email is an auth identity, not arbitrary profile input.
    IF NEW.email IS DISTINCT FROM (auth.jwt()->>'email') THEN
      RAISE EXCEPTION 'profile_email_must_match_auth' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ── Fiók: állapot, törlés kérése, visszaállítás ──────────────────────────────
-- search_path = public: a trip_participants meglévő triggerei (update_crew_position_filled_spots)
-- sémanév nélkül hívnak függvényt, üres search_path mellett elbuknának. A hivatkozások minősítettek.

-- A bejelentkezett felhasználó fiókállapota. A profiles SELECT policy a deleted_at-es sort
-- a tulajdonosa elől is elrejti, ezért ez definer függvény.
CREATE OR REPLACE FUNCTION public.account_deletion_status()
RETURNS TABLE (pending_deletion boolean, deletion_scheduled_for timestamptz, suspended boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p.deleted_at IS NOT NULL AND p.deletion_requested_at IS NOT NULL,
         p.deletion_scheduled_for,
         p.deleted_at IS NOT NULL AND p.deletion_requested_at IS NULL
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

-- UC-M01-003 5–9. lépés. A jelszó-ellenőrzés a szerveroldali actionben történik, előtte.
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  uid uuid := auth.uid();
  blocking jsonb;
  scheduled timestamptz := now() + interval '30 days';
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;

  PERFORM 1 FROM public.profiles WHERE id = uid AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'account_not_active' USING ERRCODE = '42501'; END IF;

  -- 5a: aktív szervezői túra mellett a fiók nem törölhető.
  SELECT jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'slug', t.slug,
           'status', t.status, 'start_date', t.start_date, 'end_date', t.end_date,
           'current_participants', t.current_participants) ORDER BY t.start_date NULLS LAST)
    INTO blocking
  FROM public.trips t
  WHERE t.organizer_id = uid AND t.deleted_at IS NULL
    AND t.status::text IN ('published', 'registration_open', 'active');
  IF blocking IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'blocked', 'trips', blocking);
  END IF;

  -- A függő és elfogadott jelentkezések visszavonása (a résztvevő-őr ezt az átmenetet engedi).
  UPDATE public.trip_participants SET status = 'cancelled'
  WHERE user_id = uid AND status::text IN ('pending', 'approved', 'approved_pending_payment', 'waitlisted');

  -- A piszkozatok a fiókkal együtt törlődnek (BR-M02-009: piszkozat → végleges törlés).
  DELETE FROM public.trips WHERE organizer_id = uid AND status::text = 'draft';

  UPDATE public.profiles
     SET deleted_at = now(), deletion_requested_at = now(), deletion_scheduled_for = scheduled
   WHERE id = uid;

  RETURN jsonb_build_object('status', 'scheduled', 'deletion_scheduled_for', scheduled);
END;
$$;

-- US-M01-017: a türelmi időben belépve visszaállítható. Tiltott fiók (deletion_requested_at NULL) nem.
CREATE OR REPLACE FUNCTION public.restore_account()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  UPDATE public.profiles
     SET deleted_at = NULL, deletion_requested_at = NULL, deletion_scheduled_for = NULL
   WHERE id = uid AND deleted_at IS NOT NULL AND deletion_requested_at IS NOT NULL
     AND deletion_scheduled_for > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'account_not_restorable' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object('status', 'restored');
END;
$$;

-- ── Túra: törlés / lemondás, visszaállítás ───────────────────────────────────

-- Aktív jelentkezés: minden, ami a túrán helyet foglal vagy döntésre vár (szervezői helyek nélkül).
CREATE OR REPLACE FUNCTION public.trip_active_applicant_count(p_trip_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT count(*)::integer FROM public.trip_participants tp
  JOIN public.trips t ON t.id = tp.trip_id
  WHERE tp.trip_id = p_trip_id AND NOT tp.is_staff_seat AND tp.user_id <> t.organizer_id
    AND tp.status::text IN ('pending', 'approved', 'approved_pending_payment', 'participant', 'waitlisted')
    AND t.organizer_id = auth.uid();
$$;

-- BR-M02-009. p_reason csak lemondásnál kötelező.
CREATE OR REPLACE FUNCTION public.delete_or_cancel_trip(p_trip_id uuid, p_reason text DEFAULT NULL, p_message text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  uid uuid := auth.uid();
  t public.trips;
  applicants integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO t FROM public.trips WHERE id = p_trip_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR t.organizer_id IS DISTINCT FROM uid THEN
    RAISE EXCEPTION 'trip_not_found' USING ERRCODE = '42501';
  END IF;

  IF t.status::text = 'draft' THEN
    DELETE FROM public.trips WHERE id = t.id;
    RETURN jsonb_build_object('result', 'deleted');
  END IF;

  IF t.status::text NOT IN ('published', 'registration_open', 'active') THEN
    RAISE EXCEPTION 'trip_not_deletable' USING ERRCODE = '23514';
  END IF;

  SELECT public.trip_active_applicant_count(t.id) INTO applicants;
  IF applicants = 0 THEN
    UPDATE public.trips SET deleted_at = now() WHERE id = t.id;
    RETURN jsonb_build_object('result', 'soft_deleted', 'restorable_until', now() + interval '30 days');
  END IF;

  IF p_reason IS NULL OR p_reason NOT IN
     ('organizer_decision', 'insufficient_participants', 'weather', 'safety', 'force_majeure') THEN
    RAISE EXCEPTION 'cancellation_reason_required' USING ERRCODE = '23514';
  END IF;
  IF length(p_message) > 2000 THEN RAISE EXCEPTION 'cancellation_message_too_long' USING ERRCODE = '23514'; END IF;

  UPDATE public.trips
     SET status = 'cancelled', cancelled_at = now(), cancelled_reason = p_reason,
         cancellation_message = NULLIF(trim(p_message), '')
   WHERE id = t.id;
  UPDATE public.trip_participants SET status = 'cancelled'
   WHERE trip_id = t.id
     AND status::text IN ('pending', 'approved', 'approved_pending_payment', 'participant', 'waitlisted');

  RETURN jsonb_build_object('result', 'cancelled', 'applicants', applicants);
END;
$$;

-- A saját, 30 napon belül törölt túrák (a trips SELECT policy a törölt sort elrejti).
CREATE OR REPLACE FUNCTION public.my_deleted_trips()
RETURNS TABLE (id uuid, title text, slug text, deleted_at timestamptz, restorable_until timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT t.id, t.title::text, t.slug::text, t.deleted_at, t.deleted_at + interval '30 days'
  FROM public.trips t
  WHERE t.organizer_id = auth.uid() AND t.deleted_at IS NOT NULL
    AND t.deleted_at > now() - interval '30 days'
  ORDER BY t.deleted_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.restore_trip(p_trip_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE restored_slug text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  UPDATE public.trips SET deleted_at = NULL
   WHERE id = p_trip_id AND organizer_id = auth.uid() AND deleted_at IS NOT NULL
     AND deleted_at > now() - interval '30 days'
  RETURNING slug INTO restored_slug;
  IF restored_slug IS NULL THEN RAISE EXCEPTION 'trip_not_restorable' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object('result', 'restored', 'slug', restored_slug);
END;
$$;

-- A lemondott túrát a jelentkezői továbbra is látják (a lemondás okával és üzenetével).
CREATE OR REPLACE FUNCTION public.has_trip_participation(p_trip_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.trip_participants tp WHERE tp.trip_id = p_trip_id AND tp.user_id = auth.uid());
$$;

DROP POLICY IF EXISTS trips_select_participant ON public.trips;
CREATE POLICY trips_select_participant ON public.trips FOR SELECT
  USING (deleted_at IS NULL AND public.has_trip_participation(id));

-- ── Lejárat: 30 nap után végleges törlés / anonimizálás ─────────────────────
-- Csak service_role futtathatja. Ütemezés (pg_cron vagy Vercel Cron) külön döntés; az első
-- lejárat a kérés után 30 nappal esedékes.
CREATE OR REPLACE FUNCTION public.purge_expired_deletions()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE purged_trips integer; anonymized integer;
BEGIN
  DELETE FROM public.trips WHERE deleted_at IS NOT NULL AND deleted_at <= now() - interval '30 days';
  GET DIAGNOSTICS purged_trips = ROW_COUNT;

  WITH due AS (
    SELECT id FROM public.profiles
    WHERE deletion_requested_at IS NOT NULL AND deleted_at IS NOT NULL
      AND deletion_scheduled_for <= now() AND email IS NOT NULL
  ), social AS (
    DELETE FROM public.user_follows f USING due WHERE f.follower_id = due.id OR f.following_id = due.id
  ), contacts AS (
    DELETE FROM public.emergency_contacts c USING due WHERE c.user_id = due.id
  ), auth_users AS (
    UPDATE auth.users u
       SET email = 'deleted-' || u.id || '@deleted.invalid', phone = NULL, encrypted_password = NULL,
           raw_user_meta_data = '{}'::jsonb, banned_until = 'infinity'::timestamptz
      FROM due WHERE u.id = due.id
  ), identities AS (
    DELETE FROM auth.identities i USING due WHERE i.user_id = due.id
  )
  UPDATE public.profiles p
     SET display_name = 'Törölt felhasználó', first_name = 'Törölt', last_name = NULL, email = NULL,
         phone = NULL, avatar_url = NULL, bio = NULL, location_city = NULL, date_of_birth = NULL,
         gender = NULL, stripe_customer_id = NULL, slug = 'deleted-' || replace(p.id::text, '-', '')
    FROM due WHERE p.id = due.id;
  GET DIAGNOSTICS anonymized = ROW_COUNT;

  RETURN jsonb_build_object('purged_trips', purged_trips, 'anonymized_profiles', anonymized);
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_deletions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_deletions() TO service_role;

REVOKE ALL ON FUNCTION public.account_deletion_status(), public.request_account_deletion(), public.restore_account(),
  public.trip_active_applicant_count(uuid), public.delete_or_cancel_trip(uuid, text, text),
  public.my_deleted_trips(), public.restore_trip(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.account_deletion_status(), public.request_account_deletion(), public.restore_account(),
  public.trip_active_applicant_count(uuid), public.delete_or_cancel_trip(uuid, text, text),
  public.my_deleted_trips(), public.restore_trip(uuid) TO authenticated;
-- RLS-ben használt: minden szerepnek futtathatónak kell lennie (anonnál auth.uid() NULL → false).
GRANT EXECUTE ON FUNCTION public.has_trip_participation(uuid) TO anon, authenticated;

COMMIT;
