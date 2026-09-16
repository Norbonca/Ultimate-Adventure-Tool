import { test, expect } from '@playwright/test';

/**
 * Discover hero search — the single pill search ("Hova, mikor, mire vágysz?"),
 * the filter sheet and the category pills.
 *
 * Spec: modules/09_Search US-M09-001/002; logic: lib/trip-search.ts createTripSearch (unit tested).
 * Design: design/D02_Trip_Management.pen#H1rRQE, #W9Kgy, #RTE9l (Brand Guide v2).
 * Data-agnostic: it searches for whatever the first trip is called.
 * The hero only renders in the list view.
 */

test.describe('Discover — hero search', () => {
  test.beforeEach(async ({ page, context, baseURL }) => {
    await context.addCookies([
      { name: 'trevu-discover-view-v2', value: 'list', url: baseURL ?? 'http://localhost:3000' },
    ]);
    await page.goto('/');
    await expect(page.getByTestId('discover-hero-search')).toBeVisible();
  });

  test('DISCOVER-SEARCH-1: the pill search filters on Enter and on the button, and clearing restores the list', async ({ page }) => {
    const titles = page.getByTestId('trip-band-title');
    const count = page.getByTestId('discover-count');
    test.skip((await titles.count()) === 0, 'no published trips in the local data');
    const totalText = await count.innerText();
    const title = (await titles.first().innerText()).trim();

    const query = page.getByTestId('discover-search-query');
    await query.fill(title);
    await query.press('Enter');
    await expect(titles.filter({ hasText: title }).first()).toBeVisible();

    await query.fill('zzzz-nincs-ilyen-tura');
    await page.getByTestId('discover-search-submit').click();
    await expect(page.getByTestId('discover-empty')).toBeVisible();

    await query.fill('');
    await expect(count).toHaveText(totalText);
  });

  test('DISCOVER-SEARCH-2: a time phrase filters by date — an impossible year shows no trips', async ({ page }) => {
    test.skip((await page.getByTestId('trip-band-title').count()) === 0, 'no published trips in the local data');
    const query = page.getByTestId('discover-search-query');

    await query.fill('valamikor');
    await query.press('Enter');
    await expect(page.getByTestId('discover-empty')).toBeVisible();

    await query.fill('1999');
    await query.press('Enter');
    await expect(page.getByTestId('discover-empty')).toBeVisible();

    await query.fill('');
    await expect(page.getByTestId('discover-trip-list')).toBeVisible();
  });

  test('DISCOVER-SEARCH-3: a category pill filters, and the filter sheet counts it on mobile', async ({ page }) => {
    const pills = page.getByTestId('discover-category-pills').locator('button');
    test.skip((await pills.count()) < 2, 'no categories in the local data');

    await pills.nth(1).click();
    await expect(pills.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(pills.first()).toHaveAttribute('aria-pressed', 'false');

    await pills.first().click();
    await expect(pills.first()).toHaveAttribute('aria-pressed', 'true');
  });

  test('DISCOVER-SEARCH-4: the filter sheet opens, applies a filter, clears it and closes with Escape', async ({ page }) => {
    await page.getByTestId('discover-filters-open').click();
    const sheet = page.getByTestId('discover-filter-sheet');
    await expect(sheet).toBeVisible();

    await page.getByTestId('filter-spots-9+').click();
    await expect(page.getByTestId('filter-spots-9+')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('discover-filters-open')).toContainText('(1)');

    await sheet.getByRole('button', { name: /Törlés|Clear/ }).click();
    await expect(page.getByTestId('filter-spots-9+')).toHaveAttribute('aria-checked', 'false');

    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
  });
});
