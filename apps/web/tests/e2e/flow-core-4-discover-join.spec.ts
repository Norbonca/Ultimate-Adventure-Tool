import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser } from './_setup/seed';

/**
 * FLOW-CORE-4 — Discover → filter → trip detail → join
 *
 * Severity: 🔴 release-blocker (M02 + M09 Search).
 *
 * Steps:
 *   1. / Discover oldal
 *   2. Szűrő: kategória + nehézség
 *   3. Trip-card click → /trips/{slug}
 *   4. "Csatlakozom" gomb → resztvevő státusz
 *
 * Acceptance:
 *   - Filter csak matching trip-eket mutat
 *   - DB participants UPSERT, status=confirmed (open trip)
 *   - current_participants += 1
 *   - Notification trigger (M07 — out of E2E scope)
 */

test.describe('FLOW-CORE-4 — Discover → join', () => {
  test('anonymous can browse but join requires login', async ({ page }) => {
    await page.goto('/');
    // TODO: filter by category=hiking
    // TODO: click first trip card
    // TODO: expect "Csatlakozom" button → "Belépés a csatlakozáshoz" CTA
    test.fixme(true, 'Need seeded published trips fixture');
  });

  test('authed user can join open trip', async ({ page }) => {
    test.fixme(true, 'Authed fixture + open trip seed');
    // TODO: storage state with logged-in user
    // TODO: navigate / → first trip → "Csatlakozom"
    // TODO: expect button toggle to "Csatlakozva"
    // TODO: assert via admin client: participants.status='confirmed'
  });

  test('approval-required trip → pending status', async ({ page }) => {
    test.fixme(true, 'Seed trip with require_approval=true');
  });

  test('full trip blocks join', async ({ page }) => {
    test.fixme(true, 'Seed trip at max_participants — UI shows "Megtelt" disabled state');
  });

  test('organizer cannot self-join', async ({ page }) => {
    test.fixme(true, 'Authed as organizer of a trip → join button hidden / disabled');
  });
});
