-- F03: an organizer-removed guest may apply again, under the same approval,
-- deadline and capacity rules as a cancelled guest. The application action clears
-- previous organizer/check-in metadata; direct API callers must do the same.
-- Existing removed records retain their history until a new application occurs.
-- No historical backfill: rewriting those records would erase the removal reason.
BEGIN;

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
      OR NEW.paid_at IS NOT NULL OR NEW.rejection_reason IS NOT NULL OR NEW.skill_match IS NOT NULL
      OR NEW.staff_role_label IS NOT NULL OR NEW.removed_at IS NOT NULL OR NEW.removal_message IS NOT NULL THEN
      RAISE EXCEPTION 'participant_fields_forbidden' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.status::text = 'cancelled'
      AND OLD.status::text IN ('pending','approved','approved_pending_payment','waitlisted') THEN
      NEW.approved_at := OLD.approved_at;
      RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.status::text NOT IN ('cancelled','removed') THEN
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
