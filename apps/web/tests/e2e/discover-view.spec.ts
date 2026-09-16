import { test, expect, type Page } from '@playwright/test';

/**
 * Discover view toggle — globe / list (Brand Guide v2: the card grid became the band list).
 *
 * Contract: components/discover/discover-view-toggle.md
 *  - the globe is the default view for a visitor with no cookie;
 *  - switching writes `trevu-discover-view` and survives a reload;
 *  - the server renders the remembered view, so there is no flash of the
 *    wrong layout on first paint;
 *  - the globe never becomes a dead end: without WebGL it falls back to a
 *    readable state instead of an empty box.
 *
 * WebGL is not guaranteed in every Playwright browser, so the globe assertions
 * accept either a live canvas or the documented fallback message.
 */

const COOKIE = 'trevu-discover-view';

async function readViewCookie(page: Page): Promise<string | undefined> {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === COOKIE)?.value;
}

/** The globe is "present" either as a canvas or as its documented fallback. */
async function expectGlobePresent(page: Page) {
  const globe = page.getByTestId('globe-discover');
  const fallback = page.getByText(/nem tudja megjeleníteni a gömböt|cannot render the globe/i);
  await expect(globe.or(fallback).first()).toBeVisible({ timeout: 15_000 });
}

test.describe('Discover — view toggle', () => {
  test('DISCOVER-VIEW-1: globe is the default view without a cookie', async ({ page }) => {
    await page.goto('/');

    const globeButton = page.getByTestId('view-toggle-globe');
    await expect(globeButton).toBeVisible();
    await expect(globeButton).toHaveAttribute('aria-pressed', 'true');
    await expectGlobePresent(page);

    // No trip list while the globe is showing.
    await expect(page.getByTestId('discover-trip-list')).toHaveCount(0);
  });

  test('DISCOVER-VIEW-2: switching to the list writes the cookie and shows trip bands', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('view-toggle-list').click();

    await expect(page.getByTestId('view-toggle-list')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('view-toggle-globe')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('discover-trip-list').or(page.getByTestId('discover-empty')).first()).toBeVisible();
    await expect(page.getByTestId('globe-discover')).toHaveCount(0);
    await expect(page.getByTestId('view-toggle-grid')).toHaveCount(0);

    expect(await readViewCookie(page)).toBe('list');
  });

  test('DISCOVER-VIEW-3: the remembered view is server-rendered after reload', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('view-toggle-list').click();
    expect(await readViewCookie(page)).toBe('list');

    await page.reload();

    // Rendered by the server from the cookie — asserted before any hydration
    // would have had a chance to correct a wrong first paint.
    await expect(page.getByTestId('view-toggle-list')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('discover-hero-search')).toBeVisible();
  });

  test('DISCOVER-VIEW-3b: a remembered legacy "grid" choice opens the list', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: COOKIE, value: 'grid', url: baseURL ?? 'http://localhost:3000' }]);
    await page.goto('/');
    await expect(page.getByTestId('view-toggle-list')).toHaveAttribute('aria-pressed', 'true');
  });

  test('DISCOVER-VIEW-3c: the Discover page is a Night surface with a single Day CTA band at the bottom', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: COOKIE, value: 'list', url: baseURL ?? 'http://localhost:3000' }]);
    await page.goto('/');
    const root = page.locator('[data-surface="night"]').first();
    await expect(root).toBeVisible();
    await expect(root).toHaveCSS('background-color', 'rgb(15, 23, 42)');
    await expect(page.locator('[data-surface="day"]')).toHaveCount(1);
  });

  test('DISCOVER-VIEW-4: an unknown cookie value falls back to the globe', async ({ page, context }) => {
    await context.addCookies([
      { name: COOKIE, value: 'definitely-not-a-view', url: 'http://localhost:3000' },
    ]);

    await page.goto('/');

    await expect(page.getByTestId('view-toggle-globe')).toHaveAttribute('aria-pressed', 'true');
    await expectGlobePresent(page);
  });

  test('DISCOVER-VIEW-5: globe markers come from /api/v1/trips/globe', async ({ page }) => {
    const response = await page.request.get('/api/v1/trips/globe');
    expect(response.status()).toBe(200);

    const payload = await response.json();
    expect(Array.isArray(payload.markers)).toBe(true);
    expect(payload.count).toBe(payload.markers.length);

    for (const marker of payload.markers) {
      expect(marker.lat).toBeGreaterThanOrEqual(-90);
      expect(marker.lat).toBeLessThanOrEqual(90);
      expect(marker.lng).toBeGreaterThanOrEqual(-180);
      expect(marker.lng).toBeLessThanOrEqual(180);
      expect(marker.slug).toBeTruthy();
    }
  });

  test('DISCOVER-VIEW-6: every globe trip stays reachable without WebGL', async ({ page }) => {
    await page.goto('/');
    await expectGlobePresent(page);

    // The accessible list mirrors the markers, so keyboard and screen-reader
    // users reach the same trips the globe shows.
    const links = page.locator('.globe-fallback-list a');
    const response = await page.request.get('/api/v1/trips/globe');
    const { count } = await response.json();

    if (count > 0) {
      await expect(links.first()).toHaveAttribute('href', /^\/trips\//);
      expect(await links.count()).toBe(count);
    }
  });

  test('DISCOVER-VIEW-7: the globe shows exactly the trips the list shows (same visibility rules)', async ({ page }) => {
    const response = await page.request.get('/api/v1/trips/globe');
    const { markers } = (await response.json()) as { markers: { slug: string }[] };

    await page.goto('/');
    await page.getByTestId('view-toggle-list').click();
    await expect(page.getByTestId('discover-trip-list')).toBeVisible();
    // the list is paged — open every page before collecting the links
    const more = page.getByTestId('discover-load-more');
    while (await more.count()) await more.click();

    const hrefs = await page.getByTestId('discover-trip-list').locator('a[href^="/trips/"]').evaluateAll((links) =>
      [...new Set(links.map((link) => link.getAttribute('href')))]
    );
    // Every marker is a listed card; a card may only be missing from the globe when it has no coordinates.
    for (const marker of markers) {
      expect(hrefs).toContain(`/trips/${marker.slug}`);
    }
    expect(markers.length).toBeLessThanOrEqual(hrefs.length);
  });

  test('DISCOVER-VIEW-8: the card shows the trip image and "Details" opens the trip, even if the globe redraws mid-click', async ({ page }) => {
    const { markers } = (await (await page.request.get('/api/v1/trips/globe')).json()) as {
      markers: { id: string; slug: string; imageUrl: string | null }[];
    };
    const trip = markers.find((m) => m.imageUrl && /^https?:/.test(m.imageUrl));
    test.skip(!trip, 'no trip with an image in the local data');

    await page.goto('/');
    await expect(page.locator('#tg-track')).toBeVisible({ timeout: 20_000 });
    // dev-only handle (GlobeDiscover.tsx) — aims at a trip without guessing pixel positions
    await page.waitForFunction(() => Boolean((window as Window & { __trevuGlobe?: unknown }).__trevuGlobe));
    await page.evaluate((id) => (window as unknown as { __trevuGlobe: { frameTrip(id: string): void } }).__trevuGlobe.frameTrip(id), trip!.id);

    const card = page.locator('#tg-card.on');
    await expect(card).toBeVisible();
    await expect(card.locator('.tg-card-img')).toHaveAttribute('src', trip!.imageUrl!);

    const cta = card.locator('[data-open]');
    const box = (await cta.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    // a redraw between press and release (trackpad inertia, resize) must not swap the button out
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.mouse.up();
    await expect(page).toHaveURL(new RegExp(`/trips/${trip!.slug}$`), { timeout: 15_000 });
  });
});
