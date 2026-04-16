-- ============================================================================
-- 022 — Fix: RLS recursion in M021 timeline tables
-- ============================================================================
-- Problem: trip_phases/milestones/tasks RLS policies reference trip_participants
--          which has its own RLS → infinite recursion (same as 013 fix for trips)
-- Solution: Use is_trip_organizer() SECURITY DEFINER function (from 013)
--           and is_trip_participant() for participant access
-- ============================================================================

-- Helper: participant check (SECURITY DEFINER, bypasses RLS)
CREATE OR REPLACE FUNCTION is_trip_participant(p_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_participants tp
    WHERE tp.trip_id = p_trip_id
      AND tp.user_id = auth.uid()
      AND tp.status IN ('approved', 'approved_pending_payment', 'participant')
  );
$$;

-- ═══════════════════════════════════════════════════════════
-- trip_phases
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS trip_phases_select ON trip_phases;
DROP POLICY IF EXISTS trip_phases_manage ON trip_phases;

CREATE POLICY trip_phases_organizer ON trip_phases FOR ALL
  USING (is_trip_organizer(trip_id));

CREATE POLICY trip_phases_participant ON trip_phases FOR SELECT
  USING (is_trip_participant(trip_id));

-- ═══════════════════════════════════════════════════════════
-- trip_milestones
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS trip_milestones_select ON trip_milestones;
DROP POLICY IF EXISTS trip_milestones_manage ON trip_milestones;

CREATE POLICY trip_milestones_organizer ON trip_milestones FOR ALL
  USING (is_trip_organizer(trip_id));

CREATE POLICY trip_milestones_participant ON trip_milestones FOR SELECT
  USING (is_trip_participant(trip_id));

-- ═══════════════════════════════════════════════════════════
-- trip_milestone_assignees
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS milestone_assignees_select ON trip_milestone_assignees;
DROP POLICY IF EXISTS milestone_assignees_manage ON trip_milestone_assignees;

CREATE POLICY milestone_assignees_organizer ON trip_milestone_assignees FOR ALL
  USING (
    milestone_id IN (
      SELECT id FROM trip_milestones WHERE is_trip_organizer(trip_id)
    )
  );

CREATE POLICY milestone_assignees_read ON trip_milestone_assignees FOR SELECT
  USING (
    milestone_id IN (
      SELECT id FROM trip_milestones WHERE is_trip_participant(trip_id)
    )
  );

-- ═══════════════════════════════════════════════════════════
-- trip_tasks
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS trip_tasks_select ON trip_tasks;
DROP POLICY IF EXISTS trip_tasks_manage ON trip_tasks;
DROP POLICY IF EXISTS trip_tasks_complete ON trip_tasks;

CREATE POLICY trip_tasks_organizer ON trip_tasks FOR ALL
  USING (is_trip_organizer(trip_id));

CREATE POLICY trip_tasks_participant_read ON trip_tasks FOR SELECT
  USING (is_trip_participant(trip_id));

CREATE POLICY trip_tasks_assignee_update ON trip_tasks FOR UPDATE
  USING (
    assignee_id = auth.uid()
    OR id IN (
      SELECT ta.task_id FROM trip_task_assignees ta WHERE ta.user_id = auth.uid()
    )
    OR milestone_id IN (
      SELECT ma.milestone_id FROM trip_milestone_assignees ma WHERE ma.user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════
-- trip_task_assignees
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS task_assignees_select ON trip_task_assignees;
DROP POLICY IF EXISTS task_assignees_manage ON trip_task_assignees;

CREATE POLICY task_assignees_organizer ON trip_task_assignees FOR ALL
  USING (
    task_id IN (
      SELECT id FROM trip_tasks WHERE is_trip_organizer(trip_id)
    )
  );

CREATE POLICY task_assignees_read ON trip_task_assignees FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM trip_tasks WHERE is_trip_participant(trip_id)
    )
  );
