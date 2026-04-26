import { test, expect } from '@playwright/test';
import { AppHeaderPage } from './pom/AppHeaderPage';
import { createTestUser, deleteTestUser } from './_setup/seed';

/**
 * FLOW-CORE-1 — Signup → email confirm → profile completion
 *
 * Severity: 🔴 release-blocker (M01 User Management).
 *
 * Steps (per TEST_CASES.md):
 *   1. /get-started → "Regisztráció" CTA
 *   2. /register form: email, password, displayName
 *   3. "Check your email" üzenet
 *   4. Inbucket-ből confirm link megnyit
 *   5. Profil completion: locale, country
 *   6. Redirect /dashboard
 *
 * Acceptance:
 *   - AppHeader avatar = displayName monogram
 *   - DB: auth.users + profiles rekordok
 *   - HU + EN locale-ban is fut
 */

test.describe('FLOW-CORE-1 — Signup', () => {
  test.fixme(true, 'Inbucket integration + form fields nem implementáltak — backlog');

  test('happy path — register → email confirm → /dashboard', async ({ page }) => {
    await page.goto('/get-started');
    await page.getByRole('link', { name: /regisztráció|sign up/i }).click();
    // TODO: form kitöltés, submit, "check email" üzenet
    // TODO: Inbucket polling for confirm link
    // TODO: profile completion
    // TODO: assert avatar + URL = /dashboard
  });

  test('rejects duplicate email', async ({ page }) => {
    test.fixme(true, 'Existing user fixture + duplicate-email error path');
  });

  test('rejects weak password', async ({ page }) => {
    test.fixme(true, 'Password < 8 char → t("auth.passwordTooShort")');
  });
});
