import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser } from './_setup/seed';

/**
 * FLOW-CORE-3 — Trip wizard publish
 *
 * Severity: 🔴 release-blocker (M02 Trip Management).
 *
 * Steps:
 *   1. /dashboard → "Új túra" CTA
 *   2. Wizard 5 steps: title/cat → date/location → params → desc/price → preview
 *   3. "Publikálás" → redirect /trips/{slug}
 *   4. Anonymous tab → public detail visible
 *
 * Acceptance:
 *   - DB trips.status = 'published'
 *   - Slug is kebab-case ≤ 80 char
 *   - Auto-save (saveDraft) every 2s on input
 */

test.describe('FLOW-CORE-3 — Trip wizard publish', () => {
  let userId: string | null = null;

  test.beforeEach(async () => {
    const u = await createTestUser('wizard');
    userId = u.id;
  });

  test.afterEach(async () => {
    if (userId) await deleteTestUser(userId);
    userId = null;
  });

  test('happy path — 5-step wizard publishes a draft', async ({ page }) => {
    test.fixme(true, 'Authed page fixture (storage state) + 5-step navigation — needs auth helper');
    // TODO: login programmatically (set storage state)
    // TODO: /dashboard → "Új túra" click
    // TODO: Step 1: title="Test Túra", category="hiking"
    // TODO: Step 2: dates, location HU/Budapest
    // TODO: Step 3: dynamic params
    // TODO: Step 4: description, max_participants=8
    // TODO: Step 5: preview, "Publikálás"
    // TODO: expect URL /trips/<slug>
    // TODO: expect anonymous tab can see the trip
  });

  test('autosave preserves data when navigating between steps', async ({ page }) => {
    test.fixme(true, 'Autosave 2s debounce + step back/forward');
  });

  test('cannot publish without required fields', async ({ page }) => {
    test.fixme(true, 'Validation errors on Step 5 if title/cat missing');
  });
});
