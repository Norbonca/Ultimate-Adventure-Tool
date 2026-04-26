/**
 * Integration: settings/actions.ts saveUserSkills
 *
 * Coverage targets (TEST_CASES.md INT-settings-saveUserSkills):
 *   1. insert new skills (user has none yet)
 *   2. update existing skill levels (UPSERT)
 *   3. full replacement (delta sync — old skills not in new payload are removed)
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

d('INT-settings-saveUserSkills', () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createTestUser('skills');
  });

  afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  beforeEach(async () => {
    await truncate(['user_skills']);
  });

  it.todo('Test 1: insert — N skills payload → DB has N rows, all with level field set');
  it.todo('Test 2: update — same sub_discipline_id with new level → 1 row, level updated');
  it.todo('Test 3: delta — payload omits previously-set skill → that row deleted');
  it.todo('Test 4: validation — level outside 1..5 → return error, no DB write');
});
