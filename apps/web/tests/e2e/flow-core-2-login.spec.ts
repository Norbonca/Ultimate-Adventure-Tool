import { test, expect } from '@playwright/test';
import { AppHeaderPage } from './pom/AppHeaderPage';
import { createTestUser, deleteTestUser } from './_setup/seed';

/**
 * FLOW-CORE-2 — Login → dashboard → my trips
 *
 * Severity: 🔴 release-blocker (M01).
 *
 * Steps:
 *   1. /login → email + password
 *   2. Submit → redirect /dashboard
 *   3. AppHeader avatar visible
 *   4. "Túráim" anchor → /dashboard/trips
 */

test.describe('FLOW-CORE-2 — Login', () => {
  let userId: string | null = null;

  test.beforeEach(async () => {
    const u = await createTestUser('login');
    userId = u.id;
    // Note: createTestUser returns the credentials but each test must use them
  });

  test.afterEach(async () => {
    if (userId) await deleteTestUser(userId);
    userId = null;
  });

  test('happy path — login redirects to /dashboard', async ({ page }) => {
    test.fixme(true, 'Form selectors + cookie session — needs createTestUser with returned email/password');
    await page.goto('/login');
    // TODO: fill email/password from createTestUser fixture
    // TODO: submit, expect URL /dashboard
    // TODO: AppHeaderPage.expectLogged(displayName)
  });

  test('invalid credentials show toast', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('not-a-user@trevu.local');
    await page.getByLabel(/password|jelszó/i).fill('wrong-password');
    await page.getByRole('button', { name: /log in|belépés/i }).click();
    // accept either toast or inline error
    await expect(page.getByText(/invalid|érvénytelen|hibás/i)).toBeVisible({ timeout: 5000 });
  });

  test('empty form shows validation', async ({ page }) => {
    test.fixme(true, 'HTML5 required attribute — needs explicit assertion strategy');
  });
});
