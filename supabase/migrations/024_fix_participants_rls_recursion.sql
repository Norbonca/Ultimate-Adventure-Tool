-- ============================================================================
-- 024 — Fix: RLS recursion in trip_participants.participants_select_fellow
-- ============================================================================
-- Problem: participants_select_fellow policy queries trip_participants from
--          within a trip_participants policy → infinite recursion.
--          Triggered by applyToTrip server action's pre-insert existence check
--          (SELECT FROM trip_participants WHERE trip_id=? AND user_id=?).
-- Solution: Use is_trip_participant(trip_id) SECURITY DEFINER helper from
--           migration 022 — bypasses RLS on the inner query.
-- Note: Migration 013 already fixed the organizer/update variants; this is the
--       remaining self-referential SELECT policy from migration 002 line 511.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS participants_select_fellow ON trip_participants;

CREATE POLICY participants_select_fellow ON trip_participants FOR SELECT
  USING (is_trip_participant(trip_id));

COMMIT;
