/**
 * Integration: trips/actions.ts publishTrip
 *
 * Coverage targets (TEST_CASES.md INT-trips-publishTrip):
 *   1. happy path — draft → published
 *   2. validation — missing required field returns i18n error key
 *   3. ownership — only organizer can publish
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

d('INT-trips-publishTrip', () => {
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

  it.todo('Test 1: happy path — status draft → published, published_at set');
  it.todo('Test 2: validation — missing cover_image_url returns "errors.coverRequired" key');
  it.todo('Test 3: ownership — userB calling publishTrip on userA trip → RLS denial');
  it.todo('Test 4: idempotency — re-publish same trip → ok, published_at NOT bumped');
});
