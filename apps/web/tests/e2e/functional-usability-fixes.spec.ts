import { test, expect, devices } from '@playwright/test';
import { admin, createTestUser, deleteTestUser } from './_setup/seed';

async function seedTrips(ownerId: string, prefix: string) {
  const { data: category, error } = await admin.from('categories').select('id').eq('status', 'active').limit(1).single();
  if (error) throw error;
  const rows = [
    { suffix: 'EUR-one', price: 100, currency: 'EUR', end: '2027-08-01' },
    { suffix: 'HUF-two', price: 100, currency: 'HUF', end: '2027-08-02' },
    { suffix: 'EUR-two', price: 25, currency: 'EUR', end: '2027-08-02' },
  ].map(({ suffix, price, currency, end }) => ({
    organizer_id: ownerId, title: `${prefix} ${suffix}`, slug: `${prefix}-${suffix}`.toLowerCase(),
    description: 'Local functional regression fixture', category_id: category.id,
    difficulty: 1, location_country: 'HU', location_city: 'Budapest', max_participants: 8,
    status: 'published', visibility: 'public', show_on_landing: true,
    cover_image_url: 'http://localhost:3001/discover/hero.jpg',
    start_date: '2027-08-01', end_date: end, price_amount: price, price_currency: currency,
  }));
  const inserted = await admin.from('trips').insert(rows);
  if (inserted.error) throw inserted.error;
  return rows;
}

for (const mode of ['desktop', 'mobile'] as const) {
  test(`F07/F17: ${mode} settings and manage fit the viewport and controls work`, async ({ browser, baseURL }) => {
    test.setTimeout(90_000);
    const user = await createTestUser('fix-layout');
    const context = await browser.newContext({
      ...(mode === 'mobile' ? devices['iPhone 14'] : devices['Desktop Chrome']),
      locale: 'hu-HU', baseURL,
    });
    try {
      const trips = await seedTrips(user.id, `Layout${Date.now()}`);
      const page = await context.newPage();
      await page.goto('/login');
      await page.locator('#email').fill(user.email);
      await page.locator('#password').fill(user.password);
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/\/dashboard/);
      await page.goto('/settings/privacy');
      await expect(page.getByRole('button', { name: /fiók törlése|delete account/i })).toBeVisible();
      const viewport = page.viewportSize()!.width;
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport);
      await page.getByRole('button', { name: /fiók törlése|delete account/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await page.goto(`/trips/${trips[0].slug}/manage`);
      await expect(page.getByRole('heading', { name: trips[0].title })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport);
      await page.getByRole('button', { name: /link megosztása|share link/i }).click();
      await expect(page.getByRole('status')).toBeVisible();
    } finally {
      await context.close();
      await deleteTestUser(user.id);
    }
  });
}

test('F12/F13: inclusive duration and currency-safe filtering and sorting', async ({ page, isMobile }) => {
  const user = await createTestUser('fix-discover');
  const prefix = `Filter${Date.now()}`;
  try {
    await seedTrips(user.id, prefix);
    await page.goto('/');
    await page.getByTestId('view-toggle-list').click();
    await page.getByTestId('discover-search-query').fill(prefix);
    await page.getByTestId('discover-search-submit').click();
    const titles = page.getByTestId('trip-band-title');
    await expect(titles).toHaveCount(3);
    await page.getByTestId('discover-filters-open').click();
    await page.getByTestId('filter-duration-1').click();
    await page.getByTestId('discover-filter-sheet-apply').click();
    await expect(titles).toHaveText([`${prefix} EUR-one`]);
    await page.getByTestId('discover-filters-open').click();
    await page.getByTestId('filter-duration-1').click();
    await page.getByTestId('filter-price-50-200').click();
    await page.getByTestId('discover-filter-sheet-apply').click();
    await expect(titles).toHaveText([`${prefix} EUR-one`]);
    await page.getByTestId('discover-filters-open').click();
    await page.getByTestId('filter-currency').selectOption('HUF');
    await page.getByTestId('discover-filter-sheet-apply').click();
    await expect(titles).toHaveText([`${prefix} HUF-two`]);
    await page.getByTestId('discover-filters-open').click();
    await page.getByTestId('discover-filter-sheet').getByRole('button', { name: /Törlés|Clear/ }).click();
    await page.getByTestId('discover-filter-sheet-apply').click();
    if (isMobile) {
      await page.getByTestId('discover-filters-open').click();
      await page.getByTestId('sort-price-low').click();
      await page.getByTestId('discover-filter-sheet-apply').click();
    } else {
      await page.getByTestId('discover-sort').selectOption('price-low');
    }
    await expect(titles).toHaveText([`${prefix} EUR-two`, `${prefix} EUR-one`]);
    await expect(page.getByTestId('discover-currency-notice')).toContainText('EUR');
  } finally { await deleteTestUser(user.id); }
});

test('F18: invalid credentials use the selected language', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#email').fill('no-such-fix-account@trevu.local');
  await page.locator('#password').fill('wrong-password');
  await page.locator('button[type="submit"]').click();
  const locale = await page.locator('html').getAttribute('lang');
  await expect(page.locator('main').getByRole('alert')).toHaveText(locale === 'hu' ? 'Hibás email-cím vagy jelszó.' : 'Invalid email or password.');
});


test('F18: duplicate registration uses the selected language', async ({ page }) => {
  const user = await createTestUser('fix-duplicate');
  try {
    await page.goto('/register');
    await page.locator('#firstName').fill('Regression');
    await page.locator('#lastName').fill('Duplicate');
    await page.locator('#email').fill(user.email);
    await page.locator('#password').fill(user.password);
    await page.locator('#terms').check();
    await page.locator('button[type="submit"]').click();
    const locale = await page.locator('html').getAttribute('lang');
    await expect(page.locator('main').getByRole('alert')).toHaveText(locale === 'hu'
      ? 'Ezzel az email-címmel már regisztráltak. Jelentkezz be.'
      : 'An account with this email already exists. Please log in.');
  } finally { await deleteTestUser(user.id); }
});
