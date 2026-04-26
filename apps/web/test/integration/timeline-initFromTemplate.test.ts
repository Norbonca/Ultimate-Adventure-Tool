/**
 * Integration: trips/timeline-actions.ts initTimelineFromTemplate (M021)
 *
 * Coverage targets (TEST_CASES.md INT-timeline-initFromTemplate):
 *   1. organizer init — phases/milestones/tasks generated from template
 *   2. re-init prevention — already-initialized trip returns error
 *
 * Gating: INTEGRATION=1.
 */

import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  INTEGRATION_ENABLED,
  createTestUser,
  deleteTestUser,
  truncate,
  type TestUser,
} from './_setup';

const d = INTEGRATION_ENABLED ? describe : describe.skip;

d('INT-timeline-initFromTemplate', () => {
  let organizer: TestUser;

  beforeAll(async () => {
    organizer = await createTestUser('timeline');
  });

  afterAll(async () => {
    if (organizer) await deleteTestUser(organizer.id);
  });

  beforeEach(async () => {
    await truncate(['trip_tasks', 'trip_milestones', 'trip_phases', 'trips']);
  });

  it.todo('Test 1: init from "hiking-template-uuid" → N phases, M milestones, T auto-tasks');
  it.todo('Test 2: re-init on already-initialized trip → return { error: "timeline.alreadyInitialized" }');
  it.todo('Test 3: ref_phase_templates exists → phases inherit ref order_index');
});
