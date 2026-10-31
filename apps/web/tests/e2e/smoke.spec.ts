import { test, expect } from '@playwright/test';
import { AppHeaderPage } from './pom/AppHeaderPage';

/**
 * Smoke tests — must pass before any other E2E suite runs.
 * Cover the absolute basics: the page loads, the header is rendered with the
 * expected anonymous-user state, and the language toggle works.
 */
test.describe('FLOW-CORE — smoke', () => {
  test('FLOW-CORE-8: anonymous landing — Login + Register CTAs visible in AppHeader', async ({ page }) => {
    await page.goto('/');
    const header = new AppHeaderPage(page);
    await header.expectAnonymous();
    // The Trevu home link is the canonical landmark for "this is the AppHeader".
    await expect(header.logo).toBeVisible();
  });

  test('FLOW-CORE-8b: AppHeader logo dropdown reveals "Kezdés" / "Get Started" link', async ({ page }) => {
    await page.goto('/');
    // The "Get Started" link lives inside the BAL-zona dropdown (logo button).
    // Open the dropdown by clicking the logo icon button.
    const logoButton = page.getByRole('button', {
      name: /navigációs menü|navigation menu/i,
    });
    await logoButton.click();
    await expect(
      page.getByRole('link', { name: /kezdés|get\s*started/i }),
    ).toBeVisible();
  });

  test('FLOW-CORE-6: language switch HU → EN → HU', async ({ page, locale }) => {
    await page.goto('/');
    const header = new AppHeaderPage(page);

    // A fresh context bootstraps its language from the configured browser locale.
    await expect(page.locator('html')).toHaveAttribute('lang', locale?.startsWith('en') ? 'en' : 'hu');
    await header.switchLocale('hu');
    await expect(page.locator('html')).toHaveAttribute('lang', 'hu');

    await header.switchLocale('en');
    await expect(page.locator('html')).toHaveAttribute('lang', /en/i);

    await header.switchLocale('hu');
    await expect(page.locator('html')).toHaveAttribute('lang', /hu/i);
  });
});
