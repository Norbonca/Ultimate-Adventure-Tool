/**
 * Integration: trips/actions.ts saveDraft
 *
 * Coverage targets (TEST_CASES.md INT-trips-saveDraft):
 *   1. INSERT new draft (no existingTripId)
 *   2. UPDATE existing draft (with existingTripId)
 *   3. RLS — non-organizer cannot update
 *   4. Status preservation — published trip stays published on resave
 *
 * Gating: INTEGRATION=1 env var; otherwise these tests are skipped.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  INTEGRATION_ENABLED,
  admin,
  createTestUser,
  deleteTestUser,
  createTestTrip,
  truncate,
  type TestUser,
} from './_setup';

const d = INTEGRATION_ENABLED ? describe : describe.skip;

d('INT-trips-saveDraft', () => {
  let owner: TestUser;
  let other: TestUser;

  beforeAll(async () => {
    owner = await createTestUser('owner');
    other = await createTestUser('other');
  });

  afterAll(async () => {
    if (owner) await deleteTestUser(owner.id);
    if (other) await deleteTestUser(other.id);
  });

  beforeEach(async () => {
    await truncate(['trips']);
  });

  it.todo('Test 1: INSERT new draft — saveDraft returns tripId, status=draft');

  it.todo('Test 2: UPDATE existing draft — same row, updated_at changes, slug NOT changed');

  it.todo('Test 3: ownership — non-organizer userB cannot update owner-A trip');

  it.todo('Test 4: status preservation — saveDraft on published trip keeps status=published');

  // Lightweight smoke test that the fixture works
  it('fixture: createTestUser + createTestTrip work', async () => {
    const trip = await createTestTrip(owner.id);
    expect(trip.organizer_id).toBe(owner.id);
    expect(trip.status).toBe('draft');

    const { data: refetched } = await admin()
      .from('trips')
      .select('id, organizer_id, status')
      .eq('id', trip.id)
      .single();
    expect(refetched?.id).toBe(trip.id);
  });
});
