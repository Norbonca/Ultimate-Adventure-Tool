-- SEC-003..005: field-level access, participant transitions and atomic writes.
-- Apply before the matching application release. No rows are deleted.
BEGIN;

-- Public profile projection: RLS still determines which rows are visible.
-- Owners read private fields through get_my_profile; service_role retains access.
REVOKE SELECT ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, display_name, slug, first_name, last_name, avatar_url,
  avatar_source, bio, subscription_tier, reputation_points, reputation_level,
  verified_organizer, profile_visibility) ON public.profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT to_jsonb(p) FROM public.profiles p
  WHERE p.id = auth.uid() AND p.deleted_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Guard UPDATE and INSERT, including upserts. Auth triggers/service role can
-- maintain system fields; API clients cannot invent billing or trust state.
CREATE OR REPLACE FUNCTION public.guard_profile_system_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.subscription_tier::text <> 'free'
        OR NEW.subscription_expires_at IS NOT NULL OR NEW.stripe_customer_id IS NOT NULL
        OR NEW.reputation_points <> 0 OR NEW.reputation_level <> 1
        OR NEW.verified_organizer OR NEW.email_verified OR NEW.two_fa_enabled THEN
        RAISE EXCEPTION 'profile_system_fields_read_only' USING ERRCODE = '42501';
      END IF;
    ELSIF ROW(NEW.subscription_tier, NEW.subscription_expires_at, NEW.stripe_customer_id,
        NEW.reputation_points, NEW.reputation_level, NEW.verified_organizer,
        NEW.email_verified, NEW.two_fa_enabled)
      IS DISTINCT FROM ROW(OLD.subscription_tier, OLD.subscription_expires_at, OLD.stripe_customer_id,
        OLD.reputation_points, OLD.reputation_level, OLD.verified_organizer,
        OLD.email_verified, OLD.two_fa_enabled) THEN
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
DROP TRIGGER IF EXISTS guard_profile_system_fields ON public.profiles;
CREATE TRIGGER guard_profile_system_fields BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_system_fields();

-- One privacy source drives profile row visibility too.
CREATE OR REPLACE FUNCTION public.sync_profile_visibility()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.profiles SET profile_visibility = NEW.profile_visibility WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sync_profile_visibility ON public.user_privacy_settings;
CREATE TRIGGER sync_profile_visibility AFTER INSERT OR UPDATE OF profile_visibility
ON public.user_privacy_settings FOR EACH ROW EXECUTE FUNCTION public.sync_profile_visibility();
UPDATE public.profiles p SET profile_visibility = s.profile_visibility
FROM public.user_privacy_settings s WHERE s.user_id = p.id;

-- Only valid self-service transitions. The guard is SECURITY DEFINER to inspect
-- trips without recursive RLS; caller identity comes from verified JWT claims.
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
      OR (t.registration_deadline IS NOT NULL AND t.registration_deadline < now()) THEN
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
DROP TRIGGER IF EXISTS guard_participant_transition ON public.trip_participants;
CREATE TRIGGER guard_participant_transition BEFORE INSERT OR UPDATE ON public.trip_participants
FOR EACH ROW EXECUTE FUNCTION public.guard_participant_transition();

-- Atomic counter delta: UPDATE obtains a row lock and checks capacity against
-- the current row version. A failed reservation rolls the participant write back.
CREATE OR REPLACE FUNCTION public.update_trip_participant_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE old_count integer := 0; new_count integer := 0; target_id uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    old_count := CASE WHEN NOT OLD.is_staff_seat AND OLD.status::text IN
      ('approved','approved_pending_payment','participant') THEN 1 ELSE 0 END;
    target_id := OLD.trip_id;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    new_count := CASE WHEN NOT NEW.is_staff_seat AND NEW.status::text IN
      ('approved','approved_pending_payment','participant') THEN 1 ELSE 0 END;
    target_id := NEW.trip_id;
  END IF;
  IF new_count <> old_count THEN
    UPDATE public.trips SET current_participants = current_participants + new_count - old_count
    WHERE id = target_id AND (new_count < old_count OR current_participants < max_participants);
    IF NOT FOUND AND new_count > old_count THEN
      RAISE EXCEPTION 'trip_full' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
UPDATE public.trips t SET current_participants = (
  SELECT count(*) FROM public.trip_participants p WHERE p.trip_id = t.id
  AND NOT p.is_staff_seat AND p.status::text IN ('approved','approved_pending_payment','participant')
);

-- A single transaction replaces interests; bad category IDs roll back DELETE.
CREATE OR REPLACE FUNCTION public.replace_my_interests(category_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501'; END IF;
  IF category_ids IS NULL OR cardinality(category_ids) > 100 THEN
    RAISE EXCEPTION 'invalid_categories' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(category_ids) requested(id)
    WHERE requested.id IS NULL OR NOT EXISTS
      (SELECT 1 FROM public.categories c WHERE c.id = requested.id AND c.status = 'active')) THEN
    RAISE EXCEPTION 'invalid_categories' USING ERRCODE = '23514';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  DELETE FROM public.user_adventure_interests WHERE user_id = auth.uid();
  INSERT INTO public.user_adventure_interests(user_id, category_id)
    SELECT auth.uid(), id FROM (SELECT DISTINCT unnest(category_ids) AS id) s;
END;
$$;
REVOKE ALL ON FUNCTION public.replace_my_interests(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_my_interests(uuid[]) TO authenticated;
COMMIT;
