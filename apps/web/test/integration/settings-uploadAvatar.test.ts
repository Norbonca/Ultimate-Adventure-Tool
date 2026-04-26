/**
 * Integration: settings/actions.ts uploadAvatar
 *
 * Coverage targets (TEST_CASES.md INT-settings-uploadAvatar):
 *   1. happy path — valid jpg ≤2MB → storage + profiles.avatar_url set
 *   2. file size limit — >2MB → "avatar.tooLarge"
 *   3. file type validation — non-image → "avatar.invalidType"
 *
 * Gating: INTEGRATION=1.
 */

import { describe, it, beforeAll, afterAll } from 'vitest';
import {
  INTEGRATION_ENABLED,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from './_setup';

const d = INTEGRATION_ENABLED ? describe : describe.skip;

d('INT-settings-uploadAvatar', () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createTestUser('avatar');
  });

  afterAll(async () => {
    if (user) await deleteTestUser(user.id);
  });

  it.todo('Test 1: happy path — 100KB jpg → storage path avatars/{user.id}/avatar.jpg, profiles.avatar_url set');
  it.todo('Test 2: oversized file → return { error: "avatar.tooLarge" }, no storage write');
  it.todo('Test 3: text/plain mimetype → return { error: "avatar.invalidType" }');
  it.todo('Test 4: idempotency — re-upload replaces old file (single avatar per user)');
});
