import { test, expect } from '@playwright/test';

/**
 * Discover hero search — "Hova?", "Mikor?", activity type, search button.
 *
 * Spec: modules/09_Search US-M09-001/002; logic: lib/trip-search.ts (unit tested).
 * Data-agnostic: it searches for whatever the first card is called.
 * The hero only renders in the grid and list views.
 */

test.describe('Discover — hero search', () => {
  test.beforeEach(async ({ page, context, baseURL }) => {
    await context.addCookies([
      { name: 'trevu-discover-view', value: 'grid', url: baseURL ?? 'http://localhost:3000' },
    ]);
    await page.goto('/');
    await expect(page.getByTestId('discover-hero-search')).toBeVisible();
  });

  test('DISCOVER-SEARCH-1: "Hova?" filters on Enter and on the button, and clearing restores the list', async ({ page }) => {
    const cards = page.locator('.trips-grid .trip-card-title');
    const total = await cards.count();
    test.skip(total === 0, 'no published trips in the local data');
    const title = (await cards.first().innerText()).trim();

    const where = page.getByTestId('discover-search-where');
    await where.fill(title);
    await where.press('Enter');
    await expect(cards.filter({ hasText: title }).first()).toBeVisible();
    expect(await cards.count()).toBeLessThanOrEqual(total);

    await where.fill('zzzz-nincs-ilyen-tura');
    await page.getByTestId('discover-search-submit').click();
    await expect(page.locator('.trips-grid')).toHaveCount(0);

    await where.fill('');
    await expect(cards).toHaveCount(total);
  });

  test('DISCOVER-SEARCH-2: "Mikor?" with unrecognisable text shows no trips, a year keeps only trips touching it', async ({ page }) => {
    const cards = page.locator('.trips-grid .trip-card-title');
    const total = await cards.count();
    test.skip(total === 0, 'no published trips in the local data');

    const when = page.getByTestId('discover-search-when');
    await when.fill('valamikor');
    await when.press('Enter');
    await expect(page.locator('.trips-grid')).toHaveCount(0);

    await when.fill('1999');
    await when.press('Enter');
    await expect(page.locator('.trips-grid')).toHaveCount(0);

    await when.fill('');
    await expect(cards).toHaveCount(total);
  });

  test('DISCOVER-SEARCH-3: the activity type select and the category pills share one state', async ({ page }) => {
    const select = page.getByTestId('discover-search-category');
    const options = select.locator('option');
    test.skip((await options.count()) < 2, 'no categories in the local data');

    const value = await options.nth(1).getAttribute('value');
    const label = (await options.nth(1).innerText()).trim();
    await select.selectOption(value!);

    await expect(page.locator('#categories .pill-active')).toContainText(label);
    await page.locator('#categories .pill').first().click();
    await expect(select).toHaveValue('');
  });
});
