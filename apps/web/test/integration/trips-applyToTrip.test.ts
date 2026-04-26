/**
 * Integration: trips/actions.ts applyToTrip
 *
 * Coverage targets (TEST_CASES.md INT-trips-applyToTrip):
 *   1. open trip (require_approval=false) → confirmed + counter++
 *   2. approval-required → pending, counter NOT incremented
 *   3. full trip → trips.full error
 *   4. organizer cannot self-join → trips.cannotSelfJoin
 *   5. idempotency — re-apply same user → no duplicate, counter NOT double-incremented
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

d('INT-trips-applyToTrip', () => {
  let organizer: TestUser;
  let participant: TestUser;

  beforeAll(async () => {
    organizer = await createTestUser('org');
    participant = await createTestUser('part');
  });

  afterAll(async () => {
    if (organizer) await deleteTestUser(organizer.id);
    if (participant) await deleteTestUser(participant.id);
  });

  beforeEach(async () => {
    await truncate(['participants', 'trips']);
  });

  it.todo('Test 1: open trip → participants.status=confirmed, current_participants += 1');
  it.todo('Test 2: approval-required → status=pending, counter NOT incremented');
  it.todo('Test 3: full trip → return { error: "trips.full" }, no participant rekord');
  it.todo('Test 4: organizer self-join → return { error: "trips.cannotSelfJoin" }');
  it.todo('Test 5: idempotency — re-apply by same user → no duplicate, counter unchanged');
});
