-- ============================================================================
-- 013 — Fix: Infinite recursion in RLS policy for "trips" table
-- ============================================================================
-- Problem: trips_select_participant queries trip_participants (RLS-enabled),
--          and participants_select_organizer queries trips (RLS-enabled),
--          causing infinite recursion.
-- Solution: Drop the recursive participant policy on trips.
--           MVP doesn't need it yet — organizer + public policies are sufficient.
--           Also fix participants_select_organizer to avoid cross-table RLS.
-- ============================================================================

BEGIN;

-- 1. Drop the recursive policy on trips
DROP POLICY IF EXISTS trips_select_participant ON trips;

-- 2. Replace participants_select_organizer with a non-recursive version
--    Using a SECURITY DEFINER function to bypass trips RLS
DROP POLICY IF EXISTS participants_select_organizer ON trip_participants;

-- Create helper function that bypasses RLS (SECURITY DEFINER runs as table owner)
CREATE OR REPLACE FUNCTION is_trip_organizer(p_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = p_trip_id
      AND t.organizer_id = auth.uid()
      AND t.deleted_at IS NULL
  );
$$;

-- Recreate participants_select_organizer using the helper function
CREATE POLICY participants_select_organizer ON trip_participants FOR SELECT
  USING (is_trip_organizer(trip_id));

-- 3. Fix participants_update_organizer similarly
DROP POLICY IF EXISTS participants_update_organizer ON trip_participants;
CREATE POLICY participants_update_organizer ON trip_participants FOR UPDATE
  USING (is_trip_organizer(trip_id));

-- 4. Fix other tables that reference trips via subquery (itinerary, pois, crew, templates)
--    These also have potential recursion but through different paths.
--    Use the same helper function.

DROP POLICY IF EXISTS itinerary_modify ON trip_itinerary_days;
CREATE POLICY itinerary_modify ON trip_itinerary_days FOR ALL
  USING (is_trip_organizer(trip_id))
  WITH CHECK (is_trip_organizer(trip_id));

DROP POLICY IF EXISTS pois_modify ON trip_pois;
CREATE POLICY pois_modify ON trip_pois FOR ALL
  USING (is_trip_organizer(trip_id))
  WITH CHECK (is_trip_organizer(trip_id));

DROP POLICY IF EXISTS crew_modify ON trip_crew_positions;
CREATE POLICY crew_modify ON trip_crew_positions FOR ALL
  USING (is_trip_organizer(trip_id))
  WITH CHECK (is_trip_organizer(trip_id));

DROP POLICY IF EXISTS templates_modify_own ON trip_templates;
CREATE POLICY templates_modify_own ON trip_templates FOR ALL
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

COMMIT;
